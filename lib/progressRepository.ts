import { progressStore } from "@/lib/progressStore";
import { getAuthenticatedUser, hasSupabaseEnv, insertRows, selectRows } from "@/lib/supabase/client";
import { ReviewRating, UserProgressV1 } from "@/lib/types";

type ServerPhraseProgress = {
  phrase_id: string;
  state: "new" | "learning" | "review" | "mastered";
  due_at: string | null;
  last_reviewed_at: string | null;
  stability_score: number | null;
  easy_count: number;
  close_count: number;
  hard_count: number;
  favorite: boolean;
  confusing: boolean;
  want_to_use: boolean;
  hidden: boolean;
};

type ServerPackProgress = {
  pack_id: string;
  status: "new" | "in_progress" | "completed";
  last_opened_at: string | null;
};

const serverFallback = async () => ({
  user: null,
  enabled: false,
});

export async function loadProgress(): Promise<{ progress: UserProgressV1; source: "server" | "local" }> {
  const local = progressStore.ensureSeed(progressStore.load());
  if (!hasSupabaseEnv()) {
    return { progress: local, source: "local" };
  }

  const user = await getAuthenticatedUser();
  if (!user?.id) {
    return { progress: local, source: "local" };
  }

  try {
    const [phraseRows, packRows] = await Promise.all([
      selectRows<ServerPhraseProgress[]>(
        "user_phrase_progress",
        "select=phrase_id,state,due_at,last_reviewed_at,stability_score,easy_count,close_count,hard_count,favorite,confusing,want_to_use,hidden",
      ),
      selectRows<ServerPackProgress[]>("user_pack_progress", "select=pack_id,status,last_opened_at"),
    ]);

    const progress: UserProgressV1 = {
      version: 1,
      phraseProgress: {},
      packProgress: {},
      savedPhraseIds: [],
    };

    phraseRows.forEach((row) => {
      const saved = row.state !== "new";
      if (saved) {
        progress.savedPhraseIds.push(row.phrase_id);
      }

      progress.phraseProgress[row.phrase_id] = {
        phraseId: row.phrase_id,
        saved,
        dueAt: row.due_at ?? new Date().toISOString(),
        lastReviewedAt: row.last_reviewed_at ?? undefined,
        stability: Number(row.stability_score ?? 1),
        reviewState: row.state,
        easyCount: row.easy_count,
        closeCount: row.close_count,
        hardCount: row.hard_count,
        favorite: row.favorite,
        confusing: row.confusing,
        wantToUse: row.want_to_use,
        hidden: row.hidden,
      };
    });

    packRows.forEach((row) => {
      progress.packProgress[row.pack_id] = {
        packId: row.pack_id,
        completed: row.status === "completed",
        lastOpenedAt: row.last_opened_at ?? undefined,
      };
    });

    const hydrated = progressStore.ensureSeed(progress);
    progressStore.save(hydrated);
    return { progress: hydrated, source: "server" };
  } catch {
    return { progress: local, source: "local" };
  }
}

async function getUserOrFallback() {
  if (!hasSupabaseEnv()) return serverFallback();
  const user = await getAuthenticatedUser();
  if (!user?.id) return serverFallback();
  return { user, enabled: true };
}

function toServerState(saved: boolean, dueAt: string) {
  if (!saved) return "new";
  if (new Date(dueAt).getTime() <= Date.now()) return "review";
  return "learning";
}

export async function syncPackProgress(progress: UserProgressV1, packId: string, status: "in_progress" | "completed") {
  const { user, enabled } = await getUserOrFallback();
  if (!enabled || !user?.id) return;

  const pack = progress.packProgress[packId];
  await insertRows(
    "user_pack_progress",
    {
      user_id: user.id,
      pack_id: packId,
      status,
      last_opened_at: pack?.lastOpenedAt ?? new Date().toISOString(),
      started_at: pack?.lastOpenedAt ?? new Date().toISOString(),
      completed_at: status === "completed" ? new Date().toISOString() : null,
    },
    { query: "on_conflict=user_id,pack_id", upsert: true },
  );
}

export async function syncPhraseProgress(progress: UserProgressV1, phraseId: string) {
  const { user, enabled } = await getUserOrFallback();
  if (!enabled || !user?.id) return;

  const phrase = progress.phraseProgress[phraseId];
  const state = toServerState(Boolean(phrase?.saved), phrase?.dueAt ?? new Date().toISOString());
  await insertRows(
    "user_phrase_progress",
    {
      user_id: user.id,
      phrase_id: phraseId,
      state,
      due_at: phrase?.dueAt,
      last_reviewed_at: phrase?.lastReviewedAt ?? null,
      stability_score: phrase?.stability ?? 1,
      favorite: phrase?.favorite ?? false,
      confusing: phrase?.confusing ?? false,
      want_to_use: phrase?.wantToUse ?? false,
      hidden: phrase?.hidden ?? false,
    },
    { query: "on_conflict=user_id,phrase_id", upsert: true },
  );
}

export async function syncReview(progress: UserProgressV1, phraseId: string, rating: ReviewRating) {
  const { user, enabled } = await getUserOrFallback();
  if (!enabled || !user?.id) return;

  const phrase = progress.phraseProgress[phraseId];
  const payload = {
    user_id: user.id,
    phrase_id: phraseId,
    state: "review",
    due_at: phrase?.dueAt,
    last_reviewed_at: phrase?.lastReviewedAt ?? new Date().toISOString(),
    stability_score: phrase?.stability ?? 1,
    easy_count: (phrase?.easyCount ?? 0) + (rating === "easy" ? 1 : 0),
    close_count: (phrase?.closeCount ?? 0) + (rating === "close" ? 1 : 0),
    hard_count: (phrase?.hardCount ?? 0) + (rating === "hard" ? 1 : 0),
    favorite: phrase?.favorite ?? false,
    confusing: phrase?.confusing ?? false,
    want_to_use: phrase?.wantToUse ?? false,
    hidden: phrase?.hidden ?? false,
  };

  await insertRows("user_phrase_progress", payload, { query: "on_conflict=user_id,phrase_id", upsert: true });
}
