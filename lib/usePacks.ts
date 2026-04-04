"use client";

import { useEffect, useState } from "react";
import { learnerContentRepository, LearnerPhraseWithContext } from "@/lib/learnerContentRepository";
import { Pack } from "@/lib/types";

export function usePacks() {
  const [packs, setPacks] = useState<Pack[]>([]);

  useEffect(() => {
    let active = true;

    learnerContentRepository.getPublishedPacks().then((next) => {
      if (!active) return;
      setPacks(next);
    });

    return () => {
      active = false;
    };
  }, []);

  return packs;
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

    learnerContentRepository
      .getPhrasesByIds(ids)
      .then((items) => {
        if (!active) return;
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
