import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  // Warn if the connection string looks like Session mode (port 5432 via pooler)
  if (
    connectionString?.includes("pooler.supabase.com") &&
    !connectionString.includes(":6543")
  ) {
    console.warn(
      "[prisma] DATABASE_URL appears to use Supabase Session-mode pooler (port 5432). " +
      "Switch to Transaction mode (port 6543) to avoid MaxClientsInSessionMode errors."
    );
  }

  const pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? (process.env.NODE_ENV === "production" ? 1 : 5)),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 10_000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 10_000),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production")
  globalForPrisma.prisma = prisma;
