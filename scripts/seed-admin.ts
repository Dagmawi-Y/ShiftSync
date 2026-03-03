/**
 * ═══════════════════════════════════════════════════════════
 * ShiftSync — Admin Seed Script
 * ═══════════════════════════════════════════════════════════
 *
 * This script creates the first ADMIN user in Supabase Auth
 * and the corresponding Profile row in your Prisma DB.
 *
 * It uses the Supabase SERVICE_ROLE key (not the anon key),
 * which has the power to create users directly — bypassing
 * email confirmation.
 *
 * ── Prerequisites ──────────────────────────────────────────
 *
 *  1. Your Supabase project is set up and the DB is migrated:
 *       npx prisma migrate deploy
 *
 *  2. You have these env vars set (in .env or .env.local):
 *
 *       NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 *       SUPABASE_SERVICE_ROLE_KEY=eyJ...   (from Supabase Dashboard → Settings → API → service_role)
 *       DATABASE_URL=postgresql://...       (already used by Prisma)
 *
 *     ⚠ The service_role key is a SECRET. Never commit it or
 *       expose it client-side. It bypasses Row Level Security.
 *
 * ── Usage ──────────────────────────────────────────────────
 *
 *   npx tsx scripts/seed-admin.ts
 *
 *   Optional env overrides:
 *     ADMIN_EMAIL=admin@coastaleats.com \
 *     ADMIN_PASSWORD=SuperSecure123! \
 *     ADMIN_NAME="System Admin" \
 *     npx tsx scripts/seed-admin.ts
 *
 * ── What it does ───────────────────────────────────────────
 *
 *   1. Creates a Supabase Auth user with email + password
 *      (auto-confirmed, no email sent).
 *   2. Creates a Profile row in your Prisma DB with role=ADMIN.
 *   3. Prints the credentials so you can log in immediately.
 *
 * ═══════════════════════════════════════════════════════════
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ── Config ──────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "linkdaggy@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "supadmin";
const ADMIN_NAME = process.env.ADMIN_NAME || "System Admin";

// ── Validation ──────────────────────────────────────────────

if (!SUPABASE_URL) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL in env");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY in env");
  console.error(
    "   Get it from: Supabase Dashboard → Settings → API → service_role (secret)",
  );
  process.exit(1);
}

// ── Client ──────────────────────────────────────────────────

// Service-role client — full admin powers over Auth AND direct DB access
// (bypasses RLS, can read/write any table)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log("");
  console.log("┌─────────────────────────────────────────┐");
  console.log("│   ShiftSync — Admin Seed                │");
  console.log("└─────────────────────────────────────────┘");
  console.log("");

  // 1. Check if admin already exists in our Profile table
  const { data: existing } = await supabase
    .from("Profile")
    .select("id, email, role")
    .eq("email", ADMIN_EMAIL)
    .maybeSingle();

  if (existing) {
    console.log(`⚠ Admin with email "${ADMIN_EMAIL}" already exists in DB.`);
    console.log(`  Profile ID: ${existing.id}`);
    console.log(`  Role: ${existing.role}`);
    console.log("");
    console.log("  If you need to reset, delete the profile and auth user first.");
    process.exit(0);
  }

  // 2. Create Supabase Auth user (auto-confirmed, no email sent)
  console.log(`Creating auth user: ${ADMIN_EMAIL}`);

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: ADMIN_NAME,
        role: "ADMIN",
      },
    });

  let userId: string;

  if (authError) {
    if (authError.message.includes("already been registered")) {
      console.log("  Auth user already exists. Fetching existing user...");
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existingUser = listData?.users?.find(
        (u) => u.email === ADMIN_EMAIL,
      );
      if (!existingUser) {
        console.error("❌ User exists in auth but couldn't be found. Exiting.");
        process.exit(1);
      }
      userId = existingUser.id;
    } else {
      console.error(`❌ Failed to create auth user: ${authError.message}`);
      process.exit(1);
    }
  } else {
    userId = authData.user.id;
  }

  // 3. Create Profile row via Supabase (bypasses Prisma entirely)
  console.log(`Creating profile in DB...`);

  const { data: profile, error: profileError } = await supabase
    .from("Profile")
    .insert({
      id: userId!,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: "ADMIN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (profileError) {
    console.error(`❌ Failed to create profile: ${profileError.message}`);
    process.exit(1);
  }

  console.log(`✅ Admin user seeded successfully.`);
  console.log(`   Profile ID: ${profile.id}`);

  console.log("");
  console.log("┌─────────────────────────────────────────┐");
  console.log("│   Login Credentials                     │");
  console.log("├─────────────────────────────────────────┤");
  console.log(`│   Email:    ${ADMIN_EMAIL.padEnd(27)}│`);
  console.log(`│   Password: ${ADMIN_PASSWORD.padEnd(27)}│`);
  console.log("└─────────────────────────────────────────┘");
  console.log("");
  console.log("⚠ Change the password after first login!");
  console.log("");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
