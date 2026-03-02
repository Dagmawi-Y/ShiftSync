import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SiteLogoProps = {
  className?: string;
  withText?: boolean;
  linked?: boolean;
};

export function SiteLogo({
  className,
  withText = true,
  linked = true,
}: SiteLogoProps) {
  const content = (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <Image
        src="/shiftsync-logo-nobg.png"
        alt="ShiftSync logo"
        width={48}
        height={48}
        priority
      />
      {withText ? (
        <span className="text-2xl font-extrabold tracking-tight">ShiftSync</span>
      ) : null}
    </div>
  );

  if (!linked) {
    return content;
  }

  return <Link href="/">{content}</Link>;
}