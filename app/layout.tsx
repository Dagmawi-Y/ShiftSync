import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Providers } from "@/lib/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "ShiftSync | Workforce Management",
  description: "Intelligent shift scheduling and team management platform.",
  icons: {
    icon: "/shiftsync-logo-nobg.png",
    shortcut: "/shiftsync-logo-nobg.png",
    apple: "/shiftsync-logo-nobg.png",
  },
};

const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${dmSans.variable} font-sans antialiased`}
      >
        <Analytics />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
