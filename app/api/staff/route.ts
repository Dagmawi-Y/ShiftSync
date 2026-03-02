// app/api/staff/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, ok, err } from "@/lib/apiUtils";
import { NextRequest } from "next/server";

// GET /api/staff?locationId=xxx&skill=xxx
// Managers use this to find available staff for a shift
export async function GET(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);
  if (profile.role === "STAFF") return err("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const skill = searchParams.get("skill");

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