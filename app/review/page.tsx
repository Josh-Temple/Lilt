"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ReviewRating } from "@/lib/types";
import { useLearnerProgress } from "@/lib/useLearnerProgress";
import { usePhrasesByIds } from "@/lib/usePacks";

type ReviewMode = "meaning_to_phrase" | "phrase_to_meaning" | "cloze" | "context_to_phrase";

function lineContainsPhrase(line: string, phraseText: string) {
  const cleanPhrase = phraseText.replace("...", "").trim();
  if (!cleanPhrase) return false;
  return new RegExp(cleanPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(line);
}

function getReviewModes(contextLine: string | null, phraseText: string): ReviewMode[] {
  if (!contextLine) return ["meaning_to_phrase", "phrase_to_meaning"];
  if (!lineContainsPhrase(contextLine, phraseText)) {
    return ["meaning_to_phrase", "phrase_to_meaning", "context_to_phrase"];
  }
  return ["meaning_to_phrase", "phrase_to_meaning", "cloze", "context_to_phrase"];
}

function buildClozeLine(line: string, phraseText: string): string {
  const cleanPhrase = phraseText.replace("...", "").trim();
  if (!cleanPhrase) return line;
  const re = new RegExp(cleanPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return line.replace(re, "_____");
}

export default function ReviewPage() {
  const { progress, duePhraseIds, reviewPhrase } = useLearnerProgress();
  const { phrases: queue, loading } = usePhrasesByIds(duePhraseIds);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const current = useMemo(() => (queue.length ? queue[index % queue.length] : null), [index, queue]);
  const compactContext = current?.reviewContext?.transcriptExcerpt ?? current?.reviewContext?.example ?? null;
  const modeList = useMemo(
    () => getReviewModes(compactContext, current?.text ?? ""),
    [compactContext, current?.text],
  );
  const mode = modeList[index % modeList.length];

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

  const promptLabel =
    mode === "phrase_to_meaning"
      ? "Phrase"
      : mode === "cloze"
        ? "Cloze from pack"
        : mode === "context_to_phrase"
          ? "Context line"
          : "Meaning";

  const promptText =
    mode === "phrase_to_meaning"
      ? current.text
      : mode === "cloze" && compactContext
        ? buildClozeLine(compactContext, current.text)
        : mode === "context_to_phrase" && compactContext
          ? compactContext
          : current.meaningJa;

  return (
    <div>
      <header className="pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Review</h1>
        <p className="mt-2 text-sm text-slate-500">Due {queue.length} · Item {index + 1} · from studied packs</p>
      </header>

      <section className="section space-y-4">
        <div className="flex items-center justify-between gap-4 text-xs text-slate-500">
          <p className="uppercase tracking-[0.18em] text-slate-400">{promptLabel}</p>
          {current.reviewContext?.packTitle ? (
            <p className="truncate">from {current.reviewContext.packTitle}{current.reviewContext.packTopic ? ` · ${current.reviewContext.packTopic}` : ""}</p>
          ) : null}
        </div>
        <p className="text-lg">{promptText}</p>

        {revealed ? (
          <div className="space-y-2 border-t border-slate-200 pt-3">
            {mode === "phrase_to_meaning" ? (
              <p className="text-lg font-medium">{current.meaningJa}</p>
            ) : (
              <p className="text-lg font-medium">{current.text}</p>
            )}
            {mode !== "phrase_to_meaning" ? <p className="text-sm text-slate-600">{current.meaningJa}</p> : null}
            {current.reviewContext?.transcriptExcerpt ? (
              <p className="text-xs text-slate-500">Context: {current.reviewContext.transcriptExcerpt}</p>
            ) : current.examples[0] ? (
              <p className="text-xs text-slate-500">Example: {current.examples[0]}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              <Link href={`/phrase/${current.id}`} className="btn inline-flex">Phrase detail</Link>
              {current.reviewContext?.packId ? (
                <Link href={`/pack/${current.reviewContext.packId}`} className="btn inline-flex">Open source pack</Link>
              ) : null}
            </div>
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
