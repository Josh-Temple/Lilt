"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { progressStore } from "@/lib/progressStore";
import { useProgress } from "@/lib/useProgress";
import { usePackDetail } from "@/lib/usePacks";
import { Phrase } from "@/lib/types";

type PhraseWithLink = Phrase & {
  packLink?: {
    start_char_index?: number | null;
    end_char_index?: number | null;
    start_sec?: number | null;
    end_sec?: number | null;
  };
};

type RenderContext = {
  focusedId: string | null;
  phraseState: Record<string, { saved: boolean; confusing: boolean }>;
  onFocus: (phraseId: string) => void;
};

function phraseMarkClass(state: { saved: boolean; confusing: boolean }, focused: boolean) {
  if (focused) return "bg-slate-900 text-white";
  if (state.confusing) return "bg-rose-100 text-rose-800";
  if (state.saved) return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

function renderTranscript(transcript: string, phrases: PhraseWithLink[], context: RenderContext) {
  const ranges = phrases
    .map((phrase) => ({
      phraseId: phrase.id,
      start: phrase.packLink?.start_char_index ?? null,
      end: phrase.packLink?.end_char_index ?? null,
    }))
    .filter((item) => typeof item.start === "number" && typeof item.end === "number" && item.end > item.start)
    .sort((a, b) => Number(a.start) - Number(b.start));

  if (!ranges.length) return transcript;

  const out: Array<string | ReactNode> = [];
  let cursor = 0;

  ranges.forEach((range, idx) => {
    const start = Number(range.start);
    const end = Number(range.end);
    if (start < cursor) return;

    out.push(transcript.slice(cursor, start));

    const state = context.phraseState[range.phraseId] ?? { saved: false, confusing: false };
    const focused = context.focusedId === range.phraseId;

    out.push(
      <button
        key={`${range.phraseId}-${idx}`}
        className={`rounded px-1 transition ${phraseMarkClass(state, focused)}`}
        onClick={() => context.onFocus(range.phraseId)}
      >
        {transcript.slice(start, end)}
      </button>,
    );

    cursor = end;
  });

  if (cursor < transcript.length) out.push(transcript.slice(cursor));
  return out;
}

export default function LearnPackPage() {
  const params = useParams<{ id: string }>();
  const { pack, phrases, loading } = usePackDetail(params.id);
  const { progress, markPackOpened, markPackCompleted, toggleSaved, toggleFlag } = useProgress();

  const [showTranscript, setShowTranscript] = useState(true);
  const [studyMode, setStudyMode] = useState(true);
  const [openedPackId, setOpenedPackId] = useState<string | null>(null);
  const [focusedPhraseId, setFocusedPhraseId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const replayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const packId = pack?.id;
    if (!packId) return;
    if (openedPackId !== packId) {
      markPackOpened(packId).catch(() => undefined);
      setOpenedPackId(packId);
    }
  }, [markPackOpened, openedPackId, pack?.id]);

  useEffect(() => {
    if (!focusedPhraseId && phrases.length > 0) {
      setFocusedPhraseId(phrases[0].id);
    }
  }, [focusedPhraseId, phrases]);

  useEffect(() => {
    return () => {
      if (replayTimeoutRef.current) {
        clearTimeout(replayTimeoutRef.current);
      }
    };
  }, []);
  const phraseList = phrases as PhraseWithLink[];

  const transcript = useMemo(() => {
    if (!pack || !progress) return "";

    const phraseState = Object.fromEntries(
      phraseList.map((phrase) => [
        phrase.id,
        {
          saved: Boolean(progress.phraseProgress[phrase.id]?.saved),
          confusing: Boolean(progress.phraseProgress[phrase.id]?.confusing),
        },
      ]),
    );

    return renderTranscript(pack.transcript, phraseList, {
      focusedId: focusedPhraseId,
      phraseState,
      onFocus: (phraseId) => setFocusedPhraseId(phraseId),
    });
  }, [focusedPhraseId, pack?.transcript, phraseList, progress?.phraseProgress]);

  if (!pack && !loading) return notFound();
  if (!progress || !pack) return <p>Loading...</p>;

  const dueCount = progressStore.getDuePhraseIds(progress).length;
  const packState = progress.packProgress[pack.id];
  const statusLabel = packState?.completed ? "completed" : packState?.lastOpenedAt ? "in progress" : "new";
  const focusedPhrase = phraseList.find((item) => item.id === focusedPhraseId) ?? null;

  const jumpToFocused = (replay = false) => {
    if (!focusedPhrase?.packLink?.start_sec || !audioRef.current) return;

    const startSec = Number(focusedPhrase.packLink.start_sec);
    const endSec = Number(focusedPhrase.packLink.end_sec ?? startSec + 2.5);
    const safeStart = Math.max(0, startSec - (replay ? 0.5 : 0));
    const safeDuration = Math.min(8, Math.max(1.2, endSec - safeStart + (replay ? 0.5 : 0)));

    audioRef.current.currentTime = safeStart;
    audioRef.current.play().catch(() => undefined);

    if (replayTimeoutRef.current) clearTimeout(replayTimeoutRef.current);
    if (replay) {
      replayTimeoutRef.current = setTimeout(() => {
        audioRef.current?.pause();
      }, safeDuration * 1000);
    }
  };

  return (
    <div>
      <header className="pb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Learn pack</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{pack.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{pack.topic} · {statusLabel}</p>
      </header>

      <section className="section space-y-4">
        {pack.audioUrl ? (
          <audio ref={audioRef} controls className="w-full" src={pack.audioUrl} onPlay={() => markPackOpened(pack.id)} />
        ) : (
          <p className="text-sm text-slate-500">Audio unavailable for this pack.</p>
        )}

        <div className="flex flex-wrap gap-3">
          <button className="btn" onClick={() => setShowTranscript((current) => !current)}>
            <Icon name="eye" />
            <span>{showTranscript ? "Hide transcript" : "Show transcript"}</span>
          </button>
          <button className="btn" onClick={() => setStudyMode((current) => !current)}>
            <Icon name="audio" />
            <span>{studyMode ? "Show phrase list" : "Study mode"}</span>
          </button>
          <Link href="/review" className="btn">
            <Icon name="review" />
            <span>Review due ({dueCount})</span>
          </Link>
        </div>

        {showTranscript ? <p className="text-sm leading-7 text-slate-700">{transcript}</p> : null}
      </section>

      {focusedPhrase ? (
        <section className="section space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Focused phrase</p>
          <p className="text-lg font-medium">{focusedPhrase.text}</p>
          <p className="text-sm text-slate-600">{focusedPhrase.meaningJa}</p>
          {focusedPhrase.notes ? <p className="text-sm text-slate-500">{focusedPhrase.notes}</p> : null}

          <div className="flex flex-wrap gap-4 text-slate-600">
            <button className="btn" aria-label="Save phrase" onClick={() => toggleSaved(focusedPhrase.id)}>
              <Icon
                name="bookmark"
                className={progress.phraseProgress[focusedPhrase.id]?.saved ? "h-4 w-4 text-ink" : "h-4 w-4"}
              />
            </button>
            <button className="btn" aria-label="Mark confusing" onClick={() => toggleFlag(focusedPhrase.id, "confusing")}>
              <Icon
                name="flag"
                className={progress.phraseProgress[focusedPhrase.id]?.confusing ? "h-4 w-4 text-ink" : "h-4 w-4"}
              />
            </button>
            <button className="btn" aria-label="Want to use" onClick={() => toggleFlag(focusedPhrase.id, "wantToUse")}>
              <Icon
                name="spark"
                className={progress.phraseProgress[focusedPhrase.id]?.wantToUse ? "h-4 w-4 text-ink" : "h-4 w-4"}
              />
            </button>
            <Link href={`/phrase/${focusedPhrase.id}`} className="btn">Detail</Link>
          </div>

          {focusedPhrase.packLink?.start_sec != null ? (
            <div className="flex flex-wrap gap-3">
              <button className="btn" onClick={() => jumpToFocused(false)}>Jump to phrase</button>
              <button className="btn" onClick={() => jumpToFocused(true)}>Replay phrase</button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No phrase timing metadata for this item yet.</p>
          )}
        </section>
      ) : null}

      {!studyMode ? (
        <section className="section divide-y divide-slate-100">
          {phraseList.map((phrase) => {
            const p = progress.phraseProgress[phrase.id];
            const focused = focusedPhraseId === phrase.id;
            return (
              <article key={phrase.id} className={`space-y-3 py-4 ${focused ? "bg-slate-50/60" : ""}`}>
                <button className="block text-left text-lg font-medium tracking-tight" onClick={() => setFocusedPhraseId(phrase.id)}>
                  {phrase.text}
                </button>
                <p className="text-sm text-slate-500">{phrase.meaningJa}</p>
                <div className="flex flex-wrap gap-4 text-slate-600">
                  <button className="btn" aria-label="Save phrase" onClick={() => toggleSaved(phrase.id)}>
                    <Icon name="bookmark" className={p?.saved ? "h-4 w-4 text-ink" : "h-4 w-4"} />
                  </button>
                  <button className="btn" aria-label="Mark confusing" onClick={() => toggleFlag(phrase.id, "confusing")}>
                    <Icon name="flag" className={p?.confusing ? "h-4 w-4 text-ink" : "h-4 w-4"} />
                  </button>
                  <button className="btn" aria-label="Want to use" onClick={() => toggleFlag(phrase.id, "wantToUse")}>
                    <Icon name="spark" className={p?.wantToUse ? "h-4 w-4 text-ink" : "h-4 w-4"} />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      <section className="section flex flex-wrap gap-3">
        <button className="btn-primary" onClick={() => markPackCompleted(pack.id)}>
          Done for now
        </button>
        <Link href="/review" className="btn">Go to review</Link>
      </section>
    </div>
  );
}
