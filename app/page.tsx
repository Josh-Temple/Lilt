"use client";

import Link from "next/link";
import { contentService } from "@/lib/content";
import { progressStore } from "@/lib/progressStore";
import { useProgress } from "@/lib/useProgress";

export default function HomePage() {
  const { progress } = useProgress();
  const packs = contentService.getPacks();

  if (!progress) return <p>Loading...</p>;

  const dueCount = progressStore.getDuePhraseIds(progress).length;
  const savedCount = progress.savedPhraseIds.length;
  const recentPacks = Object.values(progress.packProgress)
    .filter((pack) => pack.lastOpenedAt)
    .sort((a, b) => (a.lastOpenedAt! < b.lastOpenedAt! ? 1 : -1))
    .slice(0, 3)
    .map((item) => packs.find((pack) => pack.id === item.packId))
    .filter(Boolean);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-sm text-slate-500">Today</p>
        <h1 className="text-2xl font-semibold">Keep your phrases fresh</h1>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Link href="/library" className="card">
          <p className="text-xs text-slate-500">Primary</p>
          <h2 className="mt-1 font-medium">Learn a pack</h2>
        </Link>
        <Link href="/review" className="card">
          <p className="text-xs text-slate-500">Primary</p>
          <h2 className="mt-1 font-medium">Review due phrases</h2>
        </Link>
      </section>

      <section className="card space-y-1">
        <h3 className="font-medium">Summary</h3>
        <p className="text-sm">Review due: {dueCount}</p>
        <p className="text-sm">Saved phrases: {savedCount}</p>
        <p className="text-sm">Total packs: {packs.length}</p>
      </section>

      <section className="card space-y-2">
        <h3 className="font-medium">Recent packs</h3>
        {recentPacks.length === 0 ? (
          <p className="text-sm text-slate-600">Start any pack from Library.</p>
        ) : (
          recentPacks.map((pack) => (
            <Link key={pack!.id} href={`/pack/${pack!.id}`} className="block rounded-lg bg-slate-50 p-3 text-sm">
              {pack!.title}
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
