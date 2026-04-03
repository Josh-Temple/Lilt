import { ReviewRating } from "@/lib/types";

export type ReviewState = {
  dueAt: string;
  stability: number;
  lastReviewedAt?: string;
};

const DAY_MS = 86_400_000;

const intervalByRating: Record<ReviewRating, (stability: number) => number> = {
  hard: () => 1,
  close: (stability) => Math.max(2, Math.round(stability * 1.5)),
  easy: (stability) => Math.max(3, Math.round(stability * 2.2)),
};

const stabilityDelta: Record<ReviewRating, number> = {
  hard: -0.5,
  close: 0.4,
  easy: 0.9,
};

export function scheduleNextReview(state: ReviewState, rating: ReviewRating, now = new Date()): ReviewState {
  const nextStability = Math.max(0.8, state.stability + stabilityDelta[rating]);
  const days = intervalByRating[rating](nextStability);
  const dueAt = new Date(now.getTime() + days * DAY_MS).toISOString();

  return {
    dueAt,
    stability: Number(nextStability.toFixed(2)),
    lastReviewedAt: now.toISOString(),
  };
}
