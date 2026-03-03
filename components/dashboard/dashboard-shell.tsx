"use client";

import { Sidebar, MobileSidebar } from "./sidebar";
import { Header } from "./header";
import { PageTransition } from "./page-transition";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      <MobileSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <PageTransition>
            <div className="p-6">{children}</div>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
