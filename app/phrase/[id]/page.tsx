"use client";

import { notFound, useParams } from "next/navigation";
import { contentService } from "@/lib/content";
import { progressStore } from "@/lib/progressStore";
import { useProgress } from "@/lib/useProgress";

export default function PhraseDetailPage() {
  const params = useParams<{ id: string }>();
  const phrase = contentService.getPhrase(params.id);
  const { progress, update } = useProgress();

  if (!phrase) return notFound();
  if (!progress) return <p>Loading...</p>;

  const packs = contentService.getPacks().filter((pack) => pack.phraseIds.includes(phrase.id));
  const state = progress.phraseProgress[phrase.id];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{phrase.text}</h1>
      <section className="card space-y-1">
        <p className="text-sm text-slate-500">Core pattern</p>
        <p>{phrase.corePattern}</p>
        <p className="pt-2 text-sm text-slate-500">Meaning</p>
        <p>{phrase.meaningJa}</p>
        {phrase.notes && <p className="text-sm text-slate-600">{phrase.notes}</p>}
      </section>

      <section className="card space-y-2">
        <p className="font-medium">Variants</p>
        <ul className="list-disc pl-5 text-sm">
          {phrase.variants.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="font-medium">Contrast / Similar</p>
        <ul className="list-disc pl-5 text-sm">
          {phrase.contrasts.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="font-medium">Examples</p>
        <ul className="list-disc pl-5 text-sm">
          {phrase.examples.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="card space-y-2">
        <p className="font-medium">Appears in packs</p>
        <ul className="list-disc pl-5 text-sm">
          {packs.map((pack) => (
            <li key={pack.id}>{pack.title}</li>
          ))}
        </ul>
      </section>

      <section className="card space-y-2">
        <p className="font-medium">Status</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => update((draft) => progressStore.toggleSaved(draft, phrase.id))}>
            {state?.saved ? "Saved ✓" : "Save"}
          </button>
          <button className="btn-secondary" onClick={() => update((draft) => progressStore.toggleFlag(draft, phrase.id, "confusing"))}>
            {state?.confusing ? "Confusing ✓" : "Confusing"}
          </button>
          <button className="btn-secondary" onClick={() => update((draft) => progressStore.toggleFlag(draft, phrase.id, "wantToUse"))}>
            {state?.wantToUse ? "Want to use ✓" : "Want to use"}
          </button>
        </div>
      </section>
    </div>
  );
}
