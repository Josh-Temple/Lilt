"use client";

import Link from "next/link";

export function AdminShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-[#edf0f5] p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Lilt Admin</p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm font-medium text-slate-500">{subtitle}</p> : null}
        <div className="mt-4 flex gap-2">
          <Link href="/admin" className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
            Dashboard
          </Link>
          <Link href="/admin/packs/new" className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 ring-1 ring-slate-200">
            New Pack
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
