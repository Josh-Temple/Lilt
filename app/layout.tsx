import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lilt",
  description: "Input-first English phrase learning app",
  manifest: "/manifest.webmanifest",
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/review", label: "Review" },
  { href: "/settings", label: "Settings" },
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto min-h-screen w-full max-w-xl p-4 pb-24">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-xl gap-2 border-t bg-white/95 p-2 backdrop-blur">
          {navItems.map((item) => (
            <Link key={item.href} className="btn-secondary flex-1 text-center" href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </body>
    </html>
  );
}
