/**
 * ═══════════════════════════════════════════════════════════
 * ShiftSync — Full Data Seed
 * ═══════════════════════════════════════════════════════════
 *
 * Seeds the complete Coastal Eats dataset:
 *   • 4 locations (2 Pacific, 2 Eastern)
 *   • 4 managers (one manages 2 locations)
 *   • 10 staff members with skills & certifications
 *   • Weekly availability for all staff
 *   • Sample shifts for the current week
 *   • Sample assignments (one staff near overtime)
 *
 * Prerequisites:
 *   1. Admin already seeded (run seed-admin.ts first)
 *   2. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 *
 * Usage:
 *   npx tsx scripts/seed-data.ts
 *
 * ⚠ This script is idempotent-ish: it checks for existing
 *   locations before inserting. Run it once on a fresh DB.
 * ═══════════════════════════════════════════════════════════
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Default password for all seeded users (they'd reset on first login)
const DEFAULT_PASSWORD = "ShiftSync2026!";

// ─── Helpers ────────────────────────────────────────────────

function cuid() {
  return (
    "c" +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

/** Get the Monday of the current week at 00:00 UTC */
function getCurrentWeekMonday(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/** Create a date offset from monday. dayOffset=0 is Monday. */
function shiftTime(
  monday: Date,
  dayOffset: number,
  hour: number,
  minute = 0
): string {
  const d = new Date(monday);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function createAuthUser(
  email: string,
  name: string,
  role: string
): Promise<string> {
  // Check if already exists
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find((u) => u.email === email);
  if (existing) {
    console.log(`  ↳ Auth user ${email} already exists`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      const { data: list2 } = await supabase.auth.admin.listUsers();
      const found = list2?.users?.find((u) => u.email === email);
      if (found) return found.id;
    }
    throw new Error(`Failed to create ${email}: ${error.message}`);
  }
  return data.user.id;
}

// ─── Data Definitions ───────────────────────────────────────

// 4 locations across 2 time zones
const LOCATIONS = [
  {
    id: cuid(),
    name: "Coastal Eats — Santa Monica",
    address: "1501 Ocean Ave, Santa Monica, CA 90401",
    timezone: "America/Los_Angeles",
  },
  {
    id: cuid(),
    name: "Coastal Eats — Venice Beach",
    address: "1023 Abbot Kinney Blvd, Venice, CA 90291",
    timezone: "America/Los_Angeles",
  },
  {
    id: cuid(),
    name: "Coastal Eats — Miami Beach",
    address: "900 Ocean Dr, Miami Beach, FL 33139",
    timezone: "America/New_York",
  },
  {
    id: cuid(),
    name: "Coastal Eats — Fort Lauderdale",
    address: "3015 N Ocean Blvd, Fort Lauderdale, FL 33308",
    timezone: "America/New_York",
  },
];

// Manager definitions: who manages which locations
const MANAGERS = [
  {
    email: "maria.santos@coastaleats.com",
    name: "Maria Santos",
    locations: [0], // Santa Monica only
  },
  {
    email: "james.chen@coastaleats.com",
    name: "James Chen",
    locations: [1], // Venice Beach only
  },
  {
    email: "aisha.johnson@coastaleats.com",
    name: "Aisha Johnson",
    locations: [2, 3], // Both Florida locations — tests multi-location manager
  },
  {
    email: "carlos.rivera@coastaleats.com",
    name: "Carlos Rivera",
    locations: [3], // Fort Lauderdale — co-managed with Aisha
  },
];

// Staff: 10 members with varied skills and location certifications
// Key design choices for evaluation scenarios:
//   • Sarah (bartender) certified at Santa Monica + Miami Beach → Timezone Tangle & Simultaneous Assignment
//   • Marcus loaded with many shifts → Overtime Trap
//   • Equal bartenders across locations → Fairness testing
const STAFF = [
  {
    email: "sarah.kim@coastaleats.com",
    name: "Sarah Kim",
    skills: ["BARTENDER", "SERVER"],
    locations: [0, 2], // Santa Monica + Miami Beach (cross-timezone!)
    desiredHours: 35,
    availability: [
      // Available Mon-Sat, 9am-11pm
      { dayOfWeek: 1, startTime: "09:00", endTime: "23:00" },
      { dayOfWeek: 2, startTime: "09:00", endTime: "23:00" },
      { dayOfWeek: 3, startTime: "09:00", endTime: "23:00" },
      { dayOfWeek: 4, startTime: "09:00", endTime: "23:00" },
      { dayOfWeek: 5, startTime: "09:00", endTime: "23:00" },
      { dayOfWeek: 6, startTime: "09:00", endTime: "23:00" },
    ],
  },
  {
    email: "marcus.thompson@coastaleats.com",
    name: "Marcus Thompson",
    skills: ["LINE_COOK"],
    locations: [0, 1], // Both California locations
    desiredHours: 40,
    availability: [
      // Available every day (will be pushed toward overtime for testing)
      { dayOfWeek: 0, startTime: "06:00", endTime: "22:00" },
      { dayOfWeek: 1, startTime: "06:00", endTime: "22:00" },
      { dayOfWeek: 2, startTime: "06:00", endTime: "22:00" },
      { dayOfWeek: 3, startTime: "06:00", endTime: "22:00" },
      { dayOfWeek: 4, startTime: "06:00", endTime: "22:00" },
      { dayOfWeek: 5, startTime: "06:00", endTime: "22:00" },
      { dayOfWeek: 6, startTime: "06:00", endTime: "22:00" },
    ],
  },
  {
    email: "jessica.nguyen@coastaleats.com",
    name: "Jessica Nguyen",
    skills: ["SERVER", "HOST"],
    locations: [0], // Santa Monica
    desiredHours: 25,
    availability: [
      { dayOfWeek: 1, startTime: "10:00", endTime: "20:00" },
      { dayOfWeek: 2, startTime: "10:00", endTime: "20:00" },
      { dayOfWeek: 3, startTime: "10:00", endTime: "20:00" },
      { dayOfWeek: 5, startTime: "16:00", endTime: "23:00" },
      { dayOfWeek: 6, startTime: "16:00", endTime: "23:00" },
    ],
  },
  {
    email: "david.okafor@coastaleats.com",
    name: "David Okafor",
    skills: ["BARTENDER"],
    locations: [1, 2], // Venice Beach + Miami Beach (cross-timezone)
    desiredHours: 30,
    availability: [
      { dayOfWeek: 1, startTime: "14:00", endTime: "23:00" },
      { dayOfWeek: 2, startTime: "14:00", endTime: "23:00" },
      { dayOfWeek: 3, startTime: "14:00", endTime: "23:00" },
      { dayOfWeek: 4, startTime: "14:00", endTime: "23:00" },
      { dayOfWeek: 5, startTime: "14:00", endTime: "02:00" }, // overnight Fri
      { dayOfWeek: 6, startTime: "14:00", endTime: "02:00" }, // overnight Sat
    ],
  },
  {
    email: "emily.watson@coastaleats.com",
    name: "Emily Watson",
    skills: ["SERVER"],
    locations: [2], // Miami Beach
    desiredHours: 20,
    availability: [
      { dayOfWeek: 4, startTime: "16:00", endTime: "23:00" },
      { dayOfWeek: 5, startTime: "16:00", endTime: "23:00" },
      { dayOfWeek: 6, startTime: "16:00", endTime: "23:00" },
      { dayOfWeek: 0, startTime: "10:00", endTime: "18:00" },
    ],
  },
  {
    email: "ryan.park@coastaleats.com",
    name: "Ryan Park",
    skills: ["LINE_COOK", "HOST"],
    locations: [2, 3], // Both Florida locations
    desiredHours: 38,
    availability: [
      { dayOfWeek: 0, startTime: "08:00", endTime: "20:00" },
      { dayOfWeek: 1, startTime: "08:00", endTime: "20:00" },
      { dayOfWeek: 2, startTime: "08:00", endTime: "20:00" },
      { dayOfWeek: 3, startTime: "08:00", endTime: "20:00" },
      { dayOfWeek: 4, startTime: "08:00", endTime: "20:00" },
      { dayOfWeek: 5, startTime: "08:00", endTime: "22:00" },
    ],
  },
  {
    email: "nina.rodriguez@coastaleats.com",
    name: "Nina Rodriguez",
    skills: ["BARTENDER", "SERVER"],
    locations: [3], // Fort Lauderdale
    desiredHours: 32,
    availability: [
      { dayOfWeek: 1, startTime: "11:00", endTime: "23:00" },
      { dayOfWeek: 2, startTime: "11:00", endTime: "23:00" },
      { dayOfWeek: 3, startTime: "11:00", endTime: "23:00" },
      { dayOfWeek: 4, startTime: "11:00", endTime: "23:00" },
      { dayOfWeek: 5, startTime: "11:00", endTime: "02:00" },
      { dayOfWeek: 6, startTime: "11:00", endTime: "02:00" },
    ],
  },
  {
    email: "tyler.brooks@coastaleats.com",
    name: "Tyler Brooks",
    skills: ["HOST"],
    locations: [0, 1], // Both California locations
    desiredHours: 20,
    availability: [
      { dayOfWeek: 4, startTime: "16:00", endTime: "22:00" },
      { dayOfWeek: 5, startTime: "16:00", endTime: "23:00" },
      { dayOfWeek: 6, startTime: "16:00", endTime: "23:00" },
      { dayOfWeek: 0, startTime: "10:00", endTime: "18:00" },
    ],
  },
  {
    email: "jade.morrison@coastaleats.com",
    name: "Jade Morrison",
    skills: ["SERVER", "BARTENDER"],
    locations: [0, 2, 3], // Santa Monica + both Florida — max cross-location
    desiredHours: 35,
    availability: [
      { dayOfWeek: 0, startTime: "10:00", endTime: "22:00" },
      { dayOfWeek: 1, startTime: "10:00", endTime: "22:00" },
      { dayOfWeek: 2, startTime: "10:00", endTime: "22:00" },
      { dayOfWeek: 3, startTime: "10:00", endTime: "22:00" },
      { dayOfWeek: 4, startTime: "10:00", endTime: "22:00" },
      { dayOfWeek: 5, startTime: "10:00", endTime: "23:00" },
      { dayOfWeek: 6, startTime: "10:00", endTime: "23:00" },
    ],
  },
  {
    email: "kevin.liu@coastaleats.com",
    name: "Kevin Liu",
    skills: ["LINE_COOK"],
    locations: [3], // Fort Lauderdale
    desiredHours: 40,
    availability: [
      { dayOfWeek: 0, startTime: "07:00", endTime: "19:00" },
      { dayOfWeek: 1, startTime: "07:00", endTime: "19:00" },
      { dayOfWeek: 2, startTime: "07:00", endTime: "19:00" },
      { dayOfWeek: 3, startTime: "07:00", endTime: "19:00" },
      { dayOfWeek: 4, startTime: "07:00", endTime: "19:00" },
      { dayOfWeek: 5, startTime: "07:00", endTime: "21:00" },
    ],
  },
];

// ─── Main ───────────────────────────────────────────────────

async function main() {
  console.log("");
  console.log("┌─────────────────────────────────────────┐");
  console.log("│   ShiftSync — Full Data Seed            │");
  console.log("└─────────────────────────────────────────┘");
  console.log("");

  // ── Check if already seeded ───────────────────────────────
  const { data: existingLocations } = await supabase
    .from("Location")
    .select("id")
    .limit(1);

  if (existingLocations && existingLocations.length > 0) {
    console.log("⚠ Locations already exist. Skipping seed to avoid duplicates.");
    console.log("  To re-seed, truncate all tables first.");
    process.exit(0);
  }

  // ── 1. Seed Locations ─────────────────────────────────────
  console.log("1/6 Creating 4 locations...");
  const now = new Date().toISOString();

  const { error: locError } = await supabase.from("Location").insert(
    LOCATIONS.map((loc) => ({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      timezone: loc.timezone,
      createdAt: now,
    }))
  );
  if (locError) throw new Error(`Location insert failed: ${locError.message}`);

  for (const loc of LOCATIONS) {
    console.log(`  ✓ ${loc.name} (${loc.timezone})`);
  }

  // ── 2. Seed Managers ──────────────────────────────────────
  console.log("\n2/6 Creating 4 managers...");
  const managerIds: string[] = [];

  for (const mgr of MANAGERS) {
    const id = await createAuthUser(mgr.email, mgr.name, "MANAGER");
    managerIds.push(id);

    // Create Profile
    const { error: profileErr } = await supabase.from("Profile").upsert({
      id,
      email: mgr.email,
      name: mgr.name,
      role: "MANAGER",
      createdAt: now,
      updatedAt: now,
    });
    if (profileErr) throw new Error(`Manager profile failed: ${profileErr.message}`);

    // Assign to locations
    for (const locIdx of mgr.locations) {
      const { error: lmErr } = await supabase.from("LocationManager").upsert({
        profileId: id,
        locationId: LOCATIONS[locIdx].id,
        assignedAt: now,
      });
      if (lmErr) throw new Error(`LocationManager failed: ${lmErr.message}`);
    }

    const locNames = mgr.locations.map((i) => LOCATIONS[i].name.split("—")[1].trim());
    console.log(`  ✓ ${mgr.name} → ${locNames.join(", ")}`);
  }

  // ── 3. Seed Staff ─────────────────────────────────────────
  console.log("\n3/6 Creating 10 staff members...");
  const staffIds: string[] = [];

  for (const staff of STAFF) {
    const id = await createAuthUser(staff.email, staff.name, "STAFF");
    staffIds.push(id);

    // Create Profile
    const { error: profileErr } = await supabase.from("Profile").upsert({
      id,
      email: staff.email,
      name: staff.name,
      role: "STAFF",
      desiredHours: staff.desiredHours,
      createdAt: now,
      updatedAt: now,
    });
    if (profileErr) throw new Error(`Staff profile failed: ${profileErr.message}`);

    // Skills
    for (const skill of staff.skills) {
      const { error: skillErr } = await supabase.from("StaffSkill").upsert({
        profileId: id,
        skill,
      });
      if (skillErr) throw new Error(`StaffSkill failed: ${skillErr.message}`);
    }

    // Location certifications
    for (const locIdx of staff.locations) {
      const { error: certErr } = await supabase
        .from("StaffCertification")
        .upsert({
          id: cuid(),
          profileId: id,
          locationId: LOCATIONS[locIdx].id,
          certifiedAt: now,
        });
      if (certErr) throw new Error(`Certification failed: ${certErr.message}`);
    }

    const locNames = staff.locations.map((i) => LOCATIONS[i].name.split("—")[1].trim());
    console.log(
      `  ✓ ${staff.name.padEnd(20)} | ${staff.skills.join(", ").padEnd(24)} | ${locNames.join(", ")}`
    );
  }

  // ── 4. Seed Availability ──────────────────────────────────
  console.log("\n4/6 Setting availability for all staff...");

  for (let i = 0; i < STAFF.length; i++) {
    const staff = STAFF[i];
    const id = staffIds[i];

    for (const avail of staff.availability) {
      const { error: availErr } = await supabase.from("Availability").insert({
        id: cuid(),
        profileId: id,
        dayOfWeek: avail.dayOfWeek,
        specificDate: null,
        startTime: avail.startTime,
        endTime: avail.endTime,
        isAvailable: true,
        createdAt: now,
      });
      if (availErr) throw new Error(`Availability failed: ${availErr.message}`);
    }
    console.log(
      `  ✓ ${staff.name} — ${staff.availability.length} recurring windows`
    );
  }

  // ── 5. Seed Shifts (current week) ─────────────────────────
  console.log("\n5/6 Creating sample shifts for the current week...");
  const monday = getCurrentWeekMonday();
  const adminProfile = await getAdminId();

  // Shift definitions: [locationIdx, dayOffset, startHour, endHour, skill, headcount, isPremium]
  type ShiftDef = [number, number, number, number, string, number, boolean];

  const shiftDefs: ShiftDef[] = [
    // ── Santa Monica (loc 0) ──
    [0, 0, 7, 15, "LINE_COOK", 2, false],     // Mon 7am-3pm
    [0, 0, 11, 19, "SERVER", 3, false],        // Mon 11am-7pm
    [0, 1, 7, 15, "LINE_COOK", 2, false],      // Tue 7am-3pm
    [0, 1, 11, 19, "SERVER", 3, false],         // Tue 11am-7pm
    [0, 2, 7, 15, "LINE_COOK", 2, false],      // Wed 7am-3pm
    [0, 2, 16, 23, "BARTENDER", 2, false],     // Wed 4pm-11pm
    [0, 3, 7, 15, "LINE_COOK", 2, false],      // Thu 7am-3pm
    [0, 3, 16, 23, "BARTENDER", 2, false],     // Thu 4pm-11pm
    [0, 4, 17, 23, "BARTENDER", 3, true],      // Fri 5pm-11pm ★ PREMIUM
    [0, 4, 17, 23, "SERVER", 4, true],          // Fri 5pm-11pm ★ PREMIUM
    [0, 4, 16, 22, "HOST", 2, true],            // Fri 4pm-10pm ★ PREMIUM
    [0, 5, 17, 23, "BARTENDER", 3, true],      // Sat 5pm-11pm ★ PREMIUM
    [0, 5, 17, 23, "SERVER", 4, true],          // Sat 5pm-11pm ★ PREMIUM
    [0, 6, 10, 18, "SERVER", 3, false],         // Sun 10am-6pm (brunch)
    [0, 6, 19, 23, "SERVER", 2, false],         // Sun 7pm-11pm (the callout shift)

    // ── Venice Beach (loc 1) ──
    [1, 0, 8, 16, "LINE_COOK", 2, false],      // Mon
    [1, 1, 8, 16, "LINE_COOK", 2, false],      // Tue
    [1, 2, 8, 16, "LINE_COOK", 2, false],      // Wed
    [1, 3, 16, 23, "BARTENDER", 2, false],     // Thu
    [1, 4, 17, 23, "BARTENDER", 2, true],      // Fri ★
    [1, 5, 17, 23, "BARTENDER", 2, true],      // Sat ★
    [1, 5, 16, 22, "HOST", 1, true],            // Sat ★

    // ── Miami Beach (loc 2) ──
    [2, 0, 7, 15, "LINE_COOK", 2, false],      // Mon
    [2, 0, 11, 19, "SERVER", 3, false],         // Mon
    [2, 1, 7, 15, "LINE_COOK", 2, false],      // Tue
    [2, 2, 16, 23, "BARTENDER", 2, false],     // Wed
    [2, 3, 16, 23, "BARTENDER", 2, false],     // Thu
    [2, 4, 17, 23, "BARTENDER", 3, true],      // Fri ★
    [2, 4, 17, 23, "SERVER", 3, true],          // Fri ★
    [2, 5, 17, 23, "BARTENDER", 3, true],      // Sat ★
    [2, 5, 17, 23, "SERVER", 3, true],          // Sat ★
    [2, 6, 10, 18, "SERVER", 2, false],         // Sun brunch

    // ── Fort Lauderdale (loc 3) ──
    [3, 0, 8, 16, "LINE_COOK", 2, false],      // Mon
    [3, 1, 8, 16, "LINE_COOK", 2, false],      // Tue
    [3, 2, 8, 16, "LINE_COOK", 2, false],      // Wed
    [3, 3, 11, 19, "SERVER", 2, false],         // Thu
    [3, 4, 17, 23, "BARTENDER", 2, true],      // Fri ★
    [3, 4, 17, 23, "SERVER", 2, true],          // Fri ★
    [3, 5, 17, 23, "BARTENDER", 2, true],      // Sat ★
    [3, 5, 17, 23, "SERVER", 2, true],          // Sat ★
    [3, 6, 8, 16, "LINE_COOK", 1, false],      // Sun
  ];

  const shiftIds: string[] = [];

  for (const [locIdx, day, startH, endH, skill, headcount, isPremium] of shiftDefs) {
    const id = cuid();
    shiftIds.push(id);

    const { error: shiftErr } = await supabase.from("Shift").insert({
      id,
      locationId: LOCATIONS[locIdx].id,
      requiredSkill: skill,
      headcount,
      startTime: shiftTime(monday, day, startH),
      endTime: shiftTime(monday, day, endH),
      isPublished: true, // published so staff can see them
      publishedAt: now,
      isPremium,
      createdAt: now,
      updatedAt: now,
    });
    if (shiftErr) throw new Error(`Shift insert failed: ${shiftErr.message}`);
  }

  console.log(`  ✓ ${shiftDefs.length} shifts created across all 4 locations`);
  console.log(
    `    ${shiftDefs.filter(([, , , , , , p]) => p).length} premium (Fri/Sat evening) shifts`
  );

  // ── 6. Seed Assignments ───────────────────────────────────
  // Key scenarios:
  //   • Marcus gets lots of shifts → approaches 52hrs (Overtime Trap)
  //   • Sarah assigned to Sunday evening → can be the callout (Sunday Night Chaos)
  //   • Mix of staff on premium shifts for fairness testing
  console.log("\n6/6 Creating sample assignments...");

  // Map staff names to indices for readability
  const staffIdx = {
    sarah: 0,
    marcus: 1,
    jessica: 2,
    david: 3,
    emily: 4,
    ryan: 5,
    nina: 6,
    tyler: 7,
    jade: 8,
    kevin: 9,
  };

  // [shiftIndex, staffIndex] assignments
  // Marcus (line cook) gets 6 shifts → ~48 hours (near overtime)
  const assignments: [number, number][] = [
    // Santa Monica shifts
    [0, staffIdx.marcus],    // Mon line cook
    [2, staffIdx.marcus],    // Tue line cook
    [4, staffIdx.marcus],    // Wed line cook
    [6, staffIdx.marcus],    // Thu line cook
    [1, staffIdx.jessica],   // Mon server
    [3, staffIdx.jessica],   // Tue server
    [5, staffIdx.sarah],     // Wed bartender
    [7, staffIdx.sarah],     // Thu bartender
    [8, staffIdx.sarah],     // Fri bartender (premium)
    [9, staffIdx.jessica],   // Fri server (premium)
    [10, staffIdx.tyler],    // Fri host (premium)
    [11, staffIdx.jade],     // Sat bartender (premium) — Jade gets premium, Sarah doesn't
    [12, staffIdx.jessica],  // Sat server (premium)
    [13, staffIdx.jade],     // Sun server
    [14, staffIdx.sarah],    // Sun 7pm (the potential callout shift!)

    // Venice Beach shifts
    [15, staffIdx.marcus],   // Mon line cook — Marcus's 5th shift!
    [16, staffIdx.marcus],   // Tue line cook — Marcus's 6th shift! (~48hrs total)
    [19, staffIdx.david],    // Fri bartender (premium)
    [20, staffIdx.david],    // Sat bartender (premium)
    [21, staffIdx.tyler],    // Sat host (premium)

    // Miami Beach shifts
    [22, staffIdx.ryan],     // Mon line cook
    [23, staffIdx.emily],    // Mon server
    [25, staffIdx.david],    // Wed bartender
    [27, staffIdx.jade],     // Fri bartender (premium)
    [28, staffIdx.emily],    // Fri server (premium)
    [29, staffIdx.jade],     // Sat bartender (premium)
    [30, staffIdx.emily],    // Sat server (premium)

    // Fort Lauderdale shifts
    [32, staffIdx.kevin],    // Mon line cook
    [33, staffIdx.kevin],    // Tue line cook
    [34, staffIdx.kevin],    // Wed line cook
    [36, staffIdx.nina],     // Fri bartender (premium)
    [37, staffIdx.nina],     // Fri server (premium)
    [38, staffIdx.nina],     // Sat bartender (premium)
    [39, staffIdx.nina],     // Sat server (premium)
    [40, staffIdx.kevin],    // Sun line cook
  ];

  let assignmentCount = 0;
  for (const [shiftIndex, staffIndex] of assignments) {
    if (!shiftIds[shiftIndex] || !staffIds[staffIndex]) {
      console.warn(
        `  ⚠ Skipping assignment: shift[${shiftIndex}] or staff[${staffIndex}] missing`
      );
      continue;
    }

    const { error: assignErr } = await supabase
      .from("ShiftAssignment")
      .insert({
        id: cuid(),
        shiftId: shiftIds[shiftIndex],
        profileId: staffIds[staffIndex],
        assignedAt: now,
        assignedBy: adminProfile,
      });
    if (assignErr) {
      console.warn(`  ⚠ Assignment failed (may be duplicate): ${assignErr.message}`);
    } else {
      assignmentCount++;
    }
  }

  console.log(`  ✓ ${assignmentCount} assignments created`);

  // ── Summary ───────────────────────────────────────────────
  console.log("");
  console.log("═══════════════════════════════════════════");
  console.log("  SEED COMPLETE");
  console.log("═══════════════════════════════════════════");
  console.log("");
  console.log("  Locations:      4 (2 Pacific, 2 Eastern)");
  console.log("  Managers:       4 (Aisha manages 2 locations)");
  console.log("  Staff:          10");
  console.log(`  Shifts:         ${shiftDefs.length}`);
  console.log(`  Assignments:    ${assignmentCount}`);
  console.log("");
  console.log("  Week starts:    " + monday.toISOString().split("T")[0]);
  console.log("");
  console.log("  ┌─────────────────────────────────────────────────┐");
  console.log("  │  All users share password: ShiftSync2026!       │");
  console.log("  └─────────────────────────────────────────────────┘");
  console.log("");
  console.log("  KEY SCENARIOS READY TO TEST:");
  console.log("  • Sunday Night Chaos → Sarah on Sun 7pm shift");
  console.log("  • Overtime Trap → Marcus at ~48hrs (6 shifts)");
  console.log("  • Timezone Tangle → Sarah: Santa Monica + Miami");
  console.log("  • Simultaneous Assignment → Sarah/David: multi-loc bartenders");
  console.log("  • Fairness → Jade gets more premium shifts than Sarah");
  console.log("");
}

async function getAdminId(): Promise<string> {
  const { data } = await supabase
    .from("Profile")
    .select("id")
    .eq("role", "ADMIN")
    .limit(1)
    .single();
  if (!data) throw new Error("No admin found. Run seed-admin.ts first!");
  return data.id;
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
