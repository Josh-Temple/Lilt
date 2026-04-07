"use client";

import { useEffect, useState } from "react";
import { learnerContentRepository, LearnerPhraseWithContext, PackListDiagnostics } from "@/lib/learnerContentRepository";
import { getClientAccessToken } from "@/lib/supabase/http";
import { hasSupabaseEnv } from "@/lib/supabase/client";
import { Pack } from "@/lib/types";

export function usePacks() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<PackListDiagnostics & {
    hasSupabaseClientEnv: boolean;
    hasAccessToken: boolean;
    isStandalonePwa: boolean;
  }>({
    apiStatus: "ok",
    apiHttpStatus: null,
    apiError: null,
    usedFallback: false,
    hasSupabaseClientEnv: false,
    hasAccessToken: false,
    isStandalonePwa: false,
  });

  useEffect(() => {
    let active = true;

    learnerContentRepository.getPublishedPacksWithDiagnostics().then((result) => {
      if (!active) return;
      setPacks(result.packs);
      setDiagnostics({
        ...result.diagnostics,
        hasSupabaseClientEnv: hasSupabaseEnv(),
        hasAccessToken: Boolean(getClientAccessToken()),
        isStandalonePwa:
          typeof window !== "undefined" &&
          (window.matchMedia?.("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)),
      });
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  return { packs, loading, diagnostics };
}

export function usePackDetail(id: string) {
  const [pack, setPack] = useState<Pack | null>(null);
  const [phrases, setPhrases] = useState<LearnerPhraseWithContext[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    learnerContentRepository
      .getPackDetail(id)
      .then((detail) => {
        if (!active) return;
        setPack(detail.pack);
        setPhrases(detail.phrases.map((item) => ({ ...item, linkedPacks: [] })));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  return { pack, phrases, loading };
}

export function usePhraseDetail(id: string) {
  const [phrase, setPhrase] = useState<LearnerPhraseWithContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    learnerContentRepository
      .getPhraseDetail(id)
      .then((item) => {
        if (!active) return;
        setPhrase(item);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  return { phrase, loading };
}

export function usePhrasesByIds(ids: string[]) {
  const [phrases, setPhrases] = useState<LearnerPhraseWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const idsKey = ids.join("|");

  useEffect(() => {
    let active = true;
    setLoading(true);
    const requestedIds = idsKey ? idsKey.split("|") : [];

    learnerContentRepository
      .getPhrasesByIds(requestedIds)
      .then((items) => {
        if (!active) return;
        const resolvedIds = new Set(items.map((item) => item.id));
        const unresolvedIds = requestedIds.filter((id) => !resolvedIds.has(id));
        if (unresolvedIds.length > 0) {
          console.warn("[review-queue] unresolved phrase ids", {
            requestedCount: requestedIds.length,
            resolvedCount: items.length,
            unresolvedIds,
          });
        } else {
          console.info("[review-queue] resolved phrases", {
            requestedCount: requestedIds.length,
            resolvedCount: items.length,
          });
        }
        setPhrases(items);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [idsKey]);

  return { phrases, loading };
}
