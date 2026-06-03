import type { Metadata } from "next";

/** Published docs — no hub shell, theme, or admin CSS. */
export const metadata: Metadata = {
  title: "Document",
  robots: { index: false, follow: false },
};

export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        background: "#060a14",
        colorScheme: "dark",
      }}
    >
      {children}
    </div>
  );
}
