"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LocationDialog } from "@/components/admin/location-dialog";
import {
  LocationCardGrid,
  type LocationRecord,
} from "@/components/admin/location-card-grid";

export default function AdminLocationsPage() {
  const [deleting, setDeleting] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: locations = [],
    isLoading: loading,
    error,
  } = useQuery<LocationRecord[]>({
    queryKey: ["admin-locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load locations");
      }
      return json.data ?? [];
    },
  });

  useEffect(() => {
    if (error instanceof Error) {
      toast.error(error.message);
    }
  }, [error]);

  const deleteMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/locations?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Delete failed");
      }
      return { name };
    },
    onSuccess: ({ name }) => {
      toast.success(`"${name}" deleted`);
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
    },
    onError: (mutationError) => {
      const msg =
        mutationError instanceof Error ? mutationError.message : "Something went wrong";
      toast.error(msg);
    },
    onSettled: () => {
      setDeleting(null);
    },
  });

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    setDeleting(id);
    await deleteMutation.mutateAsync({ id, name });
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">
            Locations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage restaurant locations across all regions.
          </p>
        </div>
        <LocationDialog
          mode="create"
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
          }}
        />
      </div>

      <LocationCardGrid
        locations={locations}
        loading={loading}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
        }}
        onDelete={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}
