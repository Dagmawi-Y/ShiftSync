// app/api/assignments/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, managerOwnsLocation, ok, err, validationErr } from "@/lib/apiUtils";
import {
  validateAssignment,
  previewAssignmentImpact,
  ConstraintRule,
} from "@/lib/services/constraintEngine";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateAssignmentSchema = z.object({
  shiftId: z.string(),
  profileId: z.string(),
  overrideRules: z.array(z.string()).optional(),
  overrideReason: z.string().optional(),
  preview: z.boolean().optional(),
});

// POST /api/assignments
export async function POST(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);
  if (profile.role === "STAFF") return err("Forbidden", 403);

  const body = await req.json();
  const parsed = CreateAssignmentSchema.safeParse(body);
  if (!parsed.success) return validationErr(parsed.error);

  const { shiftId, profileId, overrideRules, overrideReason, preview } = parsed.data;

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { location: true },
  });
  if (!shift) return err("Shift not found", 404);

  if (profile.role === "MANAGER") {
    const owns = await managerOwnsLocation(profile.id, shift.locationId);
    if (!owns) return err("Forbidden: you do not manage this location", 403);
  }

  const targetStaff = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!targetStaff || targetStaff.role !== "STAFF")
    return err("Staff member not found", 404);

  // WHAT-IF PREVIEW — returns projected overtime without writing
  if (preview) {
    const impact = await previewAssignmentImpact(profileId, shiftId);
    return ok(impact);
  }

  // RUN CONSTRAINT ENGINE
  const constraintResult = await validateAssignment(profileId, shiftId, {
    overrideRules: (overrideRules ?? []) as ConstraintRule[],
    overrideReason,
  });

  if (!constraintResult.valid) {
    return NextResponse.json(
      { success: false, constraint: constraintResult },
      { status: 422 }
    );
  }

  // All checks passed — write atomically
  const assignment = await prisma.$transaction(async (tx) => {
    const newAssignment = await tx.shiftAssignment.create({
      data: { shiftId, profileId, assignedBy: profile.id },
    });

    await tx.auditLog.create({
      data: {
        shiftId,
        actorId: profile.id,
        action: "STAFF_ASSIGNED",
        after: {
          assignmentId: newAssignment.id,
          profileId,
          overrideRules: overrideRules ?? [],
          overrideReason: overrideReason ?? null,
        },
      },
    });

    await tx.notification.create({
      data: {
        profileId,
        type: "SHIFT_ASSIGNED",
        title: "New shift assigned",
        body: `You have been assigned a shift at ${shift.location.name} on ${shift.startTime.toLocaleDateString()}.`,
        shiftId,
      },
    });

    return newAssignment;
  });

  return ok(assignment, 201);
}