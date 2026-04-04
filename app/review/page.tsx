"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ReviewRating } from "@/lib/types";
import { useLearnerProgress } from "@/lib/useLearnerProgress";
import { usePhrasesByIds } from "@/lib/usePacks";

export default function ReviewPage() {
  const { progress, duePhraseIds, reviewPhrase } = useLearnerProgress();
  const { phrases: queue, loading } = usePhrasesByIds(duePhraseIds);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const current = useMemo(() => (queue.length ? queue[index % queue.length] : null), [index, queue]);

  if (!progress || loading) return <p>Loading...</p>;
  if (!current) {
    return (
      <div className="section space-y-3">
        <p>No due items right now.</p>
        <Link href="/library" className="btn">Open a pack</Link>
      </div>
    );
  }

  const handleRate = async (rating: ReviewRating) => {
    await reviewPhrase(current.id, rating);
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
        <p className="text-lg">{current.meaningJa}</p>

        {revealed ? (
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <p className="text-lg font-medium">{current.text}</p>
            {current.examples[0] ? <p className="text-sm text-slate-600">{current.examples[0]}</p> : null}
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
