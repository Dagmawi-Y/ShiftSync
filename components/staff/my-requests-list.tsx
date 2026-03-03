"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSkillColor, formatSkillLabel } from "@/components/schedule/shift-card";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowRightLeft,
  ArrowDown,
  Check,
  Clock,
  Loader2,
  X,
  Ban,
  FileText,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────

interface SwapRequestData {
  id: string;
  shiftId: string;
  initiatorId: string;
  receiverId: string | null;
  isDrop: boolean;
  status: string;
  initiatorNote: string | null;
  managerNote: string | null;
  createdAt: string;
  expiresAt: string;
  resolvedAt: string | null;
  initiator: { id: string; name: string };
  receiver: { id: string; name: string } | null;
  shift: {
    id: string;
    startTime: string;
    endTime: string;
    requiredSkill: string;
    location: { name: string };
  };
}

interface MyRequestsListProps {
  requests: SwapRequestData[];
  profileId: string;
  loading?: boolean;
  onAction?: () => void;
}

// ─── Status Helpers ──────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }
> = {
  PENDING_STAFF: {
    label: "Awaiting response",
    variant: "secondary",
    icon: Clock,
  },
  PENDING_MANAGER: {
    label: "Awaiting manager",
    variant: "default",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    variant: "outline",
    icon: Check,
  },
  REJECTED: {
    label: "Rejected",
    variant: "destructive",
    icon: X,
  },
  CANCELLED: {
    label: "Cancelled",
    variant: "secondary",
    icon: Ban,
  },
  EXPIRED: {
    label: "Expired",
    variant: "secondary",
    icon: Clock,
  },
};

// ─── Component ───────────────────────────────────────────

export function MyRequestsList({
  requests,
  profileId,
  loading,
  onAction,
}: MyRequestsListProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const performAction = useCallback(
    async (swapId: string, action: string) => {
      setActionLoading(`${swapId}-${action}`);
      try {
        const res = await fetch(`/api/swaps/${swapId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Failed to ${action.toLowerCase()}`);
        }

        const labels: Record<string, string> = {
          ACCEPT: "Swap accepted — waiting for manager approval",
          REJECT: "Swap request rejected",
          CANCEL: "Request cancelled",
        };
        toast.success(labels[action] ?? "Action completed");
        onAction?.();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Something went wrong"
        );
      } finally {
        setActionLoading(null);
      }
    },
    [onAction]
  );

  // Separate into categories
  const incoming = requests.filter(
    (r) =>
      r.receiverId === profileId &&
      !r.isDrop &&
      r.status === "PENDING_STAFF"
  );
  const outgoing = requests.filter((r) => r.initiatorId === profileId);
  const hasContent = incoming.length > 0 || outgoing.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="size-4" />
          My Requests
        </CardTitle>
        <CardDescription>
          View and manage your swap and drop requests.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !hasContent ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No swap or drop requests yet.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Incoming swap requests (need response) */}
            {incoming.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Incoming Requests
                </h4>
                {incoming.map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    profileId={profileId}
                    actionLoading={actionLoading}
                    onAction={performAction}
                    variant="incoming"
                  />
                ))}
              </div>
            )}

            {/* Outgoing requests */}
            {outgoing.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  My Requests
                </h4>
                {outgoing.map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    profileId={profileId}
                    actionLoading={actionLoading}
                    onAction={performAction}
                    variant="outgoing"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Request Card ────────────────────────────────────────

function RequestCard({
  request,
  profileId,
  actionLoading,
  onAction,
  variant,
}: {
  request: SwapRequestData;
  profileId: string;
  actionLoading: string | null;
  onAction: (id: string, action: string) => void;
  variant: "incoming" | "outgoing";
}) {
  const config = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.EXPIRED;
  const StatusIcon = config.icon;
  const colors = getSkillColor(request.shift.requiredSkill);
  const isPending =
    request.status === "PENDING_STAFF" ||
    request.status === "PENDING_MANAGER";
  const canCancel =
    variant === "outgoing" &&
    isPending &&
    request.initiatorId === profileId;
  const canRespond =
    variant === "incoming" && request.status === "PENDING_STAFF";

  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* Left side */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {request.isDrop ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <ArrowDown className="size-3" /> Drop
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                <ArrowRightLeft className="size-3" /> Swap
              </span>
            )}
            <Badge
              variant="secondary"
              className={`text-[10px] ${colors.bg} ${colors.text}`}
            >
              {formatSkillLabel(request.shift.requiredSkill)}
            </Badge>
            <Badge variant={config.variant} className="text-[10px]">
              <StatusIcon className="size-2.5 mr-1" />
              {config.label}
            </Badge>
          </div>

          <p className="text-sm font-medium">
            {format(new Date(request.shift.startTime), "EEE, MMM d")} ·{" "}
            {format(new Date(request.shift.startTime), "h:mm a")} –{" "}
            {format(new Date(request.shift.endTime), "h:mm a")}
          </p>

          <p className="text-xs text-muted-foreground">
            {request.shift.location.name}
            {!request.isDrop && request.receiver && variant === "outgoing" && (
              <> · with {request.receiver.name}</>
            )}
            {!request.isDrop && variant === "incoming" && (
              <> · from {request.initiator.name}</>
            )}
          </p>

          {request.initiatorNote && (
            <p className="text-xs text-muted-foreground italic mt-0.5">
              &ldquo;{request.initiatorNote}&rdquo;
            </p>
          )}

          <p className="text-[10px] text-muted-foreground/60">
            {formatDistanceToNow(new Date(request.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {canRespond && (
            <>
              <Button
                size="xs"
                onClick={() => onAction(request.id, "ACCEPT")}
                disabled={actionLoading === `${request.id}-ACCEPT`}
              >
                {actionLoading === `${request.id}-ACCEPT` ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Check className="size-3 mr-1" />
                )}
                Accept
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => onAction(request.id, "REJECT")}
                disabled={actionLoading === `${request.id}-REJECT`}
              >
                {actionLoading === `${request.id}-REJECT` ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <X className="size-3 mr-1" />
                )}
                Decline
              </Button>
            </>
          )}
          {canCancel && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => onAction(request.id, "CANCEL")}
              disabled={actionLoading === `${request.id}-CANCEL`}
            >
              {actionLoading === `${request.id}-CANCEL` ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Ban className="size-3 mr-1" />
              )}
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
