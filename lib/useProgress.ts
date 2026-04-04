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
    await syncPackProgress(next, packId, "completed");
  }, [apply]);

  const toggleSaved = useCallback(async (phraseId: string) => {
    const next = apply((draft: UserProgressV1) => progressStore.toggleSaved(draft, phraseId));
    if (!next) return;
    await syncPhraseProgress(next, phraseId);
  }, [apply]);

  const toggleFlag = useCallback(async (phraseId: string, flag: "confusing" | "wantToUse" | "favorite") => {
    const next = apply((draft: UserProgressV1) => progressStore.toggleFlag(draft, phraseId, flag));
    if (!next) return;
    await syncPhraseProgress(next, phraseId);
  }, [apply]);

  const reviewPhrase = useCallback(async (phraseId: string, rating: ReviewRating) => {
    const next = apply((draft: UserProgressV1) => progressStore.review(draft, phraseId, rating));
    if (!next) return;
    await syncReview(next, phraseId, rating);
  }, [apply]);

  return {
    progress,
    source,
    markPackOpened,
    markPackCompleted,
    toggleSaved,
    toggleFlag,
    reviewPhrase,
  };
}
