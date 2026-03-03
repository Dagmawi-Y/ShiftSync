// app/api/shifts/active/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, ok, err } from "@/lib/apiUtils";
import { NextRequest } from "next/server";

// GET /api/shifts/active?locationId=xxx
// Returns shifts currently in progress (happening RIGHT NOW)
export async function GET(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");

  const now = new Date();

  const shifts = await prisma.shift.findMany({
    where: {
      startTime: { lte: now },
      endTime: { gt: now },
      isPublished: true,
      ...(locationId ? { locationId } : {}),
    },
    include: {
      location: { select: { id: true, name: true, timezone: true } },
      assignments: {
        include: {
          profile: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return ok({
    asOf: now.toISOString(),
    shifts,
  });
}
