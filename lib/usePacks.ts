"use client";

import { useEffect, useState } from "react";
import { contentService } from "@/lib/content";
import { Pack, Phrase } from "@/lib/types";

export function usePacks() {
  const [packs, setPacks] = useState<Pack[]>(contentService.getPacks());

  useEffect(() => {
    let active = true;

    fetch("/api/packs")
      .then((res) => res.json())
      .then((json) => {
        if (!active || !Array.isArray(json.packs)) return;
        setPacks(json.packs as Pack[]);
      })
      .catch(() => {
        // keep local seed fallback
      });

    return () => {
      active = false;
    };
  }, []);

  return packs;
}

export function usePackDetail(id: string) {
  const [pack, setPack] = useState<Pack | null>(contentService.getPack(id) ?? null);
  const [phrases, setPhrases] = useState<Phrase[]>(contentService.getPhrasesByPack(id));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setLoading(true);
    fetch(`/api/packs/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (json.pack) {
          setPack(json.pack as Pack);
        }
        if (Array.isArray(json.phrases)) {
          setPhrases(json.phrases as Phrase[]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  return { pack, phrases, loading };
}
