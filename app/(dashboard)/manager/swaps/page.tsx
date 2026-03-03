"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeftRight,
  Check,
  X,
  Clock,
  CircleSlash,
  Filter,
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getSkillColor,
  formatSkillLabel,
} from "@/components/schedule/shift-card";
import { cn } from "@/lib/utils";

interface SwapRecord {
  id: string;
  shiftId: string;
  isDrop: boolean;
  status: string;
  initiatorNote: string | null;
  managerNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  expiresAt: string;
  initiator: { id: string; name: string };
  receiver: { id: string; name: string } | null;
  shift: {
    id: string;
    requiredSkill: string;
    startTime: string;
    endTime: string;
    location: { id: string; name: string };
  };
}

type StatusFilter = "all" | "PENDING_MANAGER" | "PENDING_STAFF" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING_STAFF: { label: "Awaiting Staff", variant: "secondary" },
  PENDING_MANAGER: { label: "Needs Approval", variant: "default" },
  APPROVED: { label: "Approved", variant: "outline" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
  EXPIRED: { label: "Expired", variant: "secondary" },
};

export default function ManagerSwapsPage() {
  const { selectedLocationId } = useDashboard();
  const [swaps, setSwaps] = useState<SwapRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Dialog state
  const [actionTarget, setActionTarget] = useState<{
    swap: SwapRecord;
    action: "APPROVE" | "REJECT";
  } | null>(null);
  const [managerNote, setManagerNote] = useState("");
  const [acting, setActing] = useState(false);

  const fetchSwaps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/swaps?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setSwaps(json.data ?? []);
    } catch {
      toast.error("Failed to load swap requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSwaps();
  }, [fetchSwaps]);

  // Optionally filter by selected location client-side (API returns all managed locations)
  const filtered = useMemo(() => {
    if (!selectedLocationId) return swaps;
    return swaps.filter((s) => s.shift.location.id === selectedLocationId);
  }, [swaps, selectedLocationId]);

  // Split into pending and resolved
  const pending = filtered.filter(
    (s) => s.status === "PENDING_MANAGER" || s.status === "PENDING_STAFF"
  );
  const resolved = filtered.filter(
    (s) => s.status !== "PENDING_MANAGER" && s.status !== "PENDING_STAFF"
  );

  async function handleAction() {
    if (!actionTarget) return;
    setActing(true);
    try {
      const res = await fetch(`/api/swaps/${actionTarget.swap.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionTarget.action,
          ...(managerNote ? { managerNote } : {}),
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Action failed");
      }
      toast.success(
        actionTarget.action === "APPROVE"
          ? "Swap approved"
          : "Swap rejected"
      );
      setActionTarget(null);
      setManagerNote("");
      fetchSwaps();
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">
            Swap Requests
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and manage shift swap and drop requests.
          </p>
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING_MANAGER">Needs Approval</SelectItem>
            <SelectItem value="PENDING_STAFF">Awaiting Staff</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pending Section */}
      <SectionErrorBoundary section="Pending requests" compact>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4" />
              Pending Requests
              {pending.length > 0 && (
                <Badge variant="default" className="ml-1 text-[10px] px-1.5">
                  {pending.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Requests waiting for your review or staff response.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-muted/40 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : pending.length === 0 ? (
              <EmptyState
                preset="swaps"
                message="No pending swap or drop requests."
                compact
              />
            ) : (
              <div className="space-y-3">
                {pending.map((swap) => (
                  <SwapCard
                    key={swap.id}
                    swap={swap}
                    onApprove={() =>
                      setActionTarget({ swap, action: "APPROVE" })
                    }
                    onReject={() =>
                      setActionTarget({ swap, action: "REJECT" })
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </SectionErrorBoundary>

      {/* Resolved Section */}
      <SectionErrorBoundary section="Resolved requests" compact>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CircleSlash className="size-4" />
              Resolved
            </CardTitle>
            <CardDescription>
              Past swap and drop requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted/40 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : resolved.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No resolved requests to show.
              </p>
            ) : (
              <div className="space-y-2">
                {resolved.map((swap) => (
                  <SwapCard key={swap.id} swap={swap} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </SectionErrorBoundary>

      {/* Approve/Reject Dialog */}
      <Dialog
        open={!!actionTarget}
        onOpenChange={(open) => {
          if (!open) {
            setActionTarget(null);
            setManagerNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.action === "APPROVE"
                ? "Approve Request"
                : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {actionTarget?.swap.isDrop
                ? `${actionTarget.swap.initiator.name} wants to drop their shift on ${actionTarget ? format(new Date(actionTarget.swap.shift.startTime), "MMM d, h:mm a") : ""}.`
                : `${actionTarget?.swap.initiator.name} wants to swap with ${actionTarget?.swap.receiver?.name ?? "someone"} for the shift on ${actionTarget ? format(new Date(actionTarget.swap.shift.startTime), "MMM d, h:mm a") : ""}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="managerNote">Note (optional)</Label>
              <Input
                id="managerNote"
                placeholder="Add a note for the staff member…"
                value={managerNote}
                onChange={(e) => setManagerNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionTarget(null);
                setManagerNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant={
                actionTarget?.action === "APPROVE" ? "default" : "destructive"
              }
              onClick={handleAction}
              disabled={acting}
            >
              {acting
                ? "Processing…"
                : actionTarget?.action === "APPROVE"
                  ? "Approve"
                  : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Swap Card ────────────────────────────────────────────

function SwapCard({
  swap,
  onApprove,
  onReject,
}: {
  swap: SwapRecord;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const colors = getSkillColor(swap.shift.requiredSkill);
  const config = statusConfig[swap.status] ?? {
    label: swap.status,
    variant: "secondary" as const,
  };
  const isPending = swap.status === "PENDING_MANAGER";

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        isPending
          ? "bg-primary/5 border-primary/20"
          : "bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        {/* Left info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={config.variant} className="text-[10px]">
              {config.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 h-4",
                colors.text,
                colors.border
              )}
            >
              {swap.isDrop ? "Drop" : "Swap"} ·{" "}
              {formatSkillLabel(swap.shift.requiredSkill)}
            </Badge>
          </div>

          <p className="text-sm">
            <span className="font-medium">{swap.initiator.name}</span>
            {swap.isDrop ? (
              <span className="text-muted-foreground"> wants to drop</span>
            ) : (
              <>
                <span className="text-muted-foreground">
                  {" "}
                  wants to swap with{" "}
                </span>
                <span className="font-medium">
                  {swap.receiver?.name ?? "—"}
                </span>
              </>
            )}
          </p>

          <p className="text-xs text-muted-foreground">
            {swap.shift.location.name} ·{" "}
            {format(new Date(swap.shift.startTime), "EEE, MMM d · h:mm a")} –{" "}
            {format(new Date(swap.shift.endTime), "h:mm a")}
          </p>

          {swap.initiatorNote && (
            <p className="text-xs text-muted-foreground italic">
              &ldquo;{swap.initiatorNote}&rdquo;
            </p>
          )}
          {swap.managerNote && (
            <p className="text-xs text-muted-foreground">
              Manager: {swap.managerNote}
            </p>
          )}

          <p className="text-[11px] text-muted-foreground/60">
            {formatDistanceToNow(new Date(swap.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>

        {/* Actions */}
        {isPending && onApprove && onReject && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={onReject}
            >
              <X className="size-3.5 mr-1" />
              Reject
            </Button>
            <Button size="sm" onClick={onApprove}>
              <Check className="size-3.5 mr-1" />
              Approve
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
