import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "../(hub)/hub.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

/** Login — hub styling only, no sidebar/topbar. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={inter.variable}>
      <ThemeProvider>{children}</ThemeProvider>
    </div>
  );
}
