import { getAuthProfile, ok, err, validationErr } from "@/lib/apiUtils";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["MANAGER", "STAFF"]),
  locationIds: z.array(z.string()).optional(),
  skills: z.array(z.enum(["BARTENDER", "LINE_COOK", "SERVER", "HOST"])).optional(),
  desiredHours: z.number().int().positive().optional(),
});

// POST /api/auth/invite — Admin (or Manager for STAFF) invites a new user
export async function POST(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);

  // Only ADMIN can invite anyone. MANAGER can only invite STAFF.
  if (profile.role === "STAFF") return err("Forbidden", 403);

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return validationErr(parsed.error);

  const { email, name, role, locationIds, skills, desiredHours } = parsed.data;

  // Managers can only invite STAFF
  if (profile.role === "MANAGER" && role !== "STAFF") {
    return err("Managers can only invite staff members", 403);
  }

  // Managers can only invite to locations they manage
  if (profile.role === "MANAGER" && locationIds?.length) {
    const managed = await prisma.locationManager.findMany({
      where: { profileId: profile.id },
      select: { locationId: true },
    });
    const managedIds = new Set(managed.map((m) => m.locationId));
    const unauthorized = locationIds.filter((id) => !managedIds.has(id));
    if (unauthorized.length > 0) {
      return err("You can only assign staff to locations you manage", 403);
    }
  }

  // Check if user already exists
  const existing = await prisma.profile.findUnique({ where: { email } });
  if (existing) return err("A user with this email already exists", 409);

  // Create the Supabase auth user via invite (sends magic link email)
  const supabase = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const inviteRedirectTo = `${siteUrl}/confirm?next=/invite-accept`;

  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      data: { name, role },
      redirectTo: inviteRedirectTo,
    });

  if (inviteError) {
    return err(`Failed to send invite: ${inviteError.message}`, 500);
  }

  // Create the Profile record in our DB
  const newProfile = await prisma.profile.create({
    data: {
      id: inviteData.user.id,
      email,
      name,
      role,
      desiredHours: desiredHours ?? null,
    },
  });

  // Create location certifications (for STAFF) or manager assignments
  if (locationIds?.length) {
    if (role === "STAFF") {
      await prisma.staffCertification.createMany({
        data: locationIds.map((locationId) => ({
          profileId: newProfile.id,
          locationId,
        })),
      });
    } else if (role === "MANAGER") {
      await prisma.locationManager.createMany({
        data: locationIds.map((locationId) => ({
          profileId: newProfile.id,
          locationId,
        })),
      });
    }
  }

  // Create skills for STAFF
  if (role === "STAFF" && skills?.length) {
    await prisma.staffSkill.createMany({
      data: skills.map((skill) => ({
        profileId: newProfile.id,
        skill,
      })),
    });
  }

  return ok(
    {
      id: newProfile.id,
      email: newProfile.email,
      name: newProfile.name,
      role: newProfile.role,
    },
    201,
  );
}
