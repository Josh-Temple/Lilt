"use client";

import { contentService } from "@/lib/content";
import { PackProgress, PhraseProgress, ReviewRating, UserProgressV1 } from "@/lib/types";
import { scheduleNextReview } from "@/lib/reviewScheduler";

const STORAGE_KEY = "lilt-progress";
const CURRENT_VERSION = 1;

const emptyProgress = (): UserProgressV1 => ({
  version: CURRENT_VERSION,
  phraseProgress: {},
  packProgress: {},
  savedPhraseIds: [],
});

const initPhraseProgress = (phraseId: string): PhraseProgress => ({
  phraseId,
  saved: false,
  dueAt: new Date().toISOString(),
  stability: 1,
  reviewState: "new",
  easyCount: 0,
  closeCount: 0,
  hardCount: 0,
  favorite: false,
  confusing: false,
  wantToUse: false,
  hidden: false,
});

const initPackProgress = (packId: string): PackProgress => ({
  packId,
  completed: false,
});

function isReviewEligible(item: Pick<PhraseProgress, "saved" | "confusing" | "wantToUse">) {
  return Boolean(item.saved || item.confusing || item.wantToUse);
}

const migrate = (raw: unknown): UserProgressV1 => {
  if (!raw || typeof raw !== "object") return emptyProgress();
  const candidate = raw as Partial<UserProgressV1>;
  if (candidate.version !== 1) return emptyProgress();

  return {
    version: 1,
    phraseProgress: candidate.phraseProgress ?? {},
    packProgress: candidate.packProgress ?? {},
    savedPhraseIds: candidate.savedPhraseIds ?? [],
  };
};

export const progressStore = {
  load(): UserProgressV1 {
    if (typeof window === "undefined") return emptyProgress();
    const text = window.localStorage.getItem(STORAGE_KEY);
    if (!text) return emptyProgress();

    try {
      return migrate(JSON.parse(text));
    } catch {
      return emptyProgress();
    }
  },

  save(progress: UserProgressV1) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  },

  reset() {
    const next = emptyProgress();
    this.save(next);
    return next;
  },

  setPackOpened(progress: UserProgressV1, packId: string) {
    const existing = progress.packProgress[packId] ?? initPackProgress(packId);
    progress.packProgress[packId] = { ...existing, lastOpenedAt: new Date().toISOString() };
    this.save(progress);
    return progress;
  },

  toggleSaved(progress: UserProgressV1, phraseId: string) {
    const base = progress.phraseProgress[phraseId] ?? initPhraseProgress(phraseId);
    const nextSaved = !base.saved;
    progress.phraseProgress[phraseId] = { ...base, saved: nextSaved, reviewState: nextSaved ? "learning" : "new" };

    if (nextSaved && !progress.savedPhraseIds.includes(phraseId)) {
      progress.savedPhraseIds.push(phraseId);
    }
    if (!nextSaved) {
      progress.savedPhraseIds = progress.savedPhraseIds.filter((id) => id !== phraseId);
    }

    this.save(progress);
    return progress;
  },

  toggleFlag(progress: UserProgressV1, phraseId: string, flag: "confusing" | "wantToUse" | "favorite") {
    const base = progress.phraseProgress[phraseId] ?? initPhraseProgress(phraseId);
    const nextValue = !base[flag];
    const next: PhraseProgress = { ...base, [flag]: nextValue };

    if ((flag === "confusing" || flag === "wantToUse") && nextValue) {
      next.dueAt = new Date().toISOString();
      next.reviewState = next.reviewState === "new" ? "learning" : next.reviewState;
    }

    progress.phraseProgress[phraseId] = next;
    this.save(progress);
    return progress;
  },

  review(progress: UserProgressV1, phraseId: string, rating: ReviewRating) {
    const base = progress.phraseProgress[phraseId] ?? initPhraseProgress(phraseId);
    const next = scheduleNextReview(
      { dueAt: base.dueAt, stability: base.stability, lastReviewedAt: base.lastReviewedAt },
      rating,
    );

    progress.phraseProgress[phraseId] = {
      ...base,
      ...next,
      saved: true,
      reviewState: "review",
      easyCount: (base.easyCount ?? 0) + (rating === "easy" ? 1 : 0),
      closeCount: (base.closeCount ?? 0) + (rating === "close" ? 1 : 0),
      hardCount: (base.hardCount ?? 0) + (rating === "hard" ? 1 : 0),
    };
    if (!progress.savedPhraseIds.includes(phraseId)) {
      progress.savedPhraseIds.push(phraseId);
    }
    this.save(progress);
    return progress;
  },

  export(progress: UserProgressV1) {
    return JSON.stringify(progress, null, 2);
  },

  import(text: string) {
    const parsed = JSON.parse(text);
    const migrated = migrate(parsed);
    this.save(migrated);
    return migrated;
  },

  getDuePhraseIds(progress: UserProgressV1) {
    const now = Date.now();
    return Object.values(progress.phraseProgress)
      .filter((item) => isReviewEligible(item) && !item.hidden && new Date(item.dueAt).getTime() <= now)
      .map((item) => item.phraseId);
  },

  getReviewDiagnostics(progress: UserProgressV1) {
    const now = Date.now();
    let hiddenCount = 0;
    let notEligibleCount = 0;
    let notDueCount = 0;
    let dueCount = 0;

    Object.values(progress.phraseProgress).forEach((item) => {
      if (!isReviewEligible(item)) {
        notEligibleCount += 1;
        return;
      }
      if (item.hidden) {
        hiddenCount += 1;
        return;
      }
      if (new Date(item.dueAt).getTime() > now) {
        notDueCount += 1;
        return;
      }
      dueCount += 1;
    });

    return {
      trackedPhraseCount: Object.keys(progress.phraseProgress).length,
      dueCount,
      hiddenCount,
      notEligibleCount,
      notDueCount,
      eligibleCount: dueCount + notDueCount + hiddenCount,
    };
  },

  ensureSeed(progress: UserProgressV1) {
    const phrases = contentService.getAll().phrases;
    phrases.forEach((phrase) => {
      if (!progress.phraseProgress[phrase.id]) progress.phraseProgress[phrase.id] = initPhraseProgress(phrase.id);
    });

    contentService.getPacks().forEach((pack) => {
      if (!progress.packProgress[pack.id]) progress.packProgress[pack.id] = initPackProgress(pack.id);
    });

    this.save(progress);
    return progress;
  },
};
