import Image from "next/image";
import { ThemeSwitcher } from "@/components/theme-switcher";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-svh flex flex-col lg:flex-row bg-background">
      {/* Theme Switcher Toggle - top right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeSwitcher />
      </div>

      {/* ── Left branded panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0A0A0B]">
        {/* Deep mesh gradient background */}
        <div className="absolute inset-0 opacity-40 auth-gradient-mesh" />

        {/* Dynamic geometric patterns */}
        <div className="absolute inset-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-shiftsync-blue/10 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[40%] rounded-full bg-shiftsync-teal/10 blur-[100px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Top: Logo */}
          <div className="flex items-center gap-3 group cursor-default">
            <div className="relative">
              <div className="absolute inset-0 bg-shiftsync-blue/20 blur-md rounded-full scale-125" />
              <Image
                src="/shiftsync-logo-nobg.png"
                alt="ShiftSync"
                width={42}
                height={42}
                priority
                className="relative"
              />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight font-display">
              ShiftSync
            </span>
          </div>

          {/* Middle: Brand Message */}
          <div className="space-y-6">
            <h2 className="text-5xl xl:text-6xl font-bold text-white leading-[1.05] font-display">
              Streamlining
              <br />
              workforce
              <br />
              <span className="bg-linear-to-r from-shiftsync-blue via-shiftsync-teal to-shiftsync-yellow bg-clip-text text-transparent">
                operations.
              </span>
            </h2>
            <p className="text-lg text-white/50 max-w-sm leading-relaxed">
              Comprehensive platform for shift management and team coordination platform for Coastal Eats.
            </p>
          </div>

          {/* Bottom Branding */}
          <div className="flex items-center gap-2 opacity-30">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-white font-semibold uppercase tracking-[0.2em]">
              Internal Platform &bull; v1.0.0
            </span>
          </div>
        </div>

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col min-h-svh lg:min-h-0 bg-background relative overflow-hidden">
        {/* Subtle background ambient light */}
        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-shiftsync-blue/5 blur-[120px] pointer-events-none lg:hidden" />

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-5 border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
          <div className="flex items-center gap-2.5">
            <Image
              src="/shiftsync-logo-nobg.png"
              alt="ShiftSync"
              width={30}
              height={30}
              priority
            />
            <span className="text-lg font-bold text-foreground font-display">
              ShiftSync
            </span>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-8 relative z-10">
          <div className="w-full max-w-90">{children}</div>
        </div>

        {/* Minimal Footer */}
        <div className="px-8 py-6 text-center lg:text-left">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium">
            &copy; {new Date().getFullYear()} ShiftSync.
          </p>
        </div>
      </div>
    </div>
  );
}
