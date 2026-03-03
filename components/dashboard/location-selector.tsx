"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { MapPin, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function LocationSelector({ collapsed }: { collapsed?: boolean }) {
  const { locations, selectedLocationId, setSelectedLocationId } =
    useDashboard();

  if (locations.length === 0) return null;

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);
  const shortName =
    selectedLocation?.name.split("—")[1]?.trim() ??
    selectedLocation?.name ??
    "Select location";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-lg text-sm transition-colors hover:bg-sidebar-accent w-full outline-none",
          collapsed ? "justify-center p-2" : "px-3 py-2"
        )}
      >
        <MapPin className="size-4 shrink-0 text-muted-foreground" />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1 overflow-hidden min-w-0"
            >
              <span className="truncate font-medium text-[13px]">
                {shortName}
              </span>
              <ChevronDown className="size-3 text-muted-foreground shrink-0" />
            </motion.div>
          )}
        </AnimatePresence>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {locations.map((location) => {
          const name =
            location.name.split("—")[1]?.trim() ?? location.name;
          const isSelected = location.id === selectedLocationId;
          return (
            <DropdownMenuItem
              key={location.id}
              onClick={() => setSelectedLocationId(location.id)}
              className="flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className={cn(isSelected && "font-medium")}>
                  {name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {location.timezone
                    .replace("America/", "")
                    .replace(/_/g, " ")}
                </span>
              </div>
              {isSelected && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
