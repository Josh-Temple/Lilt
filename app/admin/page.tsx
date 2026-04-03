"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { hasSupabaseEnv, requestMagicLink, selectRows } from "@/lib/supabase/client";

type PackRow = { id: string; title: string; slug: string; status: string; created_at: string };

export default function AdminDashboardPage() {
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [packs, setPacks] = useState<PackRow[]>([]);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setError("Supabase environment variables are missing.");
      return;
    }

    selectRows<PackRow[]>("packs", "select=id,title,slug,status,created_at&order=created_at.desc&limit=20")
      .then(setPacks)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const onMagicLink = async () => {
    if (!email) return;

    try {
      await requestMagicLink(email);
      setError("Magic link sent. Open your email to continue.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <AdminShell title="Author Console" subtitle="Private authoring UI for packs, phrases, and audio uploads.">
      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Admin access</h2>
        <p className="text-sm text-slate-600">Use magic link sign-in. Keep your author account as `profiles.is_admin = true`.</p>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-300 p-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="btn-primary" onClick={onMagicLink}>
            Send link
          </button>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent packs</h2>
          <Link href="/admin/packs/new" className="btn-secondary">
            Create pack
          </Link>
        </div>
        {packs.map((pack) => (
          <Link key={pack.id} href={`/admin/packs/${pack.id}/edit`} className="block rounded-xl border border-slate-200 p-3">
            <p className="font-semibold">{pack.title}</p>
            <p className="text-xs text-slate-500">/{pack.slug} · {pack.status}</p>
          </Link>
        ))}
      </section>
    </AdminShell>
  );
}
