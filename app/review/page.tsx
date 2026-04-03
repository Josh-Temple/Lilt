"use client";

import { useMemo, useState } from "react";
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
    return dueIds
      .map((id) => contentService.getPhrase(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [progress]);

  if (!progress) return <p>Loading...</p>;
  if (queue.length === 0) return <div className="card">No due items. Save phrases and come back soon.</div>;

  const phrase = queue[index % queue.length];
  const mode = modes[index % modes.length];
  const handleRate = (rating: ReviewRating) => {
    update((draft) => progressStore.review(draft, phrase.id, rating));
    setIndex((v) => v + 1);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Review</h1>
      <p className="text-sm text-slate-600">
        Due: {queue.length} · Card {index + 1}
      </p>

      <section className="card space-y-3">
        {mode === "meaning-to-phrase" && (
          <>
            <p className="text-xs uppercase text-slate-500">Meaning → Phrase</p>
            <p className="text-lg">{phrase.meaningJa}</p>
            <p className="text-sm text-slate-500">Think of the English phrase, then reveal below.</p>
            <p className="rounded-lg bg-slate-100 p-3">{phrase.text}</p>
          </>
        )}

        {mode === "phrase-to-meaning" && (
          <>
            <p className="text-xs uppercase text-slate-500">Phrase → Meaning</p>
            <p className="text-lg">{phrase.text}</p>
            <p className="rounded-lg bg-slate-100 p-3">{phrase.meaningJa}</p>
          </>
        )}

        {mode === "cloze" && (
          <>
            <p className="text-xs uppercase text-slate-500">Cloze</p>
            <p className="text-lg">{phrase.examples[0].replace(/[A-Za-z]{4,}/, "____")}</p>
            <p className="rounded-lg bg-slate-100 p-3">Answer: {phrase.text}</p>
          </>
        )}

        {mode === "variation" && (
          <>
            <p className="text-xs uppercase text-slate-500">Variation check</p>
            <p className="text-lg">Base: {phrase.text}</p>
            <p className="rounded-lg bg-slate-100 p-3">Variation: {phrase.variants[0] ?? "No variation yet"}</p>
          </>
        )}
      </section>

      <section className="grid grid-cols-3 gap-2">
        <button className="btn-secondary" onClick={() => handleRate("hard")}>
          hard
        </button>
        <button className="btn-secondary" onClick={() => handleRate("close")}>
          close
        </button>
        <button className="btn-primary" onClick={() => handleRate("easy")}>
          easy
        </button>
      </section>
    </div>
  );
}
