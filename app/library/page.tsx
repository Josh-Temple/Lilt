"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useProgress } from "@/lib/useProgress";
import { usePacks } from "@/lib/usePacks";

export default function LibraryPage() {
  const packs = usePacks();
  const { progress } = useProgress();
  const [level, setLevel] = useState("all");
  const [topic, setTopic] = useState("all");
  const [query, setQuery] = useState("");

  const topics = Array.from(new Set(packs.map((pack) => pack.topic)));

  const filtered = useMemo(() => {
    return packs.filter((pack) => {
      const matchesLevel = level === "all" || pack.level === level;
      const matchesTopic = topic === "all" || pack.topic === topic;
      const matchesQuery =
        query.trim().length === 0 ||
        pack.title.toLowerCase().includes(query.toLowerCase()) ||
        pack.tags.join(" ").toLowerCase().includes(query.toLowerCase());
      return matchesLevel && matchesTopic && matchesQuery;
    });
  }, [level, packs, query, topic]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Library</h1>

      <div className="card space-y-2">
        <input
          className="w-full rounded-lg border p-2"
          placeholder="Search packs"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <select className="rounded-lg border p-2" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="all">All levels</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
          </select>
          <select className="rounded-lg border p-2" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="all">All topics</option>
            {topics.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((pack) => {
          const completed = progress?.packProgress[pack.id]?.completed;
          const savedCount = pack.phraseIds.filter((id) => progress?.phraseProgress[id]?.saved).length;

          return (
            <Link href={`/pack/${pack.id}`} key={pack.id} className="card block">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium">{pack.title}</h2>
                <span className="text-xs text-slate-500">{pack.level}</span>
              </div>
              <p className="text-sm text-slate-600">{pack.topic}</p>
              <p className="mt-1 text-xs text-slate-500">
                Saved {savedCount}/{pack.phraseIds.length} · {completed ? "Completed" : "In progress"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
