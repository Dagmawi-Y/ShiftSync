"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FamilyDrawerRoot,
  FamilyDrawerTrigger,
  FamilyDrawerOverlay,
  FamilyDrawerContent,
  FamilyDrawerAnimatedWrapper,
  FamilyDrawerAnimatedContent,
  useFamilyDrawer,
} from "@/components/ui/family-drawer";
import {
  ShieldCheck,
  Building2,
  UserRound,
  Users,
  ChevronRight,
  ArrowLeft,
  MapPin,
  Briefcase,
} from "lucide-react";
import { useState, useCallback } from "react";

type Role = "ADMIN" | "MANAGER" | "STAFF";

interface DemoAccount {
  name: string;
  email: string;
  skills?: string[];
  locations: string[];
}

interface DemoGroup {
  role: Role;
  label: string;
  description: string;
  icon: typeof ShieldCheck;
  color: string;
  bg: string;
  accounts: DemoAccount[];
}

const DEMO_GROUPS: DemoGroup[] = [
  {
    role: "ADMIN",
    label: "Admin",
    description: "Full access across all 4 locations",
    icon: ShieldCheck,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    accounts: [
      { name: "System Admin", email: "linkdaggy@gmail.com", locations: ["All locations"] },
    ],
  },
  {
    role: "MANAGER",
    label: "Managers",
    description: "Manage schedules, approve swaps",
    icon: Building2,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    accounts: [
      { name: "Maria Santos", email: "maria.santos@coastaleats.com", locations: ["Santa Monica"] },
      { name: "James Chen", email: "james.chen@coastaleats.com", locations: ["Venice Beach"] },
      { name: "Aisha Johnson", email: "aisha.johnson@coastaleats.com", locations: ["Miami Beach", "Fort Lauderdale"] },
      { name: "Carlos Rivera", email: "carlos.rivera@coastaleats.com", locations: ["Fort Lauderdale"] },
    ],
  },
  {
    role: "STAFF",
    label: "Staff",
    description: "View shifts, manage availability, request swaps",
    icon: UserRound,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    accounts: [
      { name: "Sarah Kim", email: "sarah.kim@coastaleats.com", skills: ["Bartender", "Server"], locations: ["Santa Monica", "Miami Beach"] },
      { name: "Marcus Thompson", email: "marcus.thompson@coastaleats.com", skills: ["Line Cook"], locations: ["Santa Monica", "Venice Beach"] },
      { name: "Jessica Nguyen", email: "jessica.nguyen@coastaleats.com", skills: ["Server", "Host"], locations: ["Santa Monica"] },
      { name: "David Okafor", email: "david.okafor@coastaleats.com", skills: ["Bartender"], locations: ["Venice Beach", "Miami Beach"] },
      { name: "Emily Watson", email: "emily.watson@coastaleats.com", skills: ["Server"], locations: ["Miami Beach"] },
      { name: "Ryan Park", email: "ryan.park@coastaleats.com", skills: ["Line Cook", "Host"], locations: ["Miami Beach", "Fort Lauderdale"] },
      { name: "Nina Rodriguez", email: "nina.rodriguez@coastaleats.com", skills: ["Bartender", "Server"], locations: ["Fort Lauderdale"] },
      { name: "Tyler Brooks", email: "tyler.brooks@coastaleats.com", skills: ["Host"], locations: ["Santa Monica", "Venice Beach"] },
      { name: "Jade Morrison", email: "jade.morrison@coastaleats.com", skills: ["Server", "Bartender"], locations: ["Santa Monica", "Miami Beach", "Fort Lauderdale"] },
      { name: "Kevin Liu", email: "kevin.liu@coastaleats.com", skills: ["Line Cook"], locations: ["Fort Lauderdale"] },
    ],
  },
];

// ─── Drawer views ───────────────────────────────────────────

function RolePickerView({
  onSelect,
}: {
  onSelect?: (email: string) => void;
}) {
  const { setView, elementRef } = useFamilyDrawer();

  return (
    <div ref={elementRef}>
      <header className="border-b border-border px-4 pb-4 pt-1">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[15px] font-semibold">Demo Accounts</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick a role to browse available accounts
        </p>
      </header>
      <div className="space-y-1 p-3">
        {DEMO_GROUPS.map((group) => (
          <button
            key={group.role}
            type="button"
            onClick={() => setView(group.role)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/60"
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                group.bg
              )}
            >
              <group.icon className={cn("h-4 w-4", group.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{group.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {group.description}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] tabular-nums text-muted-foreground/60">
                {group.accounts.length}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AccountListView({
  group,
  onSelect,
  selectedEmail,
}: {
  group: DemoGroup;
  onSelect: (email: string) => void;
  selectedEmail: string;
}) {
  const { setView, elementRef } = useFamilyDrawer();

  return (
    <div ref={elementRef}>
      <header className="flex items-center gap-2 border-b border-border px-4 pb-4 pt-1">
        <button
          type="button"
          onClick={() => setView("default")}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", group.bg)}>
          <group.icon className={cn("h-3.5 w-3.5", group.color)} />
        </div>
        <h2 className="text-[15px] font-semibold">{group.label}</h2>
        <span className="ml-auto text-[11px] text-muted-foreground/60">
          {group.accounts.length} account{group.accounts.length > 1 ? "s" : ""}
        </span>
      </header>
      <div className="space-y-1 p-2 max-h-[50vh] overflow-y-auto">
        {group.accounts.map((account) => {
          const initials = account.name
            .split(" ")
            .map((n) => n[0])
            .join("");
          const isSelected = selectedEmail === account.email;

          return (
            <button
              key={account.email}
              type="button"
              onClick={() => onSelect(account.email)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                isSelected
                  ? "bg-primary/10 ring-1 ring-primary/20"
                  : "hover:bg-muted/60"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold mt-0.5",
                  group.bg,
                  group.color
                )}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-tight">
                    {account.name}
                  </p>
                  {isSelected && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                {account.skills && account.skills.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {account.skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  <p className="text-[11px] text-muted-foreground truncate">
                    {account.locations.join(" · ")}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Renders the current view from the drawer's context */
function DrawerViewRenderer({
  views,
}: {
  views: Record<string, React.ComponentType>;
}) {
  const { view } = useFamilyDrawer();
  const ViewComponent = views[view] ?? views["default"];
  return <ViewComponent />;
}

// ─── Main export ────────────────────────────────────────────

export const DEMO_PASSWORD = "ShiftSync2026!";
export const ADMIN_DEMO_PASSWORD = "supadmin";

const ADMIN_DEMO_EMAILS = new Set(
  DEMO_GROUPS.find((group) => group.role === "ADMIN")?.accounts.map((account) => account.email) ?? []
);

export function getDemoPasswordByEmail(email: string): string {
  return ADMIN_DEMO_EMAILS.has(email) ? ADMIN_DEMO_PASSWORD : DEMO_PASSWORD;
}

export default function DemoAccountDrawer({
  selectedEmail,
  onSelect,
}: {
  selectedEmail: string;
  onSelect: (email: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (email: string) => {
      onSelect(email);
      setOpen(false);
    },
    [onSelect]
  );

  const views = {
    default: () => (
      <RolePickerView onSelect={handleSelect} />
    ),
    ADMIN: () => (
      <AccountListView
        group={DEMO_GROUPS[0]}
        onSelect={handleSelect}
        selectedEmail={selectedEmail}
      />
    ),
    MANAGER: () => (
      <AccountListView
        group={DEMO_GROUPS[1]}
        onSelect={handleSelect}
        selectedEmail={selectedEmail}
      />
    ),
    STAFF: () => (
      <AccountListView
        group={DEMO_GROUPS[2]}
        onSelect={handleSelect}
        selectedEmail={selectedEmail}
      />
    ),
  };

  return (
    <FamilyDrawerRoot views={views} open={open} onOpenChange={setOpen}>
      <FamilyDrawerTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full h-10 gap-2 font-medium"
        >
          <Users className="h-4 w-4" />
          Use a demo account
        </Button>
      </FamilyDrawerTrigger>
      <FamilyDrawerOverlay />
      <FamilyDrawerContent>
        <FamilyDrawerAnimatedWrapper>
          <FamilyDrawerAnimatedContent>
            <DrawerViewRenderer views={views} />
          </FamilyDrawerAnimatedContent>
        </FamilyDrawerAnimatedWrapper>
      </FamilyDrawerContent>
    </FamilyDrawerRoot>
  );
}
