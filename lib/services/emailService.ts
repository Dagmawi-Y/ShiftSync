// lib/services/emailService.ts
// Simulated email delivery — logs emails to the database
// In production, swap this out for a real SMTP/SendGrid/SES integration

import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma/client";

// Map notification types to preference field names
const TYPE_TO_PREF: Record<string, string> = {
  SHIFT_ASSIGNED: "shiftAssigned",
  SHIFT_CHANGED: "shiftChanged",
  SCHEDULE_PUBLISHED: "schedulePublished",
  SWAP_REQUESTED: "swapUpdates",
  SWAP_ACCEPTED: "swapUpdates",
  SWAP_REJECTED: "swapUpdates",
  SWAP_APPROVED: "swapUpdates",
  SWAP_CANCELLED: "swapUpdates",
  DROP_REQUESTED: "swapUpdates",
  DROP_CLAIMED: "swapUpdates",
  OVERTIME_WARNING: "overtimeWarnings",
};

/**
 * Send a simulated email if the user has email delivery enabled
 * and hasn't disabled this notification category.
 *
 * Call this alongside prisma.notification.create() in API routes.
 */
export async function maybeSendEmail({
  profileId,
  type,
  title,
  body,
}: {
  profileId: string;
  type: NotificationType;
  title: string;
  body: string;
}) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: { notificationPref: true },
    });

    if (!profile) return;

    const prefs = profile.notificationPref;

    // No preferences record = use defaults (in-app only, no email)
    if (!prefs || !prefs.email) return;

    // Check category-level toggle
    const prefField = TYPE_TO_PREF[type];
    if (prefField && prefs[prefField as keyof typeof prefs] === false) return;

    // "Send" the email (log to DB)
    await prisma.emailLog.create({
      data: {
        to: profile.email,
        subject: `[ShiftSync] ${title}`,
        body: `Hi ${profile.name},\n\n${body}\n\n— ShiftSync`,
      },
    });
  } catch {
    // Email simulation is best-effort; don't break the main flow
  }
}

/**
 * Check if a specific notification category is enabled for a user.
 * Returns false if the user has disabled it (even in-app).
 */
export async function isNotificationEnabled(
  profileId: string,
  type: NotificationType
): Promise<boolean> {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { profileId },
  });

  if (!prefs) return true; // defaults = all enabled

  if (!prefs.inApp) return false; // all notifications disabled

  const prefField = TYPE_TO_PREF[type];
  if (prefField && prefs[prefField as keyof typeof prefs] === false)
    return false;

  return true;
}
