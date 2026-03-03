"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { LogOut, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const roleLabel: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
};

export function UserNav({ collapsed }: { collapsed?: boolean }) {
  const { profile } = useDashboard();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-3 rounded-lg text-sm transition-colors hover:bg-sidebar-accent w-full outline-none",
          collapsed ? "justify-center p-2" : "px-3 py-2.5"
        )}
      >
        {/* Initials avatar */}
        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
          {getInitials(profile.name)}
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 overflow-hidden flex-1 min-w-0"
            >
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium truncate max-w-[120px]">
                  {profile.name}
                </span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {roleLabel[profile.role]}
                </span>
              </div>
              <ChevronUp className="size-3 text-muted-foreground shrink-0 ml-auto" />
            </motion.div>
          )}
        </AnimatePresence>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <div className="px-3 py-2">
          <p className="text-sm font-medium">{profile.name}</p>
          <p className="text-xs text-muted-foreground">{profile.email}</p>
          <Badge variant="secondary" className="mt-1.5 text-[10px]">
            {roleLabel[profile.role]}
          </Badge>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="size-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
