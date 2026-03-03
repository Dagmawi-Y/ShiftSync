import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Look up role and redirect to the correct dashboard
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  switch (profile?.role) {
    case "ADMIN":
      redirect("/admin/dashboard");
    case "MANAGER":
      redirect("/manager/dashboard");
    case "STAFF":
      redirect("/staff/dashboard");
    default:
      redirect("/login");
  }
}
