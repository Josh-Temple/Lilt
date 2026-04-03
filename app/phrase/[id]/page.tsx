"use client";

import { notFound, useParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
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
    <div>
      <header className="pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{phrase.text}</h1>
      </header>

      <section className="section space-y-2 text-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Core pattern</p>
        <p>{phrase.corePattern}</p>
        <p className="pt-3 text-xs uppercase tracking-[0.18em] text-slate-400">Meaning</p>
        <p>{phrase.meaningJa}</p>
        {phrase.notes && <p className="text-slate-500">{phrase.notes}</p>}
      </section>

      <section className="section text-sm">
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Variants</p>
        <ul className="space-y-1">
          {phrase.variants.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
        <p className="mb-2 mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">Contrast / Similar</p>
        <ul className="space-y-1">
          {phrase.contrasts.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>

      <section className="section text-sm">
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Appears in</p>
        <ul className="space-y-1 text-slate-600">
          {packs.map((pack) => (
            <li key={pack.id}>{pack.title}</li>
          ))}
        </ul>
      </section>

      <section className="section">
        <div className="flex gap-6 text-slate-600">
          <button className="btn" aria-label="Save" onClick={() => update((draft) => progressStore.toggleSaved(draft, phrase.id))}>
            <Icon name="bookmark" className={state?.saved ? "h-4 w-4 text-ink" : "h-4 w-4"} />
          </button>
          <button
            className="btn"
            aria-label="Confusing"
            onClick={() => update((draft) => progressStore.toggleFlag(draft, phrase.id, "confusing"))}
          >
            <Icon name="flag" className={state?.confusing ? "h-4 w-4 text-ink" : "h-4 w-4"} />
          </button>
          <button
            className="btn"
            aria-label="Want to use"
            onClick={() => update((draft) => progressStore.toggleFlag(draft, phrase.id, "wantToUse"))}
          >
            <Icon name="spark" className={state?.wantToUse ? "h-4 w-4 text-ink" : "h-4 w-4"} />
          </button>
        </div>
      </section>
    </div>
  );
}
