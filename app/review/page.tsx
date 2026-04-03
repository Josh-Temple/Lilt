"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { contentService } from "@/lib/content";
import { progressStore } from "@/lib/progressStore";
import { ReviewRating } from "@/lib/types";
import { useProgress } from "@/lib/useProgress";

type Mode = "meaning-to-phrase" | "phrase-to-meaning" | "cloze" | "variation";

const modes: Mode[] = ["meaning-to-phrase", "phrase-to-meaning", "cloze", "variation"];

export default function ReviewPage() {
  const { progress, update } = useProgress();
  const [index, setIndex] = useState(0);

  const queue = useMemo(() => {
    if (!progress) return [];
    const dueIds = progressStore.getDuePhraseIds(progress);
    return dueIds.map((id) => contentService.getPhrase(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [progress]);

  if (!progress) return <p>Loading...</p>;
  if (queue.length === 0) return <div className="section">No due items. Save phrases and come back soon.</div>;

  const phrase = queue[index % queue.length];
  const mode = modes[index % modes.length];
  const handleRate = (rating: ReviewRating) => {
    update((draft) => progressStore.review(draft, phrase.id, rating));
    setIndex((v) => v + 1);
  };

  return (
    <div>
      <header className="pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Review</h1>
        <p className="mt-2 text-sm text-slate-500">
          Due {queue.length} · #{index + 1}
        </p>
      </header>

      <section className="section space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{mode}</p>

        {mode === "meaning-to-phrase" && (
          <>
            <p className="text-lg">{phrase.meaningJa}</p>
            <p className="border-t border-slate-200 pt-3 text-slate-700">{phrase.text}</p>
          </>
        )}

        {mode === "phrase-to-meaning" && (
          <>
            <p className="text-lg">{phrase.text}</p>
            <p className="border-t border-slate-200 pt-3 text-slate-700">{phrase.meaningJa}</p>
          </>
        )}

        {mode === "cloze" && (
          <>
            <p className="text-lg">{phrase.examples[0].replace(/[A-Za-z]{4,}/, "____")}</p>
            <p className="border-t border-slate-200 pt-3 text-slate-700">{phrase.text}</p>
          </>
        )}

        {mode === "variation" && (
          <>
            <p className="text-lg">{phrase.text}</p>
            <p className="border-t border-slate-200 pt-3 text-slate-700">{phrase.variants[0] ?? "No variation yet"}</p>
          </>
        )}
      </section>

      <section className="section flex items-center justify-between px-8">
        <button className="btn" aria-label="Hard" onClick={() => handleRate("hard")}>
          <Icon name="flag" />
        </button>
        <button className="btn" aria-label="Close" onClick={() => handleRate("close")}>
          <Icon name="refresh" />
        </button>
        <button className="btn-primary" aria-label="Easy" onClick={() => handleRate("easy")}>
          <Icon name="spark" />
        </button>
      </section>
    </div>
  );
}
