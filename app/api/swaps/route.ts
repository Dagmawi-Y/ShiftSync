// app/api/swaps/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, ok, err, validationErr } from "@/lib/apiUtils";
import { NextRequest } from "next/server";
import { z } from "zod";

const CreateSwapSchema = z.object({
  shiftId: z.string(),
  receiverId: z.string().optional(), // null = drop request
  initiatorNote: z.string().optional(),
});

// POST /api/swaps — staff initiates a swap or drop
export async function POST(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);
  if (profile.role !== "STAFF") return err("Only staff can request swaps", 403);

  const body = await req.json();
  const parsed = CreateSwapSchema.safeParse(body);
  if (!parsed.success) return validationErr(parsed.error);

  const { shiftId, receiverId, initiatorNote } = parsed.data;
  const isDrop = !receiverId;

  // Verify initiator is actually assigned to this shift
  const assignment = await prisma.shiftAssignment.findUnique({
    where: { shiftId_profileId: { shiftId, profileId: profile.id } },
    include: { shift: true },
  });
  if (!assignment) return err("You are not assigned to this shift");

  // Cannot swap/drop within 24hrs of shift start
  const hoursUntilShift =
    (assignment.shift.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilShift < 24) {
    return err("Cannot request a swap or drop within 24 hours of shift start");
  }

  // Enforce max 3 pending swap/drop requests
  const pendingCount = await prisma.swapRequest.count({
    where: {
      initiatorId: profile.id,
      status: { in: ["PENDING_STAFF", "PENDING_MANAGER"] },
    },
  });
  if (pendingCount >= 3) {
    return err(
      "You already have 3 pending swap/drop requests. Resolve existing requests before creating new ones."
    );
  }

  // For swaps: verify receiver is qualified (has the skill + certified at location)
  if (!isDrop && receiverId) {
    const receiverQualified = await prisma.staffSkill.findUnique({
      where: {
        profileId_skill: {
          profileId: receiverId,
          skill: assignment.shift.requiredSkill,
        },
      },
    });
    if (!receiverQualified) {
      return err(
        "The selected staff member does not have the required skill for this shift"
      );
    }

    const receiverCertified = await prisma.staffCertification.findUnique({
      where: {
        profileId_locationId: {
          profileId: receiverId,
          locationId: assignment.shift.locationId,
        },
      },
    });
    if (!receiverCertified || receiverCertified.decertifiedAt) {
      return err(
        "The selected staff member is not certified at this location"
      );
    }
  }

  // Drop requests expire 24hrs before shift
  const expiresAt = new Date(
    assignment.shift.startTime.getTime() - 24 * 60 * 60 * 1000
  );

  const swap = await prisma.$transaction(async (tx) => {
    const newSwap = await tx.swapRequest.create({
      data: {
        shiftId,
        initiatorId: profile.id,
        receiverId: receiverId ?? null,
        isDrop,
        status: isDrop ? "PENDING_MANAGER" : "PENDING_STAFF",
        initiatorNote,
        expiresAt,
      },
    });

    // Notify receiver for swaps
    if (!isDrop && receiverId) {
      await tx.notification.create({
        data: {
          profileId: receiverId,
          type: "SWAP_REQUESTED",
          title: "Shift swap request",
          body: `${profile.name} has requested to swap a shift with you on ${assignment.shift.startTime.toLocaleDateString()}.`,
          shiftId,
          swapId: newSwap.id,
        },
      });
    }

    // Notify managers of the location for drop requests
    if (isDrop) {
      const managers = await tx.locationManager.findMany({
        where: { locationId: assignment.shift.locationId },
      });
      for (const mgr of managers) {
        await tx.notification.create({
          data: {
            profileId: mgr.profileId,
            type: "DROP_REQUESTED",
            title: "Shift drop request",
            body: `${profile.name} has put a shift up for grabs on ${assignment.shift.startTime.toLocaleDateString()}.`,
            shiftId,
            swapId: newSwap.id,
          },
        });
      }
    }

    return newSwap;
  });

  return ok(swap, 201);
}

// GET /api/swaps — list relevant swaps for the current user
export async function GET(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const scope = searchParams.get("scope");

  let where: object = {};

  if (profile.role === "STAFF") {
    if (scope === "available-drops") {
      where = {
        isDrop: true,
        initiatorId: { not: profile.id },
      };
    } else {
      // Staff see swaps they initiated or received
      where = {
        OR: [{ initiatorId: profile.id }, { receiverId: profile.id }],
      };
    }
  } else if (profile.role === "MANAGER") {
    // Managers see swaps for shifts at their locations
    const locations = await prisma.locationManager.findMany({
      where: { profileId: profile.id },
    });
    where = {
      shift: {
        locationId: { in: locations.map((l) => l.locationId) },
      },
    };
  }
  // Admins see everything (where stays empty)

  if (status) {
    where = { ...where, status };
  }

  const swaps = await prisma.swapRequest.findMany({
    where,
    include: {
      initiator: { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
      shift: { include: { location: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(swaps);
}