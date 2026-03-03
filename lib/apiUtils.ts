import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ─────────────────────────────────────────────
// RESPONSE HELPERS
// Consistent shape for every API response
// ─────────────────────────────────────────────

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function err(message: string, status = 400, code?: string) {
  return NextResponse.json({ success: false, error: message, code }, { status });
}

export function validationErr(error: ZodError) {
  return NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      fields: error.flatten().fieldErrors,
    },
    { status: 422 }
  );
}

// ─────────────────────────────────────────────
// AUTH HELPER
// Call this at the top of every route handler.
// Returns the full profile from our DB (not just Supabase auth user).
// ─────────────────────────────────────────────

export async function getAuthProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  return profile;
}

// ─────────────────────────────────────────────
// ROLE GUARDS
// ─────────────────────────────────────────────

export function requireRole(
  profile: { role: Role } | null,
  ...roles: Role[]
): profile is { role: Role; id: string; name: string; email: string } {
  if (!profile) return false;
  return roles.includes(profile.role);
}

// Checks if a manager is actually assigned to a given location
export async function managerOwnsLocation(
  managerId: string,
  locationId: string
): Promise<boolean> {
  const assignment = await prisma.locationManager.findUnique({
    where: {
      profileId_locationId: { profileId: managerId, locationId },
    },
  });
  return !!assignment;
}