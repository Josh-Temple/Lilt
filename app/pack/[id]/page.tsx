"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { contentService } from "@/lib/content";
import { progressStore } from "@/lib/progressStore";
import { useProgress } from "@/lib/useProgress";

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
        <mark className="rounded bg-yellow-200 px-1" key={idx}>
          {chunk.slice(2, -2)}
        </mark>
      );
    }
    return <span key={idx}>{chunk}</span>;
  });
}

export default function LearnPackPage() {
  const params = useParams<{ id: string }>();
  const pack = contentService.getPack(params.id);
  const phrases = useMemo(() => contentService.getPhrasesByPack(params.id), [params.id]);
  const { progress, update } = useProgress();
  const [showTranscript, setShowTranscript] = useState(true);

  if (!pack) return notFound();
  if (!progress) return <p>Loading...</p>;

  const toggleSaved = (phraseId: string) => update((draft) => progressStore.toggleSaved(draft, phraseId));
  const toggleConfusing = (phraseId: string) => update((draft) => progressStore.toggleFlag(draft, phraseId, "confusing"));
  const toggleWant = (phraseId: string) => update((draft) => progressStore.toggleFlag(draft, phraseId, "wantToUse"));

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-sm text-slate-500">Learn pack</p>
        <h1 className="text-2xl font-semibold">{pack.title}</h1>
        <p className="text-sm text-slate-600">{pack.topic}</p>
      </header>

      <section className="card space-y-3">
        <audio
          controls
          className="w-full"
          src={pack.audioUrl}
          onPlay={() => update((draft) => progressStore.setPackOpened(draft, pack.id))}
        />
        <button className="btn-secondary" onClick={() => setShowTranscript((current) => !current)}>
          {showTranscript ? "Hide transcript" : "Show transcript"}
        </button>
        {showTranscript && <p className="text-sm leading-7">{highlightTranscript(pack.transcript, phrases.map((p) => p.text))}</p>}
      </section>

      <section className="space-y-2">
        {phrases.map((phrase) => {
          const p = progress.phraseProgress[phrase.id];
          return (
            <article key={phrase.id} className="card space-y-2">
              <Link href={`/phrase/${phrase.id}`} className="block text-lg font-medium">
                {phrase.text}
              </Link>
              <p className="text-sm text-slate-600">{phrase.meaningJa}</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={() => toggleSaved(phrase.id)}>
                  {p?.saved ? "Unsave" : "Save phrase"}
                </button>
                <button className="btn-secondary" onClick={() => toggleConfusing(phrase.id)}>
                  {p?.confusing ? "Confusing ✓" : "Mark confusing"}
                </button>
                <button className="btn-secondary" onClick={() => toggleWant(phrase.id)}>
                  {p?.wantToUse ? "Want to use ✓" : "Want to use"}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
