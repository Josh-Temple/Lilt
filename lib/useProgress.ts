"use client";

import { useCallback, useEffect, useState } from "react";
import { loadProgress, syncPackProgress, syncPhraseProgress, syncReview } from "@/lib/progressRepository";
import { progressStore } from "@/lib/progressStore";
import { ReviewRating, UserProgressV1 } from "@/lib/types";

export function useProgress() {
  const [progress, setProgress] = useState<UserProgressV1 | null>(null);
  const [source, setSource] = useState<"local" | "server">("local");

  useEffect(() => {
    loadProgress().then(({ progress: loaded, source: loadedSource }) => {
      setProgress({ ...loaded });
      setSource(loadedSource);
    });
  }, []);

  const apply = useCallback((mutator: (draft: UserProgressV1) => UserProgressV1) => {
    if (!progress) return null;
    const cloned: UserProgressV1 = structuredClone(progress);
    const next = mutator(cloned);
    setProgress({ ...next });
    return next;
  }, [progress]);

  const markPackOpened = useCallback(async (packId: string) => {
    const next = apply((draft: UserProgressV1) => progressStore.setPackOpened(draft, packId));
    if (!next) return;
    console.info("[learner-progress] pack opened", {
      packId,
      duePhraseIds: progressStore.getDuePhraseIds(next),
    });
    await syncPackProgress(next, packId, "in_progress");
  }, [apply]);

  const markPackCompleted = useCallback(async (packId: string) => {
    const next = apply((draft: UserProgressV1) => {
      const updated = progressStore.setPackOpened(draft, packId);
      updated.packProgress[packId] = {
        ...updated.packProgress[packId],
        completed: true,
      };
      progressStore.save(updated);
      return updated;
    });
    if (!next) return;
    console.info("[learner-progress] pack completed", {
      packId,
      duePhraseIds: progressStore.getDuePhraseIds(next),
    });
    await syncPackProgress(next, packId, "completed");
  }, [apply]);

  const toggleSaved = useCallback(async (phraseId: string) => {
    const next = apply((draft: UserProgressV1) => progressStore.toggleSaved(draft, phraseId));
    if (!next) return;
    console.info("[learner-progress] toggled saved", {
      phraseId,
      phrase: next.phraseProgress[phraseId],
      duePhraseIds: progressStore.getDuePhraseIds(next),
    });
    await syncPhraseProgress(next, phraseId);
  }, [apply]);

  const toggleFlag = useCallback(async (phraseId: string, flag: "confusing" | "wantToUse" | "favorite") => {
    const next = apply((draft: UserProgressV1) => progressStore.toggleFlag(draft, phraseId, flag));
    if (!next) return;
    console.info("[learner-progress] toggled flag", {
      phraseId,
      flag,
      phrase: next.phraseProgress[phraseId],
      duePhraseIds: progressStore.getDuePhraseIds(next),
    });
    await syncPhraseProgress(next, phraseId);
  }, [apply]);

  const reviewPhrase = useCallback(async (phraseId: string, rating: ReviewRating) => {
    const next = apply((draft: UserProgressV1) => progressStore.review(draft, phraseId, rating));
    if (!next) return;
    console.info("[learner-progress] reviewed phrase", {
      phraseId,
      rating,
      phrase: next.phraseProgress[phraseId],
      duePhraseIds: progressStore.getDuePhraseIds(next),
    });
    await syncReview(next, phraseId, rating);
  }, [apply]);

  const update = useCallback((mutator: (draft: UserProgressV1) => UserProgressV1) => {
    const next = apply(mutator);
    if (!next) return null;
    progressStore.save(next);
    return next;
  }, [apply]);

  return {
    progress,
    source,
    update,
    markPackOpened,
    markPackCompleted,
    toggleSaved,
    toggleFlag,
    reviewPhrase,
  };
}
