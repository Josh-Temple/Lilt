"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

const navItems = [
  { href: "/" as Route, label: "Home", icon: "home" as const },
  { href: "/library" as Route, label: "Library", icon: "library" as const },
  { href: "/review" as Route, label: "Review", icon: "review" as const },
  { href: "/settings" as Route, label: "Settings", icon: "settings" as const },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-xl border-t border-slate-200 bg-white/95 px-3 backdrop-blur">
      {navItems.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link key={item.href} className={`nav-link ${active ? "nav-link-active" : ""}`} href={item.href}>
            <Icon name={item.icon} className="h-4 w-4" />
            <span className="sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
