import type { Metadata } from "next";
import { cookies } from "next/headers";
import { THEME_STORAGE_KEY } from "@/lib/theme-init";

export const metadata: Metadata = {
  title: "Maker Docs — Game Documentation Hub",
  description:
    "Premium documentation platform for game studios: characters, skills, mechanics & systems.",
};

/** Root shell only — no shared CSS; each route group loads its own styles. */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = cookieStore.get(THEME_STORAGE_KEY)?.value;
  const isDark = theme === "dark";

  return (
    <html
      lang="en"
      className={isDark ? "dark" : undefined}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
