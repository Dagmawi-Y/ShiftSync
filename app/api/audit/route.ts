// app/api/audit/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, ok, err } from "@/lib/apiUtils";
import { NextRequest } from "next/server";

// GET /api/audit?locationId=xxx&from=xxx&to=xxx
// Admin only — export full audit trail
export async function GET(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);
  if (profile.role !== "ADMIN") return err("Forbidden: admin only", 403);

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(from && to
        ? { createdAt: { gte: new Date(from), lte: new Date(to) } }
        : {}),
      ...(locationId ? { shift: { locationId } } : {}),
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