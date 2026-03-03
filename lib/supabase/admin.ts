import { createClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client using the SERVICE_ROLE key.
 * This bypasses RLS and can perform admin operations like inviting users.
 *
 * ⚠ ONLY use server-side. Never import this in client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
