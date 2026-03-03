// app/api/audit/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, ok, err } from "@/lib/apiUtils";
import { NextRequest } from "next/server";

// GET /api/audit?locationId=xxx&from=xxx&to=xxx&shiftId=xxx
// Admin sees all logs. Managers see logs for shifts at their locations.
export async function GET(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);
  if (profile.role === "STAFF") return err("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const shiftId = searchParams.get("shiftId");

  // Manager scoping: limit to their locations
  let locationFilter: object | undefined;
  if (profile.role === "MANAGER") {
    const managed = await prisma.locationManager.findMany({
      where: { profileId: profile.id },
    });
    const managedIds = managed.map((m) => m.locationId);
    locationFilter = { shift: { locationId: { in: managedIds } } };
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(from && to
        ? { createdAt: { gte: new Date(from), lte: new Date(to) } }
        : {}),
      ...(shiftId ? { shiftId } : {}),
      ...(locationId ? { shift: { locationId } } : {}),
      ...locationFilter,
    },
    include: {
      actor: { select: { id: true, name: true, role: true } },
      shift: {
        include: { location: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  return ok(logs);
}