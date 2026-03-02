// app/api/notifications/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, ok, err } from "@/lib/apiUtils";
import { NextRequest } from "next/server";

// GET /api/notifications
export async function GET(_req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);

  const notifications = await prisma.notification.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return ok(notifications);
}

// PATCH /api/notifications — mark all as read
export async function PATCH(_req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);

  await prisma.notification.updateMany({
    where: { profileId: profile.id, isRead: false },
    data: { isRead: true },
  });

  return ok({ marked: true });
}