// app/api/users/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, ok, err } from "@/lib/apiUtils";

// GET /api/users — Admin: list all users (all roles)
export async function GET() {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);
  if (profile.role !== "ADMIN") return err("Forbidden: admin only", 403);

  const users = await prisma.profile.findMany({
    include: {
      skills: true,
      certifications: {
        include: { location: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return ok(users);
}
