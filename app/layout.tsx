import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/ui/BottomNav";

export const metadata: Metadata = {
  title: "Lilt",
  description: "Input-first English phrase learning app",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto min-h-screen w-full max-w-xl px-6 pb-24 pt-8">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
