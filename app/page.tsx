"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { progressStore } from "@/lib/progressStore";
import { usePacks } from "@/lib/usePacks";
import { useProgress } from "@/lib/useProgress";

export default function HomePage() {
  const { progress, source } = useProgress();
  const packs = usePacks();

  if (!progress) return <p>Loading...</p>;

  const dueCount = progressStore.getDuePhraseIds(progress).length;
  const recent = Object.values(progress.packProgress)
    .filter((pack) => pack.lastOpenedAt)
    .sort((a, b) => (a.lastOpenedAt! < b.lastOpenedAt! ? 1 : -1));

  const currentPack = recent
    .map((item) => packs.find((pack) => pack.id === item.packId))
    .find(Boolean);

  const secondaryPacks = recent
    .slice(1, 3)
    .map((item) => packs.find((pack) => pack.id === item.packId))
    .filter(Boolean);

  const hasInProgress = Boolean(currentPack);

  return (
    <div>
      <header className="pb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Today</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your next learning step</h1>
        <p className="mt-2 text-xs text-slate-500">{source === "server" ? "Synced with Supabase" : "Local fallback mode"}</p>
      </header>

      <section className="section space-y-4">
        {hasInProgress ? (
          <Link href={`/pack/${currentPack!.id}`} className="group inline-flex w-full items-center justify-between border-b border-slate-200 pb-2 text-sm">
            <span>Continue pack: {currentPack!.title}</span>
            <Icon name="play" className="h-4 w-4 text-slate-500 transition group-hover:text-ink" />
          </Link>
        ) : (
          <Link href="/library" className="group inline-flex w-full items-center justify-between border-b border-slate-200 pb-2 text-sm">
            <span>Start a published pack</span>
            <Icon name="library" className="h-4 w-4 text-slate-500 transition group-hover:text-ink" />
          </Link>
        )}

        <Link href="/review" className="group inline-flex w-full items-center justify-between border-b border-slate-200 pb-2 text-sm">
          <span>Review due phrases ({dueCount})</span>
          <Icon name="review" className="h-4 w-4 text-slate-500 transition group-hover:text-ink" />
        </Link>
      </section>

      <section className="section">
        <h2 className="text-xs uppercase tracking-[0.18em] text-slate-400">Light context</h2>
        <div className="mt-3 space-y-2 text-sm">
          <p className="border-b border-slate-100 pb-2">Due now: {dueCount}</p>
          <p className="border-b border-slate-100 pb-2">Saved phrases: {progress.savedPhraseIds.length}</p>
          {!hasInProgress ? <p className="text-slate-500">No recent pack yet. Pick one from Library to start your loop.</p> : null}
        </div>

        {secondaryPacks.length > 0 ? (
          <div className="mt-4 divide-y divide-slate-100">
            {secondaryPacks.map((pack) => (
              <Link key={pack!.id} href={`/pack/${pack!.id}`} className="flex items-center justify-between py-2 text-sm">
                <span>{pack!.title}</span>
                <Icon name="play" className="h-4 w-4 text-slate-400" />
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
