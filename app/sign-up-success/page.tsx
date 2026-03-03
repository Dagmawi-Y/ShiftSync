import { AuthLayout } from "@/components/auth-layout";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <AuthLayout>
      <div className="space-y-8">
        <div className="space-y-4 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-secondary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight font-display">
            Account activated
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Your account has been successfully set up. You can now sign in with
            your credentials.
          </p>
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Go to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
