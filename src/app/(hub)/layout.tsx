import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { DocsProvider } from "@/components/DocsProvider";
import { ProfileProvider } from "@/components/ProfileProvider";
import AppShell from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { auth } from "@/auth";
import "./hub.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export default async function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <div className={inter.variable}>
      <ThemeProvider>
        <SessionProvider session={session}>
          <ProfileProvider>
            <DocsProvider>
              <AppShell>{children}</AppShell>
            </DocsProvider>
          </ProfileProvider>
        </SessionProvider>
      </ThemeProvider>
    </div>
  );
}
