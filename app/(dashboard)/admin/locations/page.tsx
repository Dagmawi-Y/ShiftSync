"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { LocationDialog } from "@/components/admin/location-dialog";
import {
  LocationCardGrid,
  type LocationRecord,
} from "@/components/admin/location-card-grid";

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setLocations(json.data ?? []);
    } catch {
      toast.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/locations?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Delete failed");
      }
      toast.success(`"${name}" deleted`);
      setLoading(true);
      fetchLocations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setDeleting(null);
    }
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
            setLoading(true);
            fetchLocations();
          }}
        />
      </div>

      <LocationCardGrid
        locations={locations}
        loading={loading}
        onRefresh={() => {
          setLoading(true);
          fetchLocations();
        }}
        onDelete={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}
