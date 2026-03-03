// app/api/locations/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, ok, err, validationErr } from "@/lib/apiUtils";
import { NextRequest } from "next/server";
import { z } from "zod";

const CreateLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  timezone: z.string().min(1, "Timezone is required"),
});

const UpdateLocationSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
});

// GET /api/locations — list all locations (admin/manager)
export async function GET() {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);
  if (profile.role === "STAFF") return err("Forbidden", 403);

  const locations = await prisma.location.findMany({
    include: {
      managers: {
        include: {
          profile: { select: { id: true, name: true, email: true } },
        },
      },
      certifications: {
        where: { decertifiedAt: null },
        select: { profileId: true },
      },
      _count: {
        select: { shifts: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Reshape for the frontend
  const data = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    address: loc.address,
    timezone: loc.timezone,
    createdAt: loc.createdAt,
    managers: loc.managers.map((m) => m.profile),
    certifiedStaffCount: loc.certifications.length,
    totalShifts: loc._count.shifts,
  }));

  return ok(data);
}

// POST /api/locations — create a new location (admin only)
export async function POST(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);
  if (profile.role !== "ADMIN") return err("Forbidden: admin only", 403);

  const body = await req.json();
  const parsed = CreateLocationSchema.safeParse(body);
  if (!parsed.success) return validationErr(parsed.error);

  const location = await prisma.location.create({
    data: parsed.data,
  });

  return ok(location, 201);
}

// PUT /api/locations — update a location (admin only)
export async function PUT(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);
  if (profile.role !== "ADMIN") return err("Forbidden: admin only", 403);

  const body = await req.json();
  const parsed = UpdateLocationSchema.safeParse(body);
  if (!parsed.success) return validationErr(parsed.error);

  const { id, ...data } = parsed.data;

  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) return err("Location not found", 404);

  const updated = await prisma.location.update({
    where: { id },
    data,
  });

  return ok(updated);
}

// DELETE /api/locations?id=xxx — delete a location (admin only)
export async function DELETE(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);
  if (profile.role !== "ADMIN") return err("Forbidden: admin only", 403);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return err("Location id is required");

  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) return err("Location not found", 404);

  // Check for active shifts
  const activeShifts = await prisma.shift.count({
    where: { locationId: id, endTime: { gt: new Date() } },
  });
  if (activeShifts > 0) {
    return err(
      `Cannot delete: ${activeShifts} upcoming/active shift(s) exist at this location`,
      409
    );
  }

  await prisma.location.delete({ where: { id } });

  return ok({ deleted: true });
}
