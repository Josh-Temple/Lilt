"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
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
    <div>
      <header className="pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
      </header>

      <section className="section-tight space-y-4">
        <label className="flex items-center gap-2 text-slate-500">
          <Icon name="search" />
          <input
            className="field"
            placeholder="Search packs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1 text-slate-500">
            <span className="inline-flex"><Icon name="level" /></span>
            <select className="field" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="all">All levels</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
            </select>
          </label>

          <label className="space-y-1 text-slate-500">
            <span className="inline-flex"><Icon name="topic" /></span>
            <select className="field" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="all">All topics</option>
              {topics.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="section-tight divide-y divide-slate-100">
        {filtered.map((pack) => {
          const completed = progress?.packProgress[pack.id]?.completed;
          const savedCount = pack.phraseIds.filter((id) => progress?.phraseProgress[id]?.saved).length;

          return (
            <Link href={`/pack/${pack.id}`} key={pack.id} className="block py-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium tracking-tight">{pack.title}</h2>
                <span className="text-xs tracking-[0.15em] text-slate-400">{pack.level}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{pack.topic}</p>
              <p className="mt-2 text-xs text-slate-400">
                {savedCount}/{pack.phraseIds.length} · {completed ? "Complete" : "Progress"}
              </p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
