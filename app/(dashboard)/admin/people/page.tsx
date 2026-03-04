"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { PeopleTable, type StaffRecord } from "@/components/admin/people-table";
import { InviteDialog } from "@/components/admin/invite-dialog";
import { toast } from "sonner";

export default function AdminPeoplePage() {
  const { locations } = useDashboard();
  const queryClient = useQueryClient();

  const {
    data: staff = [],
    isLoading: loading,
    error,
  } = useQuery<StaffRecord[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load users");
      }
      return json.data ?? [];
    },
  });

  useEffect(() => {
    if (error instanceof Error) {
      toast.error(error.message);
    }
  }, [error]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">
            People
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage staff, managers, and admin accounts.
          </p>
        </div>
        <InviteDialog
          locations={locations}
          onInvited={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          }}
        />
      </div>

      <PeopleTable staff={staff} loading={loading} />
    </div>
  );
}
