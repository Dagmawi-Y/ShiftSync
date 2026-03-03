import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  validateAssignment,
  previewAssignmentImpact,
} from "@/lib/services/constraintEngine";

// ─── Typed mock helpers ─────────────────────────────────
// The global mock in vitest.setup.ts replaces prisma with vi.fn() stubs.
// Here we cast for TypeScript ergonomics.
const mockPrisma = prisma as unknown as {
  [model: string]: {
    [method: string]: ReturnType<typeof vi.fn>;
  };
};

// ─── Shared fixtures ────────────────────────────────────

const SHIFT_ID = "shift-1";
const PROFILE_ID = "staff-1";
const LOCATION_ID = "loc-1";

const makeShift = (overrides: Record<string, unknown> = {}) => ({
  id: SHIFT_ID,
  locationId: LOCATION_ID,
  requiredSkill: "BARTENDER",
  headcount: 2,
  startTime: new Date("2026-03-03T17:00:00Z"), // Tue 5pm UTC
  endTime: new Date("2026-03-03T23:00:00Z"),   // Tue 11pm UTC
  isPublished: true,
  isPremium: false,
  location: { id: LOCATION_ID, timezone: "America/New_York" },
  ...overrides,
});

/**
 * Sets up the "happy path" mocks where every check passes.
 * Individual tests override a single mock to trigger specific failures.
 */
function setupPassingMocks() {
  // shift.findUnique → returns the shift
  mockPrisma.shift.findUnique.mockResolvedValue(makeShift());

  // staffSkill.findUnique → has the skill
  mockPrisma.staffSkill.findUnique.mockResolvedValue({
    profileId: PROFILE_ID,
    skill: "BARTENDER",
  });

  // staffCertification.findUnique → certified at location
  mockPrisma.staffCertification.findUnique.mockResolvedValue({
    profileId: PROFILE_ID,
    locationId: LOCATION_ID,
    decertifiedAt: null,
  });

  // shiftAssignment.findMany → no existing assignments (no overlap, no rest issues)
  mockPrisma.shiftAssignment.findMany.mockResolvedValue([]);

  // availability.findMany → available that day
  // Tue = dayOfWeek 2 in Eastern for 2026-03-03
  mockPrisma.availability.findMany.mockResolvedValue([
    {
      dayOfWeek: 2,
      specificDate: null,
      isAvailable: true,
      startTime: "09:00",
      endTime: "23:00",
    },
  ]);

  // profile.findMany → for suggestions (returns empty to keep it simple)
  mockPrisma.profile.findMany.mockResolvedValue([]);
}

// ─── Tests ──────────────────────────────────────────────

describe("validateAssignment", () => {
  beforeEach(() => {
    setupPassingMocks();
  });

  // ── Happy path ──

  it("returns valid when all checks pass", async () => {
    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(true);
  });

  // ── SKILL_MISMATCH ──

  it("blocks when staff lacks the required skill", async () => {
    mockPrisma.staffSkill.findUnique.mockResolvedValue(null);

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rule).toBe("SKILL_MISMATCH");
      expect(result.severity).toBe("BLOCK");
      expect(result.canOverride).toBe(false);
    }
  });

  // ── NOT_CERTIFIED_AT_LOCATION ──

  it("blocks when staff is not certified at the location", async () => {
    mockPrisma.staffCertification.findUnique.mockResolvedValue(null);

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rule).toBe("NOT_CERTIFIED_AT_LOCATION");
      expect(result.severity).toBe("BLOCK");
    }
  });

  it("blocks when staff is de-certified (decertifiedAt set)", async () => {
    mockPrisma.staffCertification.findUnique.mockResolvedValue({
      profileId: PROFILE_ID,
      locationId: LOCATION_ID,
      decertifiedAt: new Date("2026-01-01"),
    });

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rule).toBe("NOT_CERTIFIED_AT_LOCATION");
    }
  });

  // ── DOUBLE_BOOKING ──

  it("blocks when staff has an overlapping shift", async () => {
    mockPrisma.shiftAssignment.findMany.mockResolvedValue([
      {
        profileId: PROFILE_ID,
        shiftId: "other-shift",
        shift: {
          id: "other-shift",
          startTime: new Date("2026-03-03T20:00:00Z"), // overlaps 8pm-1am
          endTime: new Date("2026-03-04T01:00:00Z"),
        },
      },
    ]);

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rule).toBe("DOUBLE_BOOKING");
      expect(result.severity).toBe("BLOCK");
      expect(result.message).toContain("overlapping");
    }
  });

  it("passes when existing shift does not overlap", async () => {
    mockPrisma.shiftAssignment.findMany.mockResolvedValue([
      {
        profileId: PROFILE_ID,
        shiftId: "other-shift",
        shift: {
          id: "other-shift",
          startTime: new Date("2026-03-03T02:00:00Z"), // 2am-3am, no overlap, 14hr rest, 1+6=7hrs < 8 warn
          endTime: new Date("2026-03-03T03:00:00Z"),
        },
      },
    ]);

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(true);
  });

  // ── INSUFFICIENT_REST ──

  it("blocks when rest period is less than 10 hours", async () => {
    // Shift ends at 11pm UTC. Existing shift starts at 5am next day = 6hrs rest
    mockPrisma.shiftAssignment.findMany.mockResolvedValue([
      {
        profileId: PROFILE_ID,
        shiftId: "morning-shift",
        shift: {
          id: "morning-shift",
          startTime: new Date("2026-03-04T05:00:00Z"), // 5am next day
          endTime: new Date("2026-03-04T13:00:00Z"),
        },
      },
    ]);

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rule).toBe("INSUFFICIENT_REST");
      expect(result.severity).toBe("BLOCK");
    }
  });

  // ── UNAVAILABLE ──

  it("blocks when staff has no availability for that day", async () => {
    mockPrisma.availability.findMany.mockResolvedValue([]); // no availability at all

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rule).toBe("UNAVAILABLE");
      expect(result.severity).toBe("BLOCK");
    }
  });

  it("blocks when shift falls outside availability window", async () => {
    // Staff only available 9am-3pm, shift is 5pm-11pm
    mockPrisma.availability.findMany.mockResolvedValue([
      {
        dayOfWeek: 2,
        specificDate: null,
        isAvailable: true,
        startTime: "09:00",
        endTime: "15:00",
      },
    ]);

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rule).toBe("UNAVAILABLE");
      expect(result.message).toContain("09:00");
    }
  });

  it("blocks when staff marked unavailable via date exception", async () => {
    mockPrisma.availability.findMany.mockResolvedValue([
      {
        dayOfWeek: 2,
        specificDate: null,
        isAvailable: true,
        startTime: "09:00",
        endTime: "23:00",
      },
      {
        dayOfWeek: null,
        specificDate: new Date("2026-03-03"),
        isAvailable: false,
        startTime: "00:00",
        endTime: "23:59",
      },
    ]);

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rule).toBe("UNAVAILABLE");
      expect(result.message).toContain("unavailable");
    }
  });

  // ── DAILY_HOURS_EXCEEDED ──

  it("blocks when daily hours would exceed 12", async () => {
    // Staff already has a 10-hour shift today; new shift is 6 hours → 16 total
    mockPrisma.shiftAssignment.findMany.mockImplementation(async (args: any) => {
      // The double-booking check uses no time filter, rest check uses gte/lte
      // Daily hours check uses lt/gt on day boundaries
      if (args?.where?.shift?.startTime?.lt) {
        // This is the daily hours query
        return [
          {
            profileId: PROFILE_ID,
            shift: {
              startTime: new Date("2026-03-03T07:00:00Z"),
              endTime: new Date("2026-03-03T17:00:00Z"), // 10 hours
            },
          },
        ];
      }
      return []; // all other queries return empty
    });

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rule).toBe("DAILY_HOURS_EXCEEDED");
      expect(result.severity).toBe("BLOCK");
    }
  });

  // ── WEEKLY_HOURS_WARNING ──

  it("warns when weekly hours approach overtime", async () => {
    // Need to pass all BLOCK checks first, then trigger weekly hours.
    // We use mockImplementation to handle different query shapes
    let callCount = 0;
    mockPrisma.shiftAssignment.findMany.mockImplementation(async (args: any) => {
      callCount++;
      // Call 1: double-booking check (no filter → return no overlap)
      // Call 2: rest period check (gte/lte on startTime → return empty)
      // Call 3: daily hours check (lt/gt → return small amount)
      // Call 4: weekly hours check (gte/lt on week range → return heavy load)
      if (callCount <= 3) return [];
      // Weekly hours: return 36 hours of existing work
      return [
        {
          profileId: PROFILE_ID,
          shift: {
            startTime: new Date("2026-03-02T07:00:00Z"),
            endTime: new Date("2026-03-02T19:00:00Z"), // 12 hrs
          },
        },
        {
          profileId: PROFILE_ID,
          shift: {
            startTime: new Date("2026-03-01T07:00:00Z"),
            endTime: new Date("2026-03-01T19:00:00Z"), // 12 hrs
          },
        },
        {
          profileId: PROFILE_ID,
          shift: {
            startTime: new Date("2026-02-28T07:00:00Z"),
            endTime: new Date("2026-02-28T19:00:00Z"), // 12 hrs
          },
        },
      ];
    });

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rule).toBe("WEEKLY_HOURS_WARNING");
      expect(result.severity).toBe("WARN");
      expect(result.canOverride).toBe(true);
    }
  });

  // ── CONSECUTIVE_DAYS ──

  it("warns on 6th consecutive day", async () => {
    let callCount = 0;
    mockPrisma.shiftAssignment.findMany.mockImplementation(async () => {
      callCount++;
      // First 4 calls: pass block checks
      if (callCount <= 4) return [];
      // 5th call: consecutive days check — 5 previous days worked
      return [
        { shift: { startTime: new Date("2026-03-02T17:00:00Z") } },
        { shift: { startTime: new Date("2026-03-01T17:00:00Z") } },
        { shift: { startTime: new Date("2026-02-28T17:00:00Z") } },
        { shift: { startTime: new Date("2026-02-27T17:00:00Z") } },
        { shift: { startTime: new Date("2026-02-26T17:00:00Z") } },
      ];
    });

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rule).toBe("SIXTH_CONSECUTIVE_DAY");
      expect(result.severity).toBe("WARN");
      expect(result.canOverride).toBe(true);
    }
  });

  it("warns on 7th consecutive day", async () => {
    let callCount = 0;
    mockPrisma.shiftAssignment.findMany.mockImplementation(async () => {
      callCount++;
      if (callCount <= 4) return [];
      return [
        { shift: { startTime: new Date("2026-03-02T17:00:00Z") } },
        { shift: { startTime: new Date("2026-03-01T17:00:00Z") } },
        { shift: { startTime: new Date("2026-02-28T17:00:00Z") } },
        { shift: { startTime: new Date("2026-02-27T17:00:00Z") } },
        { shift: { startTime: new Date("2026-02-26T17:00:00Z") } },
        { shift: { startTime: new Date("2026-02-25T17:00:00Z") } },
      ];
    });

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rule).toBe("SEVENTH_CONSECUTIVE_DAY");
      expect(result.severity).toBe("WARN");
      expect(result.canOverride).toBe(true);
    }
  });

  // ── Override mechanism ──

  it("allows override of WARN-level rules", async () => {
    let callCount = 0;
    mockPrisma.shiftAssignment.findMany.mockImplementation(async () => {
      callCount++;
      if (callCount <= 4) return [];
      // weekly hours: 36 existing → +6 = 42 → triggers WEEKLY_HOURS_WARNING
      return [
        {
          profileId: PROFILE_ID,
          shift: {
            startTime: new Date("2026-03-02T07:00:00Z"),
            endTime: new Date("2026-03-02T19:00:00Z"),
          },
        },
        {
          profileId: PROFILE_ID,
          shift: {
            startTime: new Date("2026-03-01T07:00:00Z"),
            endTime: new Date("2026-03-01T19:00:00Z"),
          },
        },
        {
          profileId: PROFILE_ID,
          shift: {
            startTime: new Date("2026-02-28T07:00:00Z"),
            endTime: new Date("2026-02-28T19:00:00Z"),
          },
        },
      ];
    });

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID, {
      overrideRules: ["WEEKLY_HOURS_WARNING"],
    });
    // Should pass because the warning was overridden
    expect(result.valid).toBe(true);
  });

  it("cannot override BLOCK-level rules", async () => {
    mockPrisma.staffSkill.findUnique.mockResolvedValue(null);

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID, {
      overrideRules: ["SKILL_MISMATCH"],
    });
    expect(result.valid).toBe(false);
  });

  // ── Shift not found ──

  it("returns BLOCK when shift does not exist", async () => {
    mockPrisma.shift.findUnique.mockResolvedValue(null);

    const result = await validateAssignment(PROFILE_ID, "nonexistent");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.severity).toBe("BLOCK");
    }
  });

  // ── Suggestions ──

  it("includes suggestions on BLOCK when alternatives exist", async () => {
    // Trigger certification failure
    mockPrisma.staffCertification.findUnique.mockResolvedValue(null);

    // Return qualified alternative via profile.findMany
    mockPrisma.profile.findMany.mockResolvedValue([
      {
        id: "alt-staff-1",
        name: "Jane Doe",
        email: "jane@test.com",
        assignments: [],
      },
    ]);

    // The suggestion vetting calls isAssignableToShift, which needs these mocks.
    // Since we reset per-test, we need this alt staff to also pass the vet checks.
    // We use mockImplementation to handle the alt staff's vet calls.
    const originalFindUnique = mockPrisma.staffSkill.findUnique.getMockImplementation();
    mockPrisma.staffSkill.findUnique.mockImplementation(async (args: any) => {
      // Alt staff has the skill
      if (args?.where?.profileId_skill?.profileId === "alt-staff-1") {
        return { profileId: "alt-staff-1", skill: "BARTENDER" };
      }
      // Original staff also has skill (but fails on cert)
      return { profileId: PROFILE_ID, skill: "BARTENDER" };
    });

    mockPrisma.staffCertification.findUnique.mockImplementation(async (args: any) => {
      // Alt staff is certified
      if (args?.where?.profileId_locationId?.profileId === "alt-staff-1") {
        return { profileId: "alt-staff-1", locationId: LOCATION_ID, decertifiedAt: null };
      }
      // Original staff is NOT certified
      return null;
    });

    mockPrisma.shiftAssignment.findFirst.mockResolvedValue(null);
    mockPrisma.shiftAssignment.findMany.mockResolvedValue([]);
    mockPrisma.availability.findMany.mockImplementation(async (args: any) => {
      return [
        {
          dayOfWeek: 2,
          specificDate: null,
          isAvailable: true,
          startTime: "09:00",
          endTime: "23:00",
        },
      ];
    });

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rule).toBe("NOT_CERTIFIED_AT_LOCATION");
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0].name).toBe("Jane Doe");
    }
  });

  it("returns empty suggestions when no alternatives pass all checks", async () => {
    mockPrisma.staffCertification.findUnique.mockResolvedValue(null);

    // Return a candidate who also fails checks
    mockPrisma.profile.findMany.mockResolvedValue([
      {
        id: "bad-alt",
        name: "Bad Alt",
        email: "bad@test.com",
        assignments: [],
      },
    ]);

    // The alt staff also fails skill check
    mockPrisma.staffSkill.findUnique.mockImplementation(async (args: any) => {
      if (args?.where?.profileId_skill?.profileId === "bad-alt") return null;
      return { profileId: PROFILE_ID, skill: "BARTENDER" };
    });

    const result = await validateAssignment(PROFILE_ID, SHIFT_ID);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.suggestions).toEqual([]);
    }
  });
});

describe("previewAssignmentImpact", () => {
  beforeEach(() => {
    setupPassingMocks();
  });

  it("calculates current and projected weekly hours", async () => {
    mockPrisma.shift.findUnique.mockResolvedValue(makeShift());
    mockPrisma.shiftAssignment.findMany.mockResolvedValue([
      {
        profileId: PROFILE_ID,
        shift: {
          startTime: new Date("2026-03-02T07:00:00Z"),
          endTime: new Date("2026-03-02T15:00:00Z"), // 8 hrs
        },
      },
    ]);

    const impact = await previewAssignmentImpact(PROFILE_ID, SHIFT_ID);
    expect(impact.currentWeeklyHours).toBe(8);
    expect(impact.projectedWeeklyHours).toBe(14); // 8 + 6 (shift is 6hrs)
    expect(impact.isOvertime).toBe(false);
    expect(impact.overtimeHours).toBe(0);
  });

  it("detects overtime when projected hours exceed 40", async () => {
    mockPrisma.shift.findUnique.mockResolvedValue(makeShift());
    mockPrisma.shiftAssignment.findMany.mockResolvedValue([
      {
        profileId: PROFILE_ID,
        shift: {
          startTime: new Date("2026-03-02T07:00:00Z"),
          endTime: new Date("2026-03-02T23:00:00Z"), // 16 hrs
        },
      },
      {
        profileId: PROFILE_ID,
        shift: {
          startTime: new Date("2026-03-01T07:00:00Z"),
          endTime: new Date("2026-03-01T23:00:00Z"), // 16 hrs
        },
      },
      {
        profileId: PROFILE_ID,
        shift: {
          startTime: new Date("2026-02-28T07:00:00Z"),
          endTime: new Date("2026-02-28T17:00:00Z"), // 10 hrs
        },
      },
    ]);

    const impact = await previewAssignmentImpact(PROFILE_ID, SHIFT_ID);
    expect(impact.currentWeeklyHours).toBe(42);
    expect(impact.projectedWeeklyHours).toBe(48);
    expect(impact.isOvertime).toBe(true);
    expect(impact.overtimeHours).toBe(8);
  });

  it("returns zero hours when no existing assignments", async () => {
    mockPrisma.shift.findUnique.mockResolvedValue(makeShift());
    mockPrisma.shiftAssignment.findMany.mockResolvedValue([]);

    const impact = await previewAssignmentImpact(PROFILE_ID, SHIFT_ID);
    expect(impact.currentWeeklyHours).toBe(0);
    expect(impact.projectedWeeklyHours).toBe(6);
    expect(impact.isOvertime).toBe(false);
  });
});
