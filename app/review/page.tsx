"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ReviewRating } from "@/lib/types";
import { useLearnerProgress } from "@/lib/useLearnerProgress";
import { usePhrasesByIds } from "@/lib/usePacks";

type ReviewMode = "meaning_to_phrase" | "phrase_to_meaning" | "cloze" | "context_to_phrase";
type SupportKind = "Transcript" | "Example" | "Note" | "Contrast";
type ReviewEmptyState = {
  title: string;
  description: string;
  cta: string;
  href: Route;
};

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

function pickSupportClue(current: NonNullable<ReturnType<typeof useReviewCardContext>["current"]>) {
  const transcript = current.reviewContext?.transcriptExcerpt?.trim();
  if (transcript) return { label: "Transcript" as SupportKind, text: transcript };

  const example = current.reviewContext?.example?.trim();
  if (example) return { label: "Example" as SupportKind, text: example };

  const note = current.reviewContext?.authoredNote?.trim();
  if (note) return { label: "Note" as SupportKind, text: note };

  const contrast = current.reviewContext?.authoredContrast?.trim();
  if (contrast) return { label: "Contrast" as SupportKind, text: contrast };

  return null;
}

function useReviewCardContext(queue: ReturnType<typeof usePhrasesByIds>["phrases"], index: number) {
  const current = useMemo(() => (queue.length ? queue[index % queue.length] : null), [index, queue]);
  const contextPromptLine = current?.reviewContext?.transcriptExcerpt ?? current?.reviewContext?.example ?? null;
  const modeList = useMemo(
    () => getReviewModes(contextPromptLine, current?.text ?? ""),
    [contextPromptLine, current?.text],
  );
  const mode = modeList[index % modeList.length];

  return { current, contextPromptLine, mode };
}

export default function ReviewPage() {
  const { progress, duePhraseIds, reviewPhrase, reviewDiagnostics } = useLearnerProgress();
  const { phrases: queue, loading } = usePhrasesByIds(duePhraseIds);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const { current, contextPromptLine, mode } = useReviewCardContext(queue, index);

  useEffect(() => {
    if (!progress || loading) return;
    console.info("[review-queue] render state", {
      duePhraseIds,
      resolvedQueueLength: queue.length,
      diagnostics: reviewDiagnostics,
      emptyReason:
        queue.length > 0
          ? null
          : reviewDiagnostics.eligibleCount === 0
            ? "no_eligible_phrases"
            : duePhraseIds.length > 0
              ? "due_items_unresolved"
              : "eligible_but_not_due",
    });
  }, [duePhraseIds, loading, progress, queue.length, reviewDiagnostics]);

  if (!progress || loading) return <p>Loading...</p>;
  if (!current) {
    const hasAnyEligible = reviewDiagnostics.eligibleCount > 0;
    const hasDueIds = duePhraseIds.length > 0;

    const emptyState: ReviewEmptyState = !hasAnyEligible
      ? {
          title: "No review items yet.",
          description: "Study a pack and save, mark confusing, or mark want-to-use on a phrase to start your review loop.",
          cta: "Open a pack",
          href: "/library" as Route,
        }
      : hasDueIds
        ? {
            title: "Review items are due, but content failed to load.",
            description: "Try reopening the source pack. If this persists, check review queue logs for unresolved phrase IDs.",
            cta: "Open a pack",
            href: "/library" as Route,
          }
        : {
            title: "Nothing due right now.",
            description: "You have saved/flagged phrases, but none are due yet.",
            cta: "Back to Home",
            href: "/" as Route,
          };

    return (
      <div className="section space-y-3">
        <p>{emptyState.title}</p>
        <p className="text-sm text-slate-500">{emptyState.description}</p>
        <Link href={emptyState.href} className="btn">{emptyState.cta}</Link>
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
      : mode === "cloze" && contextPromptLine
        ? buildClozeLine(contextPromptLine, current.text)
        : mode === "context_to_phrase" && contextPromptLine
          ? contextPromptLine
          : current.meaningJa;
  const supportClue = pickSupportClue(current);
  const hasPackTimingStart = current.packLink?.start_sec != null;
  const hasPackTimingEnd =
    typeof current.packLink?.start_sec === "number" &&
    typeof current.packLink?.end_sec === "number" &&
    current.packLink.end_sec > current.packLink.start_sec;
  const sourcePackTimingHint = !hasPackTimingStart
    ? "Phrase replay may be unavailable there, but transcript + full-pack audio still work."
    : hasPackTimingEnd
      ? "Phrase replay should be available in the source pack."
      : "Source pack replay may use an estimated phrase end.";

  return (
    <div>
      <header className="pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Review</h1>
        <p className="mt-2 text-sm text-slate-500">
          Due now {duePhraseIds.length} · Showing {queue.length} · Item {index + 1} · from studied packs
        </p>
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
            {supportClue ? (
              <p className="text-xs text-slate-500">
                {supportClue.label}: {supportClue.text}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              <Link href={`/phrase/${current.id}`} className="btn inline-flex">Phrase detail</Link>
              {current.reviewContext?.packId ? (
                <Link href={`/pack/${current.reviewContext.packId}?phrase=${current.id}`} className="btn inline-flex">Open source pack</Link>
              ) : null}
            </div>
            {current.reviewContext?.packId ? (
              <p className="text-xs text-slate-500">{sourcePackTimingHint}</p>
            ) : null}
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
