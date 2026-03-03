// app/api/shifts/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, managerOwnsLocation, ok, err, validationErr } from "@/lib/apiUtils";
import { NextRequest } from "next/server";
import { z } from "zod";
import { isFriday, isSaturday, getHours } from "date-fns";
import { Skill, SwapStatus } from "@prisma/client";

const UpdateShiftSchema = z.object({
  requiredSkill: z.nativeEnum(Skill).optional(),
  headcount: z.number().int().min(1).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  isPublished: z.boolean().optional(),
});

// GET /api/shifts/[id]
export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);

  const shift = await prisma.shift.findUnique({
    where: { id: params.id },
    include: {
      location: true,
      assignments: {
        include: {
          profile: { select: { id: true, name: true, email: true } },
        },
      },
      swapRequests: true,
      auditLogs: {
        include: {
          actor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!shift) return err("Shift not found", 404);

  // Staff can only see published shifts
  if (profile.role === "STAFF" && !shift.isPublished)
    return err("Not found", 404);

  return ok(shift);
}

// PATCH /api/shifts/[id]
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);
  if (profile.role === "STAFF") return err("Forbidden", 403);

  const shift = await prisma.shift.findUnique({
    where: { id: params.id },
    include: { swapRequests: true },
  });
  if (!shift) return err("Shift not found", 404);

  if (profile.role === "MANAGER") {
    const owns = await managerOwnsLocation(profile.id, shift.locationId);
    if (!owns) return err("Forbidden", 403);
  }

  // Enforce edit cutoff: cannot edit a published shift within 48hrs of start
  const hoursUntilShift =
    (shift.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
  if (shift.isPublished && hoursUntilShift < 48) {
    return err(
      "Cannot edit a published shift within 48 hours of its start time"
    );
  }

  const body = await req.json();
  const parsed = UpdateShiftSchema.safeParse(body);
  if (!parsed.success) return validationErr(parsed.error);

  const { startTime, endTime, isPublished, ...rest } = parsed.data;
  const start = startTime ? new Date(startTime) : undefined;
  const end = endTime ? new Date(endTime) : undefined;

  if (start && end && end <= start)
    return err("End time must be after start time");

  // Auto-update isPremium if times changed
  const effectiveStart = start ?? shift.startTime;
  const isPremium =
    (isFriday(effectiveStart) || isSaturday(effectiveStart)) &&
    getHours(effectiveStart) >= 17;

  const updated = await prisma.$transaction(async (tx) => {
    // KEY EDGE CASE: if times changed and there are pending/approved swaps,
    // cancel them and notify all parties — our documented design decision
    const isTimingChange = !!startTime || !!endTime;
    if (isTimingChange && shift.swapRequests.length > 0) {
      const activeStatuses: SwapStatus[] = [
        SwapStatus.PENDING_STAFF,
        SwapStatus.PENDING_MANAGER,
        SwapStatus.APPROVED,
      ];
      const activeSwaps = shift.swapRequests.filter((s) =>
        activeStatuses.includes(s.status)
      );

      for (const swap of activeSwaps) {
        await tx.swapRequest.update({
          where: { id: swap.id },
          data: { status: SwapStatus.CANCELLED, resolvedAt: new Date() },
        });

        // Notify initiator
        await tx.notification.create({
          data: {
            profileId: swap.initiatorId,
            type: "SWAP_CANCELLED",
            title: "Swap request cancelled",
            body: "Your swap request was automatically cancelled because the shift was edited by a manager.",
            shiftId: shift.id,
            swapId: swap.id,
          },
        });

        // Notify receiver if there was one
        if (swap.receiverId) {
          await tx.notification.create({
            data: {
              profileId: swap.receiverId,
              type: "SWAP_CANCELLED",
              title: "Swap request cancelled",
              body: "A swap request involving you was automatically cancelled because the shift was edited by a manager.",
              shiftId: shift.id,
              swapId: swap.id,
            },
          });
        }
      }
    }

    const updatedShift = await tx.shift.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(start ? { startTime: start } : {}),
        ...(end ? { endTime: end } : {}),
        isPremium,
        ...(isPublished === true ? { isPublished: true, publishedAt: new Date() } : {}),
        ...(isPublished === false ? { isPublished: false, publishedAt: null } : {}),
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        shiftId: params.id,
        actorId: profile.id,
        action: isPublished === true ? "SHIFT_PUBLISHED" : "SHIFT_UPDATED",
        before: shift as object,
        after: updatedShift as object,
      },
    });

    // If publishing, notify all assigned staff
    if (isPublished === true) {
      const assignments = await tx.shiftAssignment.findMany({
        where: { shiftId: params.id },
      });
      for (const assignment of assignments) {
        await tx.notification.create({
          data: {
            profileId: assignment.profileId,
            type: "SCHEDULE_PUBLISHED",
            title: "Your schedule has been published",
            body: `A shift on ${updatedShift.startTime.toLocaleDateString()} has been published.`,
            shiftId: params.id,
          },
        });
      }
    }

    return updatedShift;
  });

  return ok(updated);
}

// DELETE /api/shifts/[id]
export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);
  if (profile.role === "STAFF") return err("Forbidden", 403);

  const shift = await prisma.shift.findUnique({ where: { id: params.id } });
  if (!shift) return err("Shift not found", 404);

  if (profile.role === "MANAGER") {
    const owns = await managerOwnsLocation(profile.id, shift.locationId);
    if (!owns) return err("Forbidden", 403);
  }

  await prisma.$transaction(async (tx) => {
    // Cascade delete assignments and swap requests first
    await tx.shiftAssignment.deleteMany({ where: { shiftId: params.id } });
    await tx.swapRequest.deleteMany({ where: { shiftId: params.id } });
    await tx.shift.delete({ where: { id: params.id } });

    await tx.auditLog.create({
      data: {
        actorId: profile.id,
        action: "SHIFT_DELETED",
        before: shift as object,
      },
    });
  });

  return ok({ deleted: true });
}