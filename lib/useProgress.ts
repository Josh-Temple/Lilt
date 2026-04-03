"use client";

import { useEffect, useState } from "react";
import { progressStore } from "@/lib/progressStore";
import { UserProgressV1 } from "@/lib/types";

export function useProgress() {
  const [progress, setProgress] = useState<UserProgressV1 | null>(null);

  useEffect(() => {
    const loaded = progressStore.ensureSeed(progressStore.load());
    setProgress({ ...loaded });
  }, []);

  const update = (mutator: (draft: UserProgressV1) => UserProgressV1) => {
    setProgress((current) => {
      if (!current) return current;
      const cloned: UserProgressV1 = structuredClone(current);
      const next = mutator(cloned);
      return { ...next };
    });
  };

  return { progress, update };
}
