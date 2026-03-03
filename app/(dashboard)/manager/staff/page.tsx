"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { toast } from "sonner";
import { Search, Users, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getSkillColor,
  formatSkillLabel,
} from "@/components/schedule/shift-card";
import { cn } from "@/lib/utils";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  desiredHours: number | null;
  skills: { skill: string }[];
  certifications: {
    locationId: string;
    location: { id: string; name: string };
    decertifiedAt: string | null;
  }[];
}

const ALL_SKILLS = [
  "BARTENDER",
  "LINE_COOK",
  "SERVER",
  "HOST",
  "DISHWASHER",
  "BARISTA",
  "CASHIER",
] as const;

export default function ManagerStaffPage() {
  const { selectedLocationId, locations } = useDashboard();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState<string>("all");

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLocationId) params.set("locationId", selectedLocationId);
      if (skillFilter && skillFilter !== "all")
        params.set("skill", skillFilter);

      const res = await fetch(`/api/staff?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setStaff(json.data ?? []);
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId, skillFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filtered = useMemo(() => {
    if (!search.trim()) return staff;
    const q = search.toLowerCase();
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.skills.some((sk) => sk.skill.toLowerCase().includes(q))
    );
  }, [staff, search]);

  const locationName = locations.find(
    (l) => l.id === selectedLocationId
  )?.name;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">
            Staff
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {locationName
              ? `Team members certified at ${locationName}.`
              : "All team members across your locations."}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or skill…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={skillFilter} onValueChange={setSkillFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Skills" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skills</SelectItem>
            {ALL_SKILLS.map((skill) => (
              <SelectItem key={skill} value={skill}>
                {formatSkillLabel(skill)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <SectionErrorBoundary section="Staff roster" compact>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" />
              Team Roster
            </CardTitle>
            <CardDescription>
              {filtered.length} staff member{filtered.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 bg-muted/40 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                preset="staff"
                message={
                  search
                    ? "No staff match your search."
                    : "No staff found for this location."
                }
                compact
              />
            ) : (
              <div className="overflow-x-auto -mx-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Locations</TableHead>
                      <TableHead className="text-right">
                        Desired Hours
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {member.email}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {member.skills.map((sk) => {
                              const colors = getSkillColor(sk.skill);
                              return (
                                <Badge
                                  key={sk.skill}
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] px-1.5 py-0 h-4",
                                    colors.bg,
                                    colors.text,
                                    colors.border
                                  )}
                                >
                                  {formatSkillLabel(sk.skill)}
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {member.certifications
                              .filter((c) => !c.decertifiedAt)
                              .map((c) => (
                                <Badge
                                  key={c.locationId}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 h-4"
                                >
                                  {c.location.name}
                                </Badge>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-display tabular-nums">
                          {member.desiredHours ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </SectionErrorBoundary>
    </div>
  );
}
