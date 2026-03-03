"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional section label for context */
  section?: string;
  /** Compact mode for smaller sections */
  compact?: boolean;
  /** Optional fallback override */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ─── Component ───────────────────────────────────────────

export class SectionErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.section ? `: ${this.props.section}` : ""}]`,
      error,
      errorInfo.componentStack
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const { compact, section } = this.props;

      return (
        <div
          className={`flex flex-col items-center justify-center text-center rounded-lg border border-destructive/20 bg-destructive/5 ${compact ? "py-6 px-4 gap-2" : "py-12 px-6 gap-3"}`}
        >
          <div
            className={`rounded-full bg-destructive/10 flex items-center justify-center ${compact ? "size-10" : "size-14"}`}
          >
            <AlertTriangle
              className={`text-destructive ${compact ? "size-5" : "size-7"}`}
            />
          </div>
          <div>
            <h3
              className={`font-semibold font-display text-foreground ${compact ? "text-sm" : "text-base"}`}
            >
              Something went wrong
              {section ? ` in ${section}` : ""}
            </h3>
            <p
              className={`text-muted-foreground mt-1 max-w-xs ${compact ? "text-xs" : "text-sm"}`}
            >
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
          </div>
          <Button
            variant="outline"
            size={compact ? "xs" : "sm"}
            onClick={this.handleReset}
            className="mt-1"
          >
            <RotateCcw className={compact ? "size-3" : "size-3.5"} />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
