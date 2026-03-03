"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FamilyDrawerRoot,
  FamilyDrawerTrigger,
  FamilyDrawerContent,
  FamilyDrawerAnimatedWrapper,
  FamilyDrawerAnimatedContent,
  useFamilyDrawer,
} from "@/components/ui/family-drawer";
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  UserRound,
  Users,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

type Role = "ADMIN" | "MANAGER" | "STAFF";

function getDashboardPath(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "MANAGER":
      return "/manager/dashboard";
    case "STAFF":
      return "/staff/dashboard";
    default:
      return "/";
  }
}

interface DemoAccount {
  name: string;
  email: string;
  detail: string;
}

interface DemoGroup {
  role: Role;
  label: string;
  icon: typeof ShieldCheck;
  color: string;
  bg: string;
  accounts: DemoAccount[];
}

const DEMO_GROUPS: DemoGroup[] = [
  {
    role: "ADMIN",
    label: "Admin",
    icon: ShieldCheck,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    accounts: [
      { name: "System Admin", email: "linkdaggy@gmail.com", detail: "All locations" },
    ],
  },
  {
    role: "MANAGER",
    label: "Managers",
    icon: Building2,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    accounts: [
      { name: "Maria Santos", email: "maria.santos@coastaleats.com", detail: "Santa Monica" },
      { name: "James Chen", email: "james.chen@coastaleats.com", detail: "Venice Beach" },
      { name: "Aisha Johnson", email: "aisha.johnson@coastaleats.com", detail: "Miami Beach & Fort Lauderdale" },
      { name: "Carlos Rivera", email: "carlos.rivera@coastaleats.com", detail: "Fort Lauderdale" },
    ],
  },
  {
    role: "STAFF",
    label: "Staff",
    icon: UserRound,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    accounts: [
      { name: "Sarah Kim", email: "sarah.kim@coastaleats.com", detail: "Bartender, Server" },
      { name: "Marcus Thompson", email: "marcus.thompson@coastaleats.com", detail: "Line Cook" },
      { name: "Jessica Nguyen", email: "jessica.nguyen@coastaleats.com", detail: "Server, Host" },
      { name: "David Okafor", email: "david.okafor@coastaleats.com", detail: "Bartender" },
      { name: "Emily Watson", email: "emily.watson@coastaleats.com", detail: "Server" },
      { name: "Ryan Park", email: "ryan.park@coastaleats.com", detail: "Line Cook, Host" },
      { name: "Nina Rodriguez", email: "nina.rodriguez@coastaleats.com", detail: "Bartender, Server" },
      { name: "Tyler Brooks", email: "tyler.brooks@coastaleats.com", detail: "Host" },
      { name: "Jade Morrison", email: "jade.morrison@coastaleats.com", detail: "Server, Bartender" },
      { name: "Kevin Liu", email: "kevin.liu@coastaleats.com", detail: "Line Cook" },
    ],
  },
];

const DEMO_PASSWORD = "ShiftSync2026!";

// ─── Drawer views ───────────────────────────────────────────

function RolePickerView({
  onSelect,
}: {
  onSelect?: (email: string) => void;
}) {
  const { setView, elementRef } = useFamilyDrawer();

  return (
    <div ref={elementRef}>
      <header className="flex items-center gap-2 border-b border-border px-4 pb-4 pt-1">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-[15px] font-semibold">Demo Accounts</h2>
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
              <p className="text-xs text-muted-foreground">
                {group.accounts.length} account{group.accounts.length > 1 ? "s" : ""}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
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
      </header>
      <div className="space-y-0.5 p-2">
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
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                isSelected
                  ? "bg-primary/10 ring-1 ring-primary/20"
                  : "hover:bg-muted/60"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  group.bg,
                  group.color
                )}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {account.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {account.detail}
                </p>
              </div>
              {isSelected && (
                <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Fetch role from profile and redirect to role-specific dashboard
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const { data } = await res.json();
        router.push(getDashboardPath(data.role));
      } else {
        router.push("/");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("space-y-8", className)} {...props}>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight font-display">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access your account
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 h-10"
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 pr-9 h-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-10 font-medium"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* Info for invited users */}
      <p className="text-center text-xs text-muted-foreground/60">
        Don&apos;t have an account? Contact your administrator to receive an
        invitation.
      </p>

      {/* Quick login — demo accounts drawer */}
      <div className="space-y-3">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground/60">
              or
            </span>
          </div>
        </div>

        <DemoAccountDrawer
          selectedEmail={email}
          onSelect={(selectedEmail) => {
            setEmail(selectedEmail);
            setPassword(DEMO_PASSWORD);
            setError(null);
          }}
        />
      </div>
    </div>
  );
}

// ─── Drawer wrapper ─────────────────────────────────────────

function DemoAccountDrawer({
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
