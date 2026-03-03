import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { DashboardProvider } from "@/lib/dashboard-context";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile from DB
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!profile) {
    redirect("/login");
  }

  // Fetch locations based on role
  let locations: { id: string; name: string; timezone: string }[] = [];

  if (profile.role === "ADMIN") {
    locations = await prisma.location.findMany({
      select: { id: true, name: true, timezone: true },
      orderBy: { name: "asc" },
    });
  } else if (profile.role === "MANAGER") {
    const managed = await prisma.locationManager.findMany({
      where: { profileId: profile.id },
      include: {
        location: { select: { id: true, name: true, timezone: true } },
      },
    });
    locations = managed.map((m) => m.location);
  }

  return (
    <DashboardProvider
      profile={{
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
      }}
      locations={locations}
    >
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
