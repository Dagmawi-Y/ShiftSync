// app/api/notification-preferences/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, ok, err, validationErr } from "@/lib/apiUtils";
import { NextRequest } from "next/server";
import { z } from "zod";

const PrefsSchema = z.object({
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
  shiftAssigned: z.boolean().optional(),
  shiftChanged: z.boolean().optional(),
  schedulePublished: z.boolean().optional(),
  swapUpdates: z.boolean().optional(),
  overtimeWarnings: z.boolean().optional(),
});

// GET /api/notification-preferences
export async function GET() {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);

  let prefs = await prisma.notificationPreference.findUnique({
    where: { profileId: profile.id },
  });

  // Auto-create default prefs if none exist
  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: { profileId: profile.id },
    });
  }

  return ok(prefs);
}

// PUT /api/notification-preferences
export async function PUT(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);

  const body = await req.json();
  const parsed = PrefsSchema.safeParse(body);
  if (!parsed.success) return validationErr(parsed.error);

  const prefs = await prisma.notificationPreference.upsert({
    where: { profileId: profile.id },
    create: { profileId: profile.id, ...parsed.data },
    update: parsed.data,
  });

  return ok(prefs);
}
