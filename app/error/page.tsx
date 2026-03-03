import { AuthLayout } from "@/components/auth-layout";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
      {params?.error
        ? `Error: ${params.error}`
        : "An unexpected error occurred. Please try again."}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <AuthLayout>
      <div className="space-y-8">
        <div className="space-y-4 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight font-display">
            Something went wrong
          </h1>
          <Suspense>
            <ErrorContent searchParams={searchParams} />
          </Suspense>
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
