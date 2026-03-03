// Global test setup — mocks that every test file may need

// Force UTC so that date-fns parseISO (which parses as local time when no
// offset is present) behaves consistently regardless of dev machine TZ.
process.env.TZ = "UTC";

import { vi } from "vitest";

// ─── Mock Prisma ────────────────────────────────────────
// Every module that imports `@/lib/prisma` gets this mock instead.
// Individual tests override specific methods via mockResolvedValue.
vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy(
    {},
    {
      get(_target, prop) {
        // Return a sub-proxy for each model (e.g. prisma.shift, prisma.profile)
        // Each model returns vi.fn() for any method called on it
        return new Proxy(
          {},
          {
            get(_t, method) {
              // Provide a stable mock function per model.method path
              const key = `${String(prop)}.${String(method)}`;
              if (!mockRegistry.has(key)) {
                mockRegistry.set(key, vi.fn());
              }
              return mockRegistry.get(key);
            },
          }
        );
      },
    }
  ),
}));

// Registry so the same vi.fn() is returned for repeated access
const mockRegistry = new Map<string, ReturnType<typeof vi.fn>>();

// Reset all mock implementations between tests
beforeEach(() => {
  mockRegistry.forEach((fn) => fn.mockReset());
});

// ─── Mock Supabase server client ────────────────────────
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  }),
}));

// ─── Mock generated Prisma client enums ─────────────────
vi.mock("@/generated/prisma/client", () => ({
  Role: { ADMIN: "ADMIN", MANAGER: "MANAGER", STAFF: "STAFF" },
  Skill: {
    BARTENDER: "BARTENDER",
    SERVER: "SERVER",
    LINE_COOK: "LINE_COOK",
    HOST: "HOST",
  },
  SwapStatus: {
    PENDING_STAFF: "PENDING_STAFF",
    PENDING_MANAGER: "PENDING_MANAGER",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
    EXPIRED: "EXPIRED",
  },
}));
