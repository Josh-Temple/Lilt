"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { contentService } from "@/lib/content";
import { progressStore } from "@/lib/progressStore";
import { ReviewRating } from "@/lib/types";
import { useProgress } from "@/lib/useProgress";

export default function ReviewPage() {
  const { progress, reviewPhrase } = useProgress();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const queue = useMemo(() => {
    if (!progress) return [];
    const dueIds = progressStore.getDuePhraseIds(progress);
    return dueIds.map((id) => contentService.getPhrase(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [progress]);

  if (!progress) return <p>Loading...</p>;
  if (queue.length === 0) {
    return (
      <div className="section space-y-3">
        <p>No due items right now.</p>
        <Link href="/library" className="btn">Open a pack</Link>
      </div>
    );
  }

  const phrase = queue[index % queue.length];
  const handleRate = async (rating: ReviewRating) => {
    await reviewPhrase(phrase.id, rating);
    setIndex((v) => v + 1);
    setRevealed(false);
  };

  return (
    <div>
      <header className="pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Review</h1>
        <p className="mt-2 text-sm text-slate-500">Due {queue.length} · Item {index + 1}</p>
      </header>

      <section className="section space-y-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Prompt</p>
        <p className="text-lg">{phrase.meaningJa}</p>

        {revealed ? (
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <p className="text-lg font-medium">{phrase.text}</p>
            {phrase.examples[0] ? <p className="text-sm text-slate-600">{phrase.examples[0]}</p> : null}
          </div>
        ) : (
          <button className="btn" onClick={() => setRevealed(true)}>Show answer</button>
        )}
      </section>

      <section className="section flex items-center justify-between px-6">
        <button className="btn" aria-label="Hard" onClick={() => handleRate("hard")}>
          <Icon name="flag" />
          <span>Hard</span>
        </button>
        <button className="btn" aria-label="Close" onClick={() => handleRate("close")}>
          <Icon name="refresh" />
          <span>Close</span>
        </button>
        <button className="btn-primary" aria-label="Easy" onClick={() => handleRate("easy")}>
          <Icon name="spark" />
          <span>Easy</span>
        </button>
      </section>
    </div>
  );
}
