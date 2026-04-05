"use client";

import { useEffect, useMemo } from "react";
import { progressStore } from "@/lib/progressStore";
import { useProgress } from "@/lib/useProgress";

export function useLearnerProgress() {
  const progressApi = useProgress();

  const duePhraseIds = useMemo(() => {
    if (!progressApi.progress) return [];
    return progressStore.getDuePhraseIds(progressApi.progress);
  }, [progressApi.progress]);

  const reviewDiagnostics = useMemo(() => {
    if (!progressApi.progress) {
      return {
        trackedPhraseCount: 0,
        dueCount: 0,
        hiddenCount: 0,
        notEligibleCount: 0,
        notDueCount: 0,
        eligibleCount: 0,
      };
    }
    return progressStore.getReviewDiagnostics(progressApi.progress);
  }, [progressApi.progress]);

  useEffect(() => {
    if (!progressApi.progress) return;
    console.info("[review-queue] built due ids", {
      duePhraseIds,
      diagnostics: reviewDiagnostics,
    });
  }, [duePhraseIds, progressApi.progress, reviewDiagnostics]);

  const dueCount = duePhraseIds.length;

  const recentPackProgress = useMemo(() => {
    if (!progressApi.progress) return [];
    return Object.values(progressApi.progress.packProgress)
      .filter((pack) => pack.lastOpenedAt)
      .sort((a, b) => (a.lastOpenedAt! < b.lastOpenedAt! ? 1 : -1));
  }, [progressApi.progress]);

  return {
    ...progressApi,
    duePhraseIds,
    dueCount,
    reviewDiagnostics,
    recentPackProgress,
  };
}
