import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="max-w-3xl w-full space-y-8 text-center bg-card p-12 rounded-2xl border shadow-sm transition-all hover:shadow-md">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            ShiftSync
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            The intelligent workforce management platform for modern teams.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all text-center"
          >
            Get Started
          </Link>
          <Link
            href="/sign-up"
            className="w-full sm:w-auto px-8 py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:opacity-90 transition-all text-center border"
          >
            Create Account
          </Link>
        </div>

        <div className="pt-12 border-t mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="space-y-2">
            <h3 className="font-bold">Smart Scheduling</h3>
            <p className="text-sm text-muted-foreground">Automated shift assignments based on skills and availability.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold">Team Swaps</h3>
            <p className="text-sm text-muted-foreground">Seamless shift replacement requests with manager approval loops.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold">Real-time Sync</h3>
            <p className="text-sm text-muted-foreground">Always up-to-date rosters synced across your entire organization.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
