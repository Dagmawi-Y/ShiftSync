import { getAuthProfile, ok, err } from "@/lib/apiUtils";

// GET /api/auth/me — returns the current user's profile (role, name, email)
export async function GET() {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);

  return ok({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
  });
}
