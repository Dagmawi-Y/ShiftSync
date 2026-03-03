"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { PeopleTable, type StaffRecord } from "@/components/admin/people-table";
import { InviteDialog } from "@/components/admin/invite-dialog";
import { toast } from "sonner";

export default function AdminPeoplePage() {
  const { locations } = useDashboard();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setStaff(json.data ?? []);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
            setLoading(true);
            fetchUsers();
          }}
        />
      </div>

      <PeopleTable staff={staff} loading={loading} />
    </div>
  );
}
