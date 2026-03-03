import { AuthLayout } from "@/components/auth-layout";
import { InviteAcceptForm } from "@/components/invite-accept-form";

export default function Page() {
  return (
    <AuthLayout>
      <InviteAcceptForm />
    </AuthLayout>
  );
}
