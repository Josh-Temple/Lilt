"use client";

import { useMemo } from "react";
import { progressStore } from "@/lib/progressStore";
import { useProgress } from "@/lib/useProgress";

export function useLearnerProgress() {
  const progressApi = useProgress();

  const duePhraseIds = useMemo(() => {
    if (!progressApi.progress) return [];
    return progressStore.getDuePhraseIds(progressApi.progress);
  }, [progressApi.progress]);

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
    recentPackProgress,
  };
}
