import { CalendarDays, Clock, ArrowLeftRight, Star } from "lucide-react";

const kpis = [
  { label: "Upcoming Shifts", icon: CalendarDays },
  { label: "Hours This Week", icon: Clock },
  { label: "Swap Requests", icon: ArrowLeftRight },
  { label: "Your Rating", icon: Star },
];

export default function StaffDashboardPage() {
  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your schedule overview and recent activity.
        </p>
      </div>

      {/* KPI placeholders */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {kpi.label}
              </span>
              <kpi.icon className="size-4 text-muted-foreground/50" />
            </div>
            <p className="mt-2 text-3xl font-bold font-display text-foreground/30">
              &mdash;
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
        <p className="text-muted-foreground text-sm">
          Upcoming shifts and availability calendar will appear here in Phase 2.
        </p>
      </div>
    </div>
  );
}
