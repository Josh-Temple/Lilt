"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { progressStore } from "@/lib/progressStore";
import { useProgress } from "@/lib/useProgress";
import { usePackDetail } from "@/lib/usePacks";

function highlightTranscript(transcript: string, needles: string[]) {
  let rendered = transcript;
  needles.forEach((needle) => {
    const plain = needle.replace("...", "").trim();
    if (!plain) return;
    rendered = rendered.replace(plain, `[[${plain}]]`);
  });

  return rendered.split(/(\[\[.*?\]\])/g).map((chunk, idx) => {
    if (chunk.startsWith("[[") && chunk.endsWith("]]")) {
      return (
        <mark className="bg-yellow-100 px-1" key={idx}>
          {chunk.slice(2, -2)}
        </mark>
      );
    }
    return <span key={idx}>{chunk}</span>;
  });
}

export default function LearnPackPage() {
  const params = useParams<{ id: string }>();
  const { pack, phrases, loading } = usePackDetail(params.id);
  const { progress, update } = useProgress();
  const [showTranscript, setShowTranscript] = useState(true);

  if (!pack && !loading) return notFound();
  if (!progress || !pack) return <p>Loading...</p>;

  const toggleSaved = (phraseId: string) => update((draft) => progressStore.toggleSaved(draft, phraseId));
  const toggleConfusing = (phraseId: string) => update((draft) => progressStore.toggleFlag(draft, phraseId, "confusing"));
  const toggleWant = (phraseId: string) => update((draft) => progressStore.toggleFlag(draft, phraseId, "wantToUse"));

  return (
    <div>
      <header className="pb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Learn pack</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{pack.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{pack.topic}</p>
      </header>

      <section className="section space-y-4">
        <audio
          controls
          className="w-full"
          src={pack.audioUrl}
          onPlay={() => update((draft) => progressStore.setPackOpened(draft, pack.id))}
        />
        <button className="btn" onClick={() => setShowTranscript((current) => !current)}>
          <Icon name="eye" />
          <span>{showTranscript ? "Hide" : "Show"}</span>
        </button>
        {showTranscript && <p className="text-sm leading-7 text-slate-700">{highlightTranscript(pack.transcript, phrases.map((p) => p.text))}</p>}
      </section>

      <section className="section divide-y divide-slate-100">
        {phrases.map((phrase) => {
          const p = progress.phraseProgress[phrase.id];
          return (
            <article key={phrase.id} className="space-y-3 py-4">
              <Link href={`/phrase/${phrase.id}`} className="block text-lg font-medium tracking-tight">
                {phrase.text}
              </Link>
              <p className="text-sm text-slate-500">{phrase.meaningJa}</p>
              <div className="flex flex-wrap gap-4 text-slate-600">
                <button className="btn" aria-label="Save phrase" onClick={() => toggleSaved(phrase.id)}>
                  <Icon name="bookmark" className={p?.saved ? "h-4 w-4 text-ink" : "h-4 w-4"} />
                </button>
                <button className="btn" aria-label="Mark confusing" onClick={() => toggleConfusing(phrase.id)}>
                  <Icon name="flag" className={p?.confusing ? "h-4 w-4 text-ink" : "h-4 w-4"} />
                </button>
                <button className="btn" aria-label="Want to use" onClick={() => toggleWant(phrase.id)}>
                  <Icon name="spark" className={p?.wantToUse ? "h-4 w-4 text-ink" : "h-4 w-4"} />
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
