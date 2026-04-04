"use client";

import { useEffect, useState } from "react";
import { Pack, Phrase } from "@/lib/types";

export function usePacks() {
  const [packs, setPacks] = useState<Pack[]>([]);

  useEffect(() => {
    let active = true;

    fetch("/api/packs")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        return res.json();
      })
      .then((json) => {
        if (!active || !Array.isArray(json.packs)) return;
        setPacks(json.packs as Pack[]);
      })
      .catch(() => {
        if (!active) return;
        setPacks([]);
      });

    return () => {
      active = false;
    };
  }, []);

  return packs;
}

export function usePackDetail(id: string) {
  const [pack, setPack] = useState<Pack | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setLoading(true);
    fetch(`/api/packs/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        return res.json();
      })
      .then((json) => {
        if (!active) return;
        if (json.pack) {
          setPack(json.pack as Pack);
        }
        if (Array.isArray(json.phrases)) {
          setPhrases(json.phrases as Phrase[]);
        }
      })
      .catch(() => {
        if (!active) return;
        setPack(null);
        setPhrases([]);
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
