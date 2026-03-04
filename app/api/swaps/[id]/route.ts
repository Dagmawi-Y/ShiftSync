// app/api/swaps/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, managerOwnsLocation, ok, err, validationErr } from "@/lib/apiUtils";
import { validateAssignment } from "@/lib/services/constraintEngine";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SwapActionSchema = z.object({
  action: z.enum(["ACCEPT", "REJECT", "APPROVE", "CANCEL"]),
  managerNote: z.string().optional(),
});

// POST /api/swaps/[id] — take an action on a swap
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);

  const body = await req.json();
  const parsed = SwapActionSchema.safeParse(body);
  if (!parsed.success) return validationErr(parsed.error);

  const { action, managerNote } = parsed.data;

  const swap = await prisma.swapRequest.findUnique({
    where: { id: params.id },
    include: {
      shift: { include: { location: true } },
      initiator: true,
      receiver: true,
    },
  });
  if (!swap) return err("Swap request not found", 404);

  // Check if swap has expired
  if (swap.expiresAt < new Date() && swap.status !== "APPROVED") {
    await prisma.swapRequest.update({
      where: { id: params.id },
      data: { status: "EXPIRED", resolvedAt: new Date() },
    });
    return err("This swap request has expired");
  }

  // ── CANCEL — initiator can cancel their own pending request ──
  if (action === "CANCEL") {
    if (swap.initiatorId !== profile.id && profile.role === "STAFF")
      return err("You can only cancel your own swap requests");

    if (!["PENDING_STAFF", "PENDING_MANAGER"].includes(swap.status))
      return err("This swap request cannot be cancelled in its current state");

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.swapRequest.update({
        where: { id: params.id },
        data: { status: "CANCELLED", resolvedAt: new Date() },
      });

      // Notify the other party
      const notifyId =
        swap.receiverId && swap.receiverId !== profile.id
          ? swap.receiverId
          : null;

      if (notifyId) {
        await tx.notification.create({
          data: {
            profileId: notifyId,
            type: "SWAP_CANCELLED",
            title: "Swap request cancelled",
            body: `${profile.name} has cancelled their swap request for ${swap.shift.startTime.toLocaleDateString()}.`,
            shiftId: swap.shiftId,
            swapId: swap.id,
          },
        });
      }

      return result;
    });

    return ok(updated);
  }

  // ── ACCEPT/REJECT — only the receiver can do this ──
  if (action === "ACCEPT" || action === "REJECT") {
    if (swap.receiverId !== profile.id)
      return err("Only the requested staff member can accept or reject");

    if (swap.status !== "PENDING_STAFF")
      return err("This swap is not awaiting your response");

    if (action === "REJECT") {
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.swapRequest.update({
          where: { id: params.id },
          data: { status: "REJECTED", resolvedAt: new Date() },
        });
        await tx.notification.create({
          data: {
            profileId: swap.initiatorId,
            type: "SWAP_REJECTED",
            title: "Swap request declined",
            body: `${profile.name} has declined your swap request.`,
            shiftId: swap.shiftId,
            swapId: swap.id,
          },
        });
        return result;
      });
      return ok(updated);
    }

    // ACCEPT: run constraint engine on the receiver before escalating to manager
    // This ensures the receiver is still qualified and available
    const constraintResult = await validateAssignment(
      swap.receiverId!,
      swap.shiftId
    );

    if (!constraintResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "The swap cannot proceed due to a scheduling conflict",
          constraint: constraintResult,
        },
        { status: 422 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.swapRequest.update({
        where: { id: params.id },
        data: { status: "PENDING_MANAGER" },
      });

      // Notify managers at this location
      const managers = await tx.locationManager.findMany({
        where: { locationId: swap.shift.locationId },
      });
      for (const mgr of managers) {
        await tx.notification.create({
          data: {
            profileId: mgr.profileId,
            type: "SWAP_ACCEPTED",
            title: "Swap request needs approval",
            body: `${swap.initiator.name} and ${swap.receiver?.name} have agreed to a shift swap on ${swap.shift.startTime.toLocaleDateString()}. Your approval is needed.`,
            shiftId: swap.shiftId,
            swapId: swap.id,
          },
        });
      }

      return result;
    });

    return ok(updated);
  }

  // ── APPROVE — managers only ──
  if (action === "APPROVE") {
    if (profile.role === "STAFF") return err("Only managers can approve swaps", 403);
    if (swap.status !== "PENDING_MANAGER")
      return err("This swap is not awaiting manager approval");

    if (profile.role === "MANAGER") {
      const owns = await managerOwnsLocation(profile.id, swap.shift.locationId);
      if (!owns) return err("Forbidden", 403);
    }

    // Final constraint check before committing — state may have changed
    if (swap.receiverId) {
      const constraintResult = await validateAssignment(
        swap.receiverId,
        swap.shiftId
      );
      if (!constraintResult.valid) {
        return NextResponse.json(
          {
            success: false,
            error: "This swap can no longer be approved due to a conflict",
            constraint: constraintResult,
          },
          { status: 422 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Perform the actual assignment swap
      if (!swap.isDrop && swap.receiverId) {
        // Remove initiator from shift, add receiver
        await tx.shiftAssignment.delete({
          where: {
            shiftId_profileId: {
              shiftId: swap.shiftId,
              profileId: swap.initiatorId,
            },
          },
        });
        await tx.shiftAssignment.create({
          data: {
            shiftId: swap.shiftId,
            profileId: swap.receiverId,
            assignedBy: profile.id,
          },
        });
      }

      const result = await tx.swapRequest.update({
        where: { id: params.id },
        data: {
          status: "APPROVED",
          resolvedAt: new Date(),
          managerNote,
        },
      });

      await tx.auditLog.create({
        data: {
          shiftId: swap.shiftId,
          actorId: profile.id,
          action: swap.isDrop ? "DROP_APPROVED" : "SWAP_APPROVED",
          after: { swapId: swap.id, managerNote },
        },
      });

      // Notify both parties
      for (const notifyId of [swap.initiatorId, swap.receiverId].filter(Boolean) as string[]) {
        await tx.notification.create({
          data: {
            profileId: notifyId,
            type: "SWAP_APPROVED",
            title: "Swap approved",
            body: `Your shift swap for ${swap.shift.startTime.toLocaleDateString()} has been approved.`,
            shiftId: swap.shiftId,
            swapId: swap.id,
          },
        });
      }

      return result;
    });

    return ok(updated);
  }

  return err("Invalid action");
}