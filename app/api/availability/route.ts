// app/api/availability/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, ok, err, validationErr } from "@/lib/apiUtils";
import { NextRequest } from "next/server";
import { z } from "zod";

const AvailabilitySchema = z.object({
  // Provide dayOfWeek for recurring, specificDate for one-off
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  specificDate: z.string().datetime().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:mm
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isAvailable: z.boolean().default(true),
}).refine(
  (d) => d.dayOfWeek !== undefined || d.specificDate !== undefined,
  { message: "Provide either dayOfWeek or specificDate" }
);

// PUT /api/availability — staff set their availability (upsert pattern)
export async function PUT(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);

  const body = await req.json();
  const parsed = AvailabilitySchema.safeParse(body);
  if (!parsed.success) return validationErr(parsed.error);

  const { dayOfWeek, specificDate, startTime, endTime, isAvailable } = parsed.data;

  // Find existing record for this day/date and upsert
  const existing = await prisma.availability.findFirst({
    where: {
      profileId: profile.id,
      ...(dayOfWeek !== undefined ? { dayOfWeek, specificDate: null } : {}),
      ...(specificDate ? { specificDate: new Date(specificDate) } : {}),
    },
  });

  const result = existing
    ? await prisma.availability.update({
        where: { id: existing.id },
        data: { startTime, endTime, isAvailable },
      })
    : await prisma.availability.create({
        data: {
          profileId: profile.id,
          dayOfWeek,
          specificDate: specificDate ? new Date(specificDate) : null,
          startTime,
          endTime,
          isAvailable,
        },
      });

  // Notify managers when availability changes
  const staffCerts = await prisma.staffCertification.findMany({
    where: { profileId: profile.id, decertifiedAt: null },
  });
  const locationIds = staffCerts.map((c) => c.locationId);
  const managers = await prisma.locationManager.findMany({
    where: { locationId: { in: locationIds } },
  });

  await prisma.notification.createMany({
    data: managers.map((mgr) => ({
      profileId: mgr.profileId,
      type: "OVERTIME_WARNING" as const, // reusing closest type — in prod add AVAILABILITY_CHANGED
      title: "Staff availability updated",
      body: `${profile.name} has updated their availability.`,
    })),
    skipDuplicates: true,
  });

  return ok(result);
}

// GET /api/availability
export async function GET(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);

  // Staff see their own. Managers can query staff they manage.
  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get("profileId") ?? profile.id;

  // Only admins/managers can query other profiles
  if (targetId !== profile.id && profile.role === "STAFF")
    return err("Forbidden", 403);

  const availability = await prisma.availability.findMany({
    where: { profileId: targetId },
    orderBy: [{ dayOfWeek: "asc" }, { specificDate: "asc" }],
  });

  return ok(availability);
}