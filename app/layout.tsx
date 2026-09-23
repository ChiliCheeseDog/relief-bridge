import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relief Bridge — Care, connected.",
  description:
    "Connect medical supply donations with clinic needs. Request resources, coordinate matches, and follow every delivery in one place.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
