// app/api/shifts/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, managerOwnsLocation, ok, err, validationErr } from "@/lib/apiUtils";
import { Skill } from "@prisma/client";
import { isFriday, isSaturday, getHours } from "date-fns";
import { NextRequest } from "next/server";
import { z } from "zod";

const CreateShiftSchema = z.object({
  locationId: z.string(),
  requiredSkill: z.nativeEnum(Skill),
  headcount: z.number().int().min(1),
  startTime: z.string().datetime(), // ISO string, client sends UTC
  endTime: z.string().datetime(),
});

// GET /api/shifts?locationId=xxx&weekStart=xxx
export async function GET(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const weekStart = searchParams.get("weekStart");

  // Managers can only query their own locations
  if (profile.role === "MANAGER" && locationId) {
    const owns = await managerOwnsLocation(profile.id, locationId);
    if (!owns) return err("Forbidden", 403);
  }

  const shifts = await prisma.shift.findMany({
    where: {
      ...(locationId ? { locationId } : {}),
      ...(weekStart
        ? {
            startTime: {
              gte: new Date(weekStart),
              lt: new Date(
                new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000
              ),
            },
          }
        : {}),
      // Staff only see published shifts
      ...(profile.role === "STAFF" ? { isPublished: true } : {}),
    },
    include: {
      location: true,
      assignments: {
        include: {
          profile: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return ok(shifts);
}

// POST /api/shifts — managers and admins only
export async function POST(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);
  if (profile.role === "STAFF") return err("Forbidden", 403);

  const body = await req.json();
  const parsed = CreateShiftSchema.safeParse(body);
  if (!parsed.success) return validationErr(parsed.error);

  const { locationId, requiredSkill, headcount, startTime, endTime } =
    parsed.data;

  // Managers can only create shifts at their locations
  if (profile.role === "MANAGER") {
    const owns = await managerOwnsLocation(profile.id, locationId);
    if (!owns) return err("Forbidden: you do not manage this location", 403);
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) return err("End time must be after start time");

  // Auto-tag premium shifts: Friday or Saturday evening (after 5pm)
  const isPremium =
    (isFriday(start) || isSaturday(start)) && getHours(start) >= 17;

  const shift = await prisma.$transaction(async (tx) => {
    const newShift = await tx.shift.create({
      data: {
        locationId,
        requiredSkill,
        headcount,
        startTime: start,
        endTime: end,
        isPremium,
      },
    });

    await tx.auditLog.create({
      data: {
        shiftId: newShift.id,
        actorId: profile.id,
        action: "SHIFT_CREATED",
        after: newShift as object,
      },
    });

    return newShift;
  });

  return ok(shift, 201);
}