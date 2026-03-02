// app/api/analytics/route.ts
import { prisma } from "@/lib/prisma";
import { getAuthProfile, ok, err } from "@/lib/apiUtils";
import { differenceInHours } from "date-fns";
import { NextRequest } from "next/server";

// GET /api/analytics?locationId=xxx&from=xxx&to=xxx
// Returns fairness + overtime data for a date range
export async function GET(req: NextRequest) {
  const profile = await getAuthProfile();
  if (!profile) return err("Unauthorized", 401);
  if (profile.role === "STAFF") return err("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) return err("from and to query params are required");

  const fromDate = new Date(from);
  const toDate = new Date(to);

  // Get all assignments in range, optionally filtered by location
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      shift: {
        startTime: { gte: fromDate, lte: toDate },
        ...(locationId ? { locationId } : {}),
      },
    },
    include: {
      profile: { select: { id: true, name: true, desiredHours: true } },
      shift: true,
    },
  });

  // ── FAIRNESS REPORT ──
  // Group hours and premium shifts per staff member
  const staffMap: Record<
    string,
    {
      id: string;
      name: string;
      desiredHours: number | null;
      totalHours: number;
      premiumShifts: number;
      totalShifts: number;
    }
  > = {};

  for (const a of assignments) {
    const id = a.profile.id;
    if (!staffMap[id]) {
      staffMap[id] = {
        id,
        name: a.profile.name,
        desiredHours: a.profile.desiredHours,
        totalHours: 0,
        premiumShifts: 0,
        totalShifts: 0,
      };
    }
    const hours = differenceInHours(a.shift.endTime, a.shift.startTime);
    staffMap[id].totalHours += hours;
    staffMap[id].totalShifts += 1;
    if (a.shift.isPremium) staffMap[id].premiumShifts += 1;
  }

  const staffList = Object.values(staffMap);
  const totalPremiumShifts = staffList.reduce((s, p) => s + p.premiumShifts, 0);
  const avgPremiumPerStaff =
    staffList.length > 0 ? totalPremiumShifts / staffList.length : 0;

  // Fairness score: how far each person is from the average premium shifts
  // Negative = under-allocated, Positive = over-allocated
  const fairnessReport = staffList.map((s) => ({
    ...s,
    premiumShiftDelta: s.premiumShifts - avgPremiumPerStaff,
    hoursVsDesired: s.desiredHours
      ? s.totalHours - s.desiredHours
      : null,
  }));

  // ── OVERTIME PROJECTION ──
  // Find staff currently at risk of overtime this week
  const weekStart = fromDate;
  const weekEnd = toDate;

  const weeklyHours = staffList
    .filter((s) => s.totalHours >= 35) // only flag those at risk
    .map((s) => ({
      staffId: s.id,
      name: s.name,
      projectedHours: s.totalHours,
      overtimeHours: Math.max(0, s.totalHours - 40),
      isOvertime: s.totalHours > 40,
      isWarning: s.totalHours >= 35 && s.totalHours <= 40,
    }));

  return ok({
    fairnessReport,
    overtimeRisk: weeklyHours,
    period: { from: fromDate, to: toDate },
    locationId,
  });
}