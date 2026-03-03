"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSkillLabel } from "@/components/schedule/shift-card";
import { format } from "date-fns";
import { Search, Shield, ShieldCheck, User } from "lucide-react";

// ─── Types ───────────────────────────────────────────────

export interface StaffRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  desiredHours: number | null;
  skills: { skill: string }[];
  certifications: {
    locationId: string;
    location: { name: string };
    decertifiedAt: string | null;
  }[];
}

interface PeopleTableProps {
  staff: StaffRecord[];
  loading?: boolean;
}

// ─── Role Badge ──────────────────────────────────────────

const ROLE_CONFIG: Record<
  string,
  { icon: typeof User; variant: "default" | "secondary" | "outline" }
> = {
  ADMIN: { icon: ShieldCheck, variant: "default" },
  MANAGER: { icon: Shield, variant: "secondary" },
  STAFF: { icon: User, variant: "outline" },
};

// ─── Component ───────────────────────────────────────────

export function PeopleTable({ staff, loading }: PeopleTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return staff;
    const q = search.toLowerCase();
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q)
    );
  }, [staff, search]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden sm:table-cell">Skills</TableHead>
              <TableHead className="hidden md:table-cell">Locations</TableHead>
              <TableHead className="hidden lg:table-cell">Desired Hours</TableHead>
              <TableHead className="hidden lg:table-cell">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted rounded animate-pulse w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {search ? "No matching users found." : "No users yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((person) => {
                const roleConfig = ROLE_CONFIG[person.role] ?? ROLE_CONFIG.STAFF;
                const RoleIcon = roleConfig.icon;
                const activeLocations = person.certifications.filter(
                  (c) => !c.decertifiedAt
                );
                return (
                  <TableRow key={person.id}>
                    {/* Name + email */}
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{person.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {person.email}
                        </p>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <Badge variant={roleConfig.variant} className="text-[10px]">
                        <RoleIcon className="size-2.5 mr-1" />
                        {person.role}
                      </Badge>
                    </TableCell>

                    {/* Skills */}
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {person.skills.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          person.skills.map((s) => (
                            <Badge
                              key={s.skill}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {formatSkillLabel(s.skill)}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>

                    {/* Locations */}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {activeLocations.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          activeLocations.map((c) => (
                            <Badge
                              key={c.locationId}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {c.location.name.split("—")[0]?.trim() ??
                                c.location.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>

                    {/* Desired hours */}
                    <TableCell className="hidden lg:table-cell text-sm">
                      {person.desiredHours ?? "—"}
                    </TableCell>

                    {/* Joined */}
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {format(new Date(person.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} user{filtered.length !== 1 ? "s" : ""}
        {search && ` matching "${search}"`}
      </p>
    </div>
  );
}
