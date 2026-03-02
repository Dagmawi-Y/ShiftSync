import { prisma } from "@/lib/prisma";
import { Skill } from "@prisma/client";
import {
  differenceInHours,
  differenceInMinutes,
  eachDayOfInterval,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type ConstraintRule =
  | "SKILL_MISMATCH"
  | "NOT_CERTIFIED_AT_LOCATION"
  | "DOUBLE_BOOKING"
  | "INSUFFICIENT_REST"
  | "UNAVAILABLE"
  | "DAILY_HOURS_EXCEEDED"
  | "WEEKLY_HOURS_WARNING"
  | "SIXTH_CONSECUTIVE_DAY"
  | "SEVENTH_CONSECUTIVE_DAY";

export type ConstraintSeverity = "BLOCK" | "WARN";

// A suggested alternative staff member when a check fails
export interface StaffSuggestion {
  id: string;
  name: string;
  email: string;
  hoursThisWeek: number;
}

// The structured result every API route receives
export type ConstraintResult =
  | { valid: true }
  | {
      valid: false;
      severity: ConstraintSeverity;
      rule: ConstraintRule;
      message: string;
      suggestions: StaffSuggestion[];
      // for WARN severity, manager can override — this flag tells the UI
      canOverride: boolean;
    };

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Returns total minutes of overlap between two time intervals.
 * Returns 0 if they don't overlap.
 */
function getOverlapMinutes(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): number {
  const overlapStart = aStart > bStart ? aStart : bStart;
  const overlapEnd = aEnd < bEnd ? aEnd : bEnd;
  if (overlapStart >= overlapEnd) return 0;
  return differenceInMinutes(overlapEnd, overlapStart);
}

/**
 * Converts an HH:mm availability string + a specific shift date
 * into a UTC Date, accounting for the location's timezone.
 *
 * Why: availability is stored as "09:00" in the staff member's
 * local time. A shift at that location has a specific timezone.
 * We need to compare apples to apples (both UTC).
 */
function availabilityTimeToUTC(
  timeStr: string, // "09:00"
  shiftDate: Date, // the UTC start of the shift (used for year/month/day)
  locationTimezone: string
): Date {
  // Get the shift date in the location's timezone to extract YYYY-MM-DD
  const zonedDate = toZonedTime(shiftDate, locationTimezone);
  const dateStr = format(zonedDate, "yyyy-MM-dd");
  // Combine into an ISO string and parse as UTC
  return parseISO(`${dateStr}T${timeStr}:00`);
}

// ─────────────────────────────────────────────
// SUGGESTIONS HELPER
// Fetches qualified alternatives when a check fails
// ─────────────────────────────────────────────

async function getAlternativeSuggestions(
  shiftId: string,
  excludeProfileId: string
): Promise<StaffSuggestion[]> {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { location: true },
  });
  if (!shift) return [];

  // Find staff who have the skill AND are certified at this location
  const qualified = await prisma.profile.findMany({
    where: {
      id: { not: excludeProfileId },
      role: "STAFF",
      skills: { some: { skill: shift.requiredSkill } },
      certifications: {
        some: {
          locationId: shift.locationId,
          decertifiedAt: null,
        },
      },
    },
    include: {
      assignments: {
        include: { shift: true },
        where: {
          shift: {
            // only look at assignments in the same week
            startTime: {
              gte: subDays(shift.startTime, 7),
              lte: shift.startTime,
            },
          },
        },
      },
    },
    take: 3, // return max 3 suggestions
  });

  return qualified.map((staff) => {
    const hoursThisWeek = staff.assignments.reduce((sum, a) => {
      return (
        sum +
        differenceInHours(a.shift.endTime, a.shift.startTime)
      );
    }, 0);
    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      hoursThisWeek,
    };
  });
}

// ─────────────────────────────────────────────
// INDIVIDUAL CHECKS
// Each check is its own function — easy to test,
// easy to reason about, easy to extend.
// ─────────────────────────────────────────────

async function checkSkill(
  profileId: string,
  requiredSkill: Skill
): Promise<ConstraintResult> {
  const skill = await prisma.staffSkill.findUnique({
    where: { profileId_skill: { profileId, skill: requiredSkill } },
  });
  if (!skill) {
    return {
      valid: false,
      severity: "BLOCK",
      rule: "SKILL_MISMATCH",
      message: `This staff member does not have the required skill: ${requiredSkill.replace("_", " ").toLowerCase()}.`,
      suggestions: [],
      canOverride: false,
    };
  }
  return { valid: true };
}

async function checkCertification(
  profileId: string,
  locationId: string,
  shiftId: string
): Promise<ConstraintResult> {
  const cert = await prisma.staffCertification.findUnique({
    where: { profileId_locationId: { profileId, locationId } },
  });
  if (!cert || cert.decertifiedAt !== null) {
    const suggestions = await getAlternativeSuggestions(shiftId, profileId);
    return {
      valid: false,
      severity: "BLOCK",
      rule: "NOT_CERTIFIED_AT_LOCATION",
      message: `This staff member is not certified to work at this location.`,
      suggestions,
      canOverride: false,
    };
  }
  return { valid: true };
}

async function checkDoubleBooking(
  profileId: string,
  shiftStart: Date,
  shiftEnd: Date,
  shiftId: string,
  excludeAssignmentShiftId?: string // used when editing existing assignments
): Promise<ConstraintResult> {
  // Get all other shifts this person is assigned to
  const existingAssignments = await prisma.shiftAssignment.findMany({
    where: {
      profileId,
      shiftId: { not: excludeAssignmentShiftId },
    },
    include: { shift: true },
  });

  for (const assignment of existingAssignments) {
    const overlap = getOverlapMinutes(
      shiftStart,
      shiftEnd,
      assignment.shift.startTime,
      assignment.shift.endTime
    );
    if (overlap > 0) {
      const suggestions = await getAlternativeSuggestions(shiftId, profileId);
      return {
        valid: false,
        severity: "BLOCK",
        rule: "DOUBLE_BOOKING",
        message: `This staff member is already assigned to an overlapping shift from ${format(assignment.shift.startTime, "h:mm a")} to ${format(assignment.shift.endTime, "h:mm a")} on ${format(assignment.shift.startTime, "MMM d")}.`,
        suggestions,
        canOverride: false,
      };
    }
  }
  return { valid: true };
}

async function checkRestPeriod(
  profileId: string,
  shiftStart: Date,
  shiftEnd: Date,
  shiftId: string
): Promise<ConstraintResult> {
  const MIN_REST_HOURS = 10;

  const nearbyAssignments = await prisma.shiftAssignment.findMany({
    where: {
      profileId,
      shift: {
        // look at shifts within 24hrs either side
        startTime: {
          gte: subDays(shiftStart, 1),
          lte: new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    },
    include: { shift: true },
  });

  for (const assignment of nearbyAssignments) {
    const s = assignment.shift;

    // How many hours between end of existing shift and start of new one?
    const restAfterExisting = differenceInHours(shiftStart, s.endTime);
    // How many hours between end of new shift and start of existing one?
    const restAfterNew = differenceInHours(s.startTime, shiftEnd);

    if (
      (restAfterExisting >= 0 && restAfterExisting < MIN_REST_HOURS) ||
      (restAfterNew >= 0 && restAfterNew < MIN_REST_HOURS)
    ) {
      const suggestions = await getAlternativeSuggestions(shiftId, profileId);
      const hoursAvailable = Math.max(restAfterExisting, restAfterNew);
      return {
        valid: false,
        severity: "BLOCK",
        rule: "INSUFFICIENT_REST",
        message: `This staff member needs at least 10 hours rest between shifts. Only ${Math.round(hoursAvailable)} hours available here.`,
        suggestions,
        canOverride: false,
      };
    }
  }
  return { valid: true };
}

async function checkAvailability(
  profileId: string,
  shiftStart: Date,
  shiftEnd: Date,
  locationTimezone: string,
  shiftId: string
): Promise<ConstraintResult> {
  // Get the day of week in the LOCATION's timezone (0 = Sunday)
  const zonedStart = toZonedTime(shiftStart, locationTimezone);
  const dayOfWeek = zonedStart.getDay();
  const shiftDateStr = format(zonedStart, "yyyy-MM-dd");

  const availability = await prisma.availability.findMany({
    where: { profileId },
  });

  // Check for a specific date exception first (overrides recurring)
  const exceptionForDate = availability.find(
    (a) =>
      a.specificDate !== null &&
      format(a.specificDate, "yyyy-MM-dd") === shiftDateStr
  );

  if (exceptionForDate) {
    if (!exceptionForDate.isAvailable) {
      const suggestions = await getAlternativeSuggestions(shiftId, profileId);
      return {
        valid: false,
        severity: "BLOCK",
        rule: "UNAVAILABLE",
        message: `This staff member has marked themselves unavailable on ${format(zonedStart, "MMMM d")}.`,
        suggestions,
        canOverride: false,
      };
    }
    // They have a specific availability for this date — check the window
    const availStart = availabilityTimeToUTC(
      exceptionForDate.startTime,
      shiftStart,
      locationTimezone
    );
    const availEnd = availabilityTimeToUTC(
      exceptionForDate.endTime,
      shiftStart,
      locationTimezone
    );
    if (shiftStart < availStart || shiftEnd > availEnd) {
      const suggestions = await getAlternativeSuggestions(shiftId, profileId);
      return {
        valid: false,
        severity: "BLOCK",
        rule: "UNAVAILABLE",
        message: `This staff member is only available ${exceptionForDate.startTime}–${exceptionForDate.endTime} on ${format(zonedStart, "MMMM d")}.`,
        suggestions,
        canOverride: false,
      };
    }
    return { valid: true };
  }

  // Fall back to recurring weekly availability
  const recurringForDay = availability.find(
    (a) => a.dayOfWeek === dayOfWeek && a.specificDate === null
  );

  if (!recurringForDay || !recurringForDay.isAvailable) {
    const suggestions = await getAlternativeSuggestions(shiftId, profileId);
    return {
      valid: false,
      severity: "BLOCK",
      rule: "UNAVAILABLE",
      message: `This staff member has not indicated availability on ${format(zonedStart, "EEEE")}s.`,
      suggestions,
      canOverride: false,
    };
  }

  const availStart = availabilityTimeToUTC(
    recurringForDay.startTime,
    shiftStart,
    locationTimezone
  );
  const availEnd = availabilityTimeToUTC(
    recurringForDay.endTime,
    shiftStart,
    locationTimezone
  );

  if (shiftStart < availStart || shiftEnd > availEnd) {
    const suggestions = await getAlternativeSuggestions(shiftId, profileId);
    return {
      valid: false,
      severity: "BLOCK",
      rule: "UNAVAILABLE",
      message: `This staff member is only available ${recurringForDay.startTime}–${recurringForDay.endTime} on ${format(zonedStart, "EEEE")}s. The shift falls outside this window.`,
      suggestions,
      canOverride: false,
    };
  }

  return { valid: true };
}

async function checkDailyHours(
  profileId: string,
  shiftStart: Date,
  shiftEnd: Date,
  shiftId: string
): Promise<ConstraintResult> {
  const WARN_HOURS = 8;
  const BLOCK_HOURS = 12;

  // Find all assignments on the same calendar day
  const dayStart = startOfDay(shiftStart);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const sameDayAssignments = await prisma.shiftAssignment.findMany({
    where: {
      profileId,
      shift: { startTime: { gte: dayStart, lt: dayEnd } },
    },
    include: { shift: true },
  });

  const existingHours = sameDayAssignments.reduce(
    (sum, a) =>
      sum + differenceInHours(a.shift.endTime, a.shift.startTime),
    0
  );
  const newShiftHours = differenceInHours(shiftEnd, shiftStart);
  const totalHours = existingHours + newShiftHours;

  if (totalHours > BLOCK_HOURS) {
    const suggestions = await getAlternativeSuggestions(shiftId, profileId);
    return {
      valid: false,
      severity: "BLOCK",
      rule: "DAILY_HOURS_EXCEEDED",
      message: `This assignment would bring this staff member to ${totalHours} hours in a single day, exceeding the 12-hour maximum.`,
      suggestions,
      canOverride: false,
    };
  }

  if (totalHours > WARN_HOURS) {
    return {
      valid: false,
      severity: "WARN",
      rule: "DAILY_HOURS_EXCEEDED",
      message: `This assignment would bring this staff member to ${totalHours} hours today, exceeding 8 hours. Consider redistributing.`,
      suggestions: [],
      canOverride: true,
    };
  }

  return { valid: true };
}

async function checkWeeklyHours(
  profileId: string,
  shiftStart: Date,
  shiftEnd: Date
): Promise<ConstraintResult> {
  const WARN_HOURS = 35;
  const OT_HOURS = 40;

  // Calculate the Monday of the shift's week
  const weekStart = subDays(startOfDay(shiftStart), shiftStart.getDay() === 0 ? 6 : shiftStart.getDay() - 1);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const weekAssignments = await prisma.shiftAssignment.findMany({
    where: {
      profileId,
      shift: { startTime: { gte: weekStart, lt: weekEnd } },
    },
    include: { shift: true },
  });

  const existingHours = weekAssignments.reduce(
    (sum, a) =>
      sum + differenceInHours(a.shift.endTime, a.shift.startTime),
    0
  );
  const newShiftHours = differenceInHours(shiftEnd, shiftStart);
  const totalHours = existingHours + newShiftHours;

  if (totalHours > OT_HOURS) {
    return {
      valid: false,
      severity: "WARN",
      rule: "WEEKLY_HOURS_WARNING",
      message: `This assignment would bring this staff member to ${totalHours} hours this week, resulting in ${totalHours - OT_HOURS} hours of overtime.`,
      suggestions: [],
      canOverride: true,
    };
  }

  if (totalHours >= WARN_HOURS) {
    return {
      valid: false,
      severity: "WARN",
      rule: "WEEKLY_HOURS_WARNING",
      message: `This staff member would have ${totalHours} hours this week, approaching the 40-hour overtime threshold.`,
      suggestions: [],
      canOverride: true,
    };
  }

  return { valid: true };
}

async function checkConsecutiveDays(
  profileId: string,
  shiftStart: Date
): Promise<ConstraintResult> {
  // Look at the 7 days leading up to (and including) the shift day
  const checkStart = subDays(startOfDay(shiftStart), 6);
  const checkEnd = new Date(startOfDay(shiftStart).getTime() + 24 * 60 * 60 * 1000);

  const recentAssignments = await prisma.shiftAssignment.findMany({
    where: {
      profileId,
      shift: { startTime: { gte: checkStart, lt: checkEnd } },
    },
    include: { shift: true },
  });

  // Get distinct worked days (any shift length counts — our documented decision)
  const workedDays = new Set(
    recentAssignments.map((a) =>
      format(startOfDay(a.shift.startTime), "yyyy-MM-dd")
    )
  );

  // Count consecutive days ending on the shift day
  let consecutive = 0;
  const shiftDay = startOfDay(shiftStart);

  for (let i = 0; i <= 6; i++) {
    const day = subDays(shiftDay, i);
    const dayStr = format(day, "yyyy-MM-dd");
    if (workedDays.has(dayStr) || (i === 0)) {
      // i === 0 is the shift day itself — we're checking if ADDING this shift
      // would create the violation, so always count it
      consecutive++;
    } else {
      break;
    }
  }

  if (consecutive >= 7) {
    return {
      valid: false,
      severity: "WARN", // requires manager override with documented reason
      rule: "SEVENTH_CONSECUTIVE_DAY",
      message: `This would be this staff member's 7th consecutive working day. A manager override with a documented reason is required.`,
      suggestions: [],
      canOverride: true,
    };
  }

  if (consecutive >= 6) {
    return {
      valid: false,
      severity: "WARN",
      rule: "SIXTH_CONSECUTIVE_DAY",
      message: `This would be this staff member's 6th consecutive working day.`,
      suggestions: [],
      canOverride: true,
    };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────
// MAIN ENTRY POINT
// This is the only function API routes call.
// ─────────────────────────────────────────────

export async function validateAssignment(
  profileId: string,
  shiftId: string,
  options?: {
    excludeAssignmentShiftId?: string; // for editing existing assignments
    overrideRules?: ConstraintRule[];   // manager-acknowledged warnings
    overrideReason?: string;            // required for 7th consecutive day
  }
): Promise<ConstraintResult> {
  const overrides = options?.overrideRules ?? [];

  // Load the shift with its location
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { location: true },
  });

  if (!shift) {
    return {
      valid: false,
      severity: "BLOCK",
      rule: "SKILL_MISMATCH", // reusing closest type — in practice add a NOT_FOUND rule
      message: "Shift not found.",
      suggestions: [],
      canOverride: false,
    };
  }

  // ── Run checks in priority order ──
  // Hard blocks first, warnings last.
  // Stop and return on first BLOCK.
  // Warnings are returned but can be overridden.

  const checks: Array<() => Promise<ConstraintResult>> = [
    () => checkSkill(profileId, shift.requiredSkill),
    () => checkCertification(profileId, shift.locationId, shiftId),
    () =>
      checkDoubleBooking(
        profileId,
        shift.startTime,
        shift.endTime,
        shiftId,
        options?.excludeAssignmentShiftId
      ),
    () => checkRestPeriod(profileId, shift.startTime, shift.endTime, shiftId),
    () =>
      checkAvailability(
        profileId,
        shift.startTime,
        shift.endTime,
        shift.location.timezone,
        shiftId
      ),
    () => checkDailyHours(profileId, shift.startTime, shift.endTime, shiftId),
    () => checkWeeklyHours(profileId, shift.startTime, shift.endTime),
    () => checkConsecutiveDays(profileId, shift.startTime),
  ];

  for (const check of checks) {
    const result = await check();

    if (!result.valid) {
      // If this is a BLOCK — always fail, no override possible
      if (result.severity === "BLOCK") return result;

      // If this is a WARN — check if the manager has already acknowledged it
      if (!overrides.includes(result.rule)) {
        return result; // surface the warning to the UI
      }
      // Manager acknowledged this warning — continue to next check
    }
  }

  return { valid: true };
}

// ─────────────────────────────────────────────
// WHAT-IF HELPER
// Used by the UI to preview overtime impact
// before committing an assignment.
// ─────────────────────────────────────────────

export async function previewAssignmentImpact(
  profileId: string,
  shiftId: string
): Promise<{
  currentWeeklyHours: number;
  projectedWeeklyHours: number;
  isOvertime: boolean;
  overtimeHours: number;
}> {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
  });
  if (!shift) throw new Error("Shift not found");

  const weekStart = subDays(
    startOfDay(shift.startTime),
    shift.startTime.getDay() === 0 ? 6 : shift.startTime.getDay() - 1
  );
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const weekAssignments = await prisma.shiftAssignment.findMany({
    where: {
      profileId,
      shift: { startTime: { gte: weekStart, lt: weekEnd } },
    },
    include: { shift: true },
  });

  const currentHours = weekAssignments.reduce(
    (sum, a) =>
      sum + differenceInHours(a.shift.endTime, a.shift.startTime),
    0
  );
  const newShiftHours = differenceInHours(shift.endTime, shift.startTime);
  const projectedHours = currentHours + newShiftHours;

  return {
    currentWeeklyHours: currentHours,
    projectedWeeklyHours: projectedHours,
    isOvertime: projectedHours > 40,
    overtimeHours: Math.max(0, projectedHours - 40),
  };
}