// app/api/staff/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, managerOwnsLocation, ok, err } from "@/lib/apiUtils";
import { NextRequest } from "next/server";

// GET /api/staff?locationId=xxx&skill=xxx
// Managers use this to find available staff for a shift
export async function GET(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const skill = searchParams.get("skill");

  if (profile.role === "STAFF") {
    // Staff can only use this endpoint for swap colleague lookup,
    // which must be constrained to both a required skill and location.
    if (!locationId || !skill) {
      return err("Forbidden", 403);
    }
  }

  if (profile.role === "MANAGER") {
    if (!locationId) {
      return err("locationId is required for managers", 400);
    }

    const owns = await managerOwnsLocation(profile.id, locationId);
    if (!owns) return err("Forbidden", 403);
  }

  const staff = await prisma.profile.findMany({
    where: {
      role: "STAFF",
      ...(skill ? { skills: { some: { skill: skill as any } } } : {}),
      ...(locationId
        ? {
            certifications: {
              some: { locationId, decertifiedAt: null },
            },
          }
        : {}),
    },
    include: {
      skills: true,
      certifications: {
        where: { decertifiedAt: null },
        include: { location: true },
      },
    },
  });

  return ok(staff);
}

// ─────────────────────────────────────────────────────────────
// app/api/availability/route.ts
// Staff set their own recurring + one-off availability
// ─────────────────────────────────────────────────────────────