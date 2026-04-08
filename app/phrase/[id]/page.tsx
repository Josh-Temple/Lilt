"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useLearnerProgress } from "@/lib/useLearnerProgress";
import { usePhraseDetail } from "@/lib/usePacks";

export default function PhraseDetailPage() {
  const params = useParams<{ id: string }>();
  const { phrase, loading } = usePhraseDetail(params.id);
  const { progress, toggleSaved, toggleFlag, dueCount } = useLearnerProgress();

  if (!phrase && !loading) return notFound();
  if (!progress || !phrase) return <p>Loading...</p>;

  const state = progress.phraseProgress[phrase.id];
  const dueLabel = state?.dueAt ? new Date(state.dueAt).toLocaleString() : "Not scheduled";
  const hasTimingStart = phrase.packLink?.start_sec != null;
  const hasTimingEnd =
    typeof phrase.packLink?.start_sec === "number" &&
    typeof phrase.packLink?.end_sec === "number" &&
    phrase.packLink.end_sec > phrase.packLink.start_sec;
  const timingLabel = hasTimingStart
    ? hasTimingEnd
      ? "Phrase replay is available from this phrase's source pack."
      : "Phrase replay from the source pack uses an estimated end for this phrase."
    : "Phrase replay is unavailable for this phrase because timing data is missing. You can still use the source pack audio and transcript context.";

  return (
    <div>
      <header className="pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{phrase.text}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {state?.saved ? "Saved" : "Not saved"} · {state?.reviewState ?? "new"} · due {dueLabel}
        </p>
      </header>

      <section className="section text-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Meaning</p>
        <p className="mt-1">{phrase.meaningJa}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">Core pattern</p>
        <p className="mt-1">{phrase.corePattern}</p>
      </section>

      <section className="section text-sm">
        {!!phrase.examples.length && (
          <>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Examples</p>
            <ul className="space-y-1">
              {phrase.examples.slice(0, 3).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </>
        )}

        {!!phrase.variants.length && (
          <>
            <p className="mb-2 mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">Variants</p>
            <ul className="space-y-1">
              {phrase.variants.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </>
        )}

        {!!phrase.contrasts.length && (
          <>
            <p className="mb-2 mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">Contrast / Similar</p>
            <ul className="space-y-1">
              {phrase.contrasts.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </>
        )}

        {phrase.notes ? <p className="mt-4 text-slate-600">{phrase.notes}</p> : null}
      </section>

      <section className="section">
        <div className="flex gap-4 text-slate-600">
          <button className="btn" aria-label="Save" onClick={() => toggleSaved(phrase.id)}>
            <Icon name="bookmark" className={state?.saved ? "h-4 w-4 text-ink" : "h-4 w-4"} />
          </button>
          <button className="btn" aria-label="Confusing" onClick={() => toggleFlag(phrase.id, "confusing")}>
            <Icon name="flag" className={state?.confusing ? "h-4 w-4 text-ink" : "h-4 w-4"} />
          </button>
          <button className="btn" aria-label="Want to use" onClick={() => toggleFlag(phrase.id, "wantToUse")}>
            <Icon name="spark" className={state?.wantToUse ? "h-4 w-4 text-ink" : "h-4 w-4"} />
          </button>
        </div>
      </section>

      <section className="section space-y-2 text-sm">
        {phrase.linkedPacks[0] ? (
          <p className="text-xs text-slate-500">
            Origin: {phrase.linkedPacks[0].title}
            {phrase.linkedPacks[0].topic ? ` · ${phrase.linkedPacks[0].topic}` : ""}
          </p>
        ) : null}
        <p className="text-xs text-slate-500">
          {timingLabel}
        </p>
        <Link href="/review" className="btn inline-flex">Continue review ({dueCount})</Link>
        {phrase.linkedPacks[0] ? <Link href={`/pack/${phrase.linkedPacks[0].id}`} className="btn inline-flex">Back to pack: {phrase.linkedPacks[0].title}</Link> : null}
      </section>
    </div>
  );
}
