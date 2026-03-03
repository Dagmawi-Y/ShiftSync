import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { ok, err, validationErr, requireRole, managerOwnsLocation, getAuthProfile } from "@/lib/apiUtils";
import { createClient } from "@/lib/supabase/server";
import { Role } from "@/generated/prisma/client";
import { ZodError } from "zod";

const mockPrisma = prisma as unknown as {
  [model: string]: {
    [method: string]: ReturnType<typeof vi.fn>;
  };
};

// ─── Response helpers ───────────────────────

describe("ok", () => {
  it("returns 200 with success:true and data", async () => {
    const res = ok({ id: 1, name: "Test" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true, data: { id: 1, name: "Test" } });
  });

  it("accepts a custom status", async () => {
    const res = ok("created", 201);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ success: true, data: "created" });
  });
});

describe("err", () => {
  it("returns 400 with success:false and error message", async () => {
    const res = err("Something went wrong");
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("Something went wrong");
  });

  it("accepts a custom status and code", async () => {
    const res = err("Not found", 404, "NOT_FOUND");
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("NOT_FOUND");
  });
});

describe("validationErr", () => {
  it("returns 422 with flattened field errors", async () => {
    // Create a real ZodError
    const zodError = new ZodError([
      {
        code: "too_small",
        minimum: 1,
        type: "string",
        inclusive: true,
        exact: false,
        message: "Name is required",
        path: ["name"],
      },
    ]);

    const res = validationErr(zodError);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("Validation failed");
    expect(json.fields.name).toBeDefined();
  });
});

// ─── requireRole ────────────────────────────

describe("requireRole", () => {
  it("returns false for null profile", () => {
    expect(requireRole(null, Role.ADMIN)).toBe(false);
  });

  it("returns true when profile role matches", () => {
    const profile = { role: Role.ADMIN, id: "1", name: "Admin", email: "a@b.com" };
    expect(requireRole(profile, Role.ADMIN)).toBe(true);
  });

  it("returns true when profile matches any of the given roles", () => {
    const profile = { role: Role.MANAGER, id: "1", name: "Mgr", email: "m@b.com" };
    expect(requireRole(profile, Role.ADMIN, Role.MANAGER)).toBe(true);
  });

  it("returns false when role does not match", () => {
    const profile = { role: Role.STAFF, id: "1", name: "Staff", email: "s@b.com" };
    expect(requireRole(profile, Role.ADMIN, Role.MANAGER)).toBe(false);
  });
});

// ─── managerOwnsLocation ────────────────────

describe("managerOwnsLocation", () => {
  beforeEach(() => {
    // mocks are auto-reset via vitest.setup.ts beforeEach
  });

  it("returns true when assignment record exists", async () => {
    mockPrisma.locationManager.findUnique.mockResolvedValue({
      profileId: "mgr-1",
      locationId: "loc-1",
    });
    const result = await managerOwnsLocation("mgr-1", "loc-1");
    expect(result).toBe(true);
  });

  it("returns false when assignment record is null", async () => {
    mockPrisma.locationManager.findUnique.mockResolvedValue(null);
    const result = await managerOwnsLocation("mgr-1", "loc-999");
    expect(result).toBe(false);
  });
});

// ─── getAuthProfile ─────────────────────────

describe("getAuthProfile", () => {
  it("returns profile when user is authenticated", async () => {
    const mockSupabase = await createClient();
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as any);

    mockPrisma.profile.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Test User",
      email: "test@test.com",
      role: Role.STAFF,
    });

    const profile = await getAuthProfile();
    expect(profile).toBeDefined();
    expect(profile?.id).toBe("user-1");
  });

  it("returns null when not authenticated", async () => {
    const mockSupabase = await createClient();
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    } as any);

    const profile = await getAuthProfile();
    expect(profile).toBeNull();
  });
});
