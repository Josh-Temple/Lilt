"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
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
    <div>
      <header className="pb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Today</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Keep your phrases fresh</h1>
      </header>

      <section className="section">
        <div className="grid grid-cols-2 gap-6">
          <Link href="/library" className="group inline-flex items-center justify-between border-b border-slate-200 pb-2 text-sm">
            <span>Learn</span>
            <Icon name="library" className="h-4 w-4 text-slate-500 transition group-hover:text-ink" />
          </Link>
          <Link href="/review" className="group inline-flex items-center justify-between border-b border-slate-200 pb-2 text-sm">
            <span>Review</span>
            <Icon name="review" className="h-4 w-4 text-slate-500 transition group-hover:text-ink" />
          </Link>
        </div>
      </section>

      <section className="section">
        <h2 className="text-xs uppercase tracking-[0.18em] text-slate-400">Summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt>Due</dt>
            <dd>{dueCount}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt>Saved</dt>
            <dd>{savedCount}</dd>
          </div>
          <div className="flex justify-between pb-2">
            <dt>Packs</dt>
            <dd>{packs.length}</dd>
          </div>
        </dl>
      </section>

      <section className="section">
        <h2 className="text-xs uppercase tracking-[0.18em] text-slate-400">Recent</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {recentPacks.length === 0 ? (
            <p className="py-3 text-sm text-slate-500">Start any pack from Library.</p>
          ) : (
            recentPacks.map((pack) => (
              <Link key={pack!.id} href={`/pack/${pack!.id}`} className="group flex items-center justify-between py-3 text-sm">
                <span>{pack!.title}</span>
                <Icon name="play" className="h-4 w-4 text-slate-400 transition group-hover:text-ink" />
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
