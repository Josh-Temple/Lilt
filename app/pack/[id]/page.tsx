"use client";

import Link from "next/link";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { LearnerPhrase } from "@/lib/learnerContentRepository";
import { useLearnerProgress } from "@/lib/useLearnerProgress";
import { usePackDetail } from "@/lib/usePacks";

type PhraseWithLink = LearnerPhrase & {
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
  const searchParams = useSearchParams();
  const { pack, phrases, loading } = usePackDetail(params.id);
  const { progress, dueCount, markPackOpened, markPackCompleted, toggleSaved, toggleFlag } = useLearnerProgress();

  const [showTranscript, setShowTranscript] = useState(true);
  const [studyMode, setStudyMode] = useState(true);
  const [openedPackId, setOpenedPackId] = useState<string | null>(null);
  const [focusedPhraseId, setFocusedPhraseId] = useState<string | null>(null);
  const [activeAudioPhraseId, setActiveAudioPhraseId] = useState<string | null>(null);
  const [audioActionLabel, setAudioActionLabel] = useState<string | null>(null);
  const [timingReheardPhraseIds, setTimingReheardPhraseIds] = useState<string[]>([]);
  const [doneForNowAt, setDoneForNowAt] = useState<string | null>(null);

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
    const focusFromQuery = searchParams.get("phrase");
    if (focusFromQuery && phrases.some((item) => item.id === focusFromQuery)) {
      setFocusedPhraseId(focusFromQuery);
      return;
    }
    if (!focusedPhraseId && phrases.length > 0) {
      setFocusedPhraseId(phrases[0].id);
    }
  }, [focusedPhraseId, phrases, searchParams]);

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
  }, [focusedPhraseId, pack, phraseList, progress]);

  if (!pack && !loading) return notFound();
  if (!progress || !pack) return <p>Loading...</p>;

  const packState = progress.packProgress[pack.id];
  const statusLabel = packState?.completed ? "completed" : packState?.lastOpenedAt ? "in progress" : "new";
  const focusedPhrase = phraseList.find((item) => item.id === focusedPhraseId) ?? null;
  const focusedStartSec = focusedPhrase?.packLink?.start_sec;
  const focusedEndSec = focusedPhrase?.packLink?.end_sec;
  const hasFocusedTiming = focusedStartSec != null;
  const hasFocusedTimingEnd =
    typeof focusedStartSec === "number" && typeof focusedEndSec === "number" && focusedEndSec > focusedStartSec;
  const timingAvailability = hasFocusedTiming
    ? hasFocusedTimingEnd
      ? "full"
      : "partial"
    : "none";
  const focusedFromPhraseQuery = Boolean(searchParams.get("phrase"));
  const activeAudioPhrase = phraseList.find((item) => item.id === activeAudioPhraseId) ?? null;
  const canUsePhraseAudioActions = Boolean(pack.audioUrl && hasFocusedTiming);
  const savedFromPackCount = phraseList.filter((phrase) => progress.phraseProgress[phrase.id]?.saved).length;
  const flaggedFromPackCount = phraseList.filter((phrase) => {
    const phraseProgress = progress.phraseProgress[phrase.id];
    return Boolean(phraseProgress?.confusing || phraseProgress?.wantToUse);
  }).length;
  const reheardFromPackCount = timingReheardPhraseIds.length;
  const packInteractionPhraseIds = Array.from(
    new Set(
      phraseList
        .filter((phrase) => {
          const phraseProgress = progress.phraseProgress[phrase.id];
          return Boolean(
            phraseProgress?.saved ||
              phraseProgress?.confusing ||
              phraseProgress?.wantToUse ||
              timingReheardPhraseIds.includes(phrase.id),
          );
        })
        .map((phrase) => phrase.id),
    ),
  );
  const dueFromThisPackCount = phraseList.filter((phrase) => {
    const phraseProgress = progress.phraseProgress[phrase.id];
    if (!phraseProgress) return false;
    const isEligible = phraseProgress.saved || phraseProgress.confusing || phraseProgress.wantToUse;
    if (!isEligible || phraseProgress.hidden) return false;
    return new Date(phraseProgress.dueAt).getTime() <= Date.now();
  }).length;
  const hasReviewNextNudge = packInteractionPhraseIds.length > 0;
  const reviewNextLabel =
    dueFromThisPackCount > 0
      ? `Review ${dueFromThisPackCount} phrase${dueFromThisPackCount > 1 ? "s" : ""} from this pack`
      : "Review this next";

  const formatSecLabel = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

  const clearReplayTimer = () => {
    if (replayTimeoutRef.current) {
      clearTimeout(replayTimeoutRef.current);
      replayTimeoutRef.current = null;
    }
  };

  const playFocusedWindow = ({
    leadInSec,
    leadOutSec,
    repeatCount = 1,
    label,
  }: {
    leadInSec: number;
    leadOutSec: number;
    repeatCount?: number;
    label: string;
  }) => {
    if (focusedStartSec == null || !audioRef.current) return;

    const startSec = Number(focusedStartSec);
    const endSec = Number(focusedEndSec ?? startSec + 2.5);
    const safeStart = Math.max(0, startSec - leadInSec);
    const safeEnd = Math.max(safeStart + 1.1, endSec + leadOutSec);
    const safeDuration = Math.min(10, safeEnd - safeStart);
    const segmentDurationMs = Math.max(1100, safeDuration * 1000);
    const loops = Math.max(1, repeatCount);
    if (focusedPhrase?.id) {
      setTimingReheardPhraseIds((current) => (current.includes(focusedPhrase.id) ? current : [...current, focusedPhrase.id]));
    }

    clearReplayTimer();
    setAudioActionLabel(label);
    audioRef.current.currentTime = safeStart;
    audioRef.current.play().catch(() => undefined);

    if (loops === 1) {
      replayTimeoutRef.current = setTimeout(() => {
        audioRef.current?.pause();
        setAudioActionLabel(null);
      }, segmentDurationMs);
      return;
    }

    let loopIndex = 1;
    const tick = () => {
      if (!audioRef.current) return;
      if (loopIndex >= loops) {
        audioRef.current.pause();
        setAudioActionLabel(null);
        return;
      }
      loopIndex += 1;
      audioRef.current.currentTime = safeStart;
      audioRef.current.play().catch(() => undefined);
      replayTimeoutRef.current = setTimeout(tick, segmentDurationMs);
    };

    replayTimeoutRef.current = setTimeout(tick, segmentDurationMs);
  };

  const jumpToFocused = () => {
    if (focusedStartSec == null || !audioRef.current) return;
    clearReplayTimer();
    setAudioActionLabel("Jumped to phrase");
    audioRef.current.currentTime = Math.max(0, Number(focusedStartSec));
    audioRef.current.play().catch(() => undefined);
  };

  const syncActivePhraseWithAudio = () => {
    const currentSec = audioRef.current?.currentTime;
    if (currentSec == null || !Number.isFinite(currentSec)) return;

    const currentPhrase = phraseList.find((phrase) => {
      const start = phrase.packLink?.start_sec;
      if (start == null) return false;
      const end = phrase.packLink?.end_sec ?? start + 2.5;
      return currentSec >= start && currentSec <= end + 0.1;
    });

    setActiveAudioPhraseId(currentPhrase?.id ?? null);
  };

  return (
    <div>
      <header className="pb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Learn pack</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{pack.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{pack.topic} · {statusLabel}</p>
        {dueFromThisPackCount > 0 ? (
          <p className="mt-1 text-xs text-slate-500">Due from this pack now: {dueFromThisPackCount}</p>
        ) : null}
      </header>

      <section className="section space-y-4">
        {pack.audioUrl ? (
          <audio
            ref={audioRef}
            controls
            className="w-full"
            src={pack.audioUrl}
            onPlay={() => markPackOpened(pack.id)}
            onPause={() => {
              setAudioActionLabel(null);
              setActiveAudioPhraseId(null);
            }}
            onEnded={() => {
              setAudioActionLabel(null);
              setActiveAudioPhraseId(null);
            }}
            onTimeUpdate={syncActivePhraseWithAudio}
          />
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

        {hasReviewNextNudge ? (
          <div className="rounded border border-slate-200 px-3 py-2 text-xs text-slate-600">
            <p>
              Nice focus. {packInteractionPhraseIds.length} phrase{packInteractionPhraseIds.length > 1 ? "s" : ""} from this pack were saved, flagged, or reheard.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href="/review" className="btn">{reviewNextLabel}</Link>
              <span className="self-center text-slate-400">
                Optional · Due from this pack {dueFromThisPackCount} · Total due {dueCount}
              </span>
            </div>
          </div>
        ) : null}

        {showTranscript ? <p className="text-sm leading-7 text-slate-700">{transcript}</p> : null}
      </section>

      {focusedPhrase ? (
        <section className="section space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Focused phrase</p>
          {activeAudioPhrase ? <p className="text-xs text-slate-500">Now hearing: {activeAudioPhrase.text}</p> : null}
          <p className="text-lg font-medium">{focusedPhrase.text}</p>
          <p className="text-sm text-slate-600">{focusedPhrase.meaningJa}</p>
          {focusedPhrase.notes ? <p className="text-sm text-slate-500">{focusedPhrase.notes}</p> : null}
          {hasFocusedTiming ? (
            <p className="text-xs text-slate-500">
              Audio target {formatSecLabel(Number(focusedStartSec))} - {formatSecLabel(Number(focusedEndSec ?? Number(focusedStartSec) + 2.5))}
              {!hasFocusedTimingEnd ? " (estimated end)" : ""}
              {audioActionLabel ? ` · ${audioActionLabel}` : ""}
            </p>
          ) : null}
          {timingAvailability === "partial" ? (
            <p className="text-xs text-slate-500">
              Phrase replay uses an estimated end for this line. For finer listening, keep this line focused in the transcript while pack audio plays.
            </p>
          ) : null}

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

          {hasFocusedTiming ? (
            <div className="flex flex-wrap gap-3">
              <button className="btn" onClick={jumpToFocused} disabled={!canUsePhraseAudioActions}>Jump to phrase</button>
              <button
                className="btn"
                disabled={!canUsePhraseAudioActions}
                onClick={() => playFocusedWindow({ leadInSec: 0, leadOutSec: 0.2, label: "Replaying phrase" })}
              >
                Replay phrase
              </button>
              <button
                className="btn"
                disabled={!canUsePhraseAudioActions}
                onClick={() => playFocusedWindow({ leadInSec: 1.2, leadOutSec: 1.1, label: "Replaying with context" })}
              >
                Replay + context
              </button>
              <button
                className="btn"
                disabled={!canUsePhraseAudioActions}
                onClick={() => playFocusedWindow({ leadInSec: 0, leadOutSec: 0.15, repeatCount: 2, label: "Repeating focused phrase" })}
              >
                Repeat x2
              </button>
              {activeAudioPhraseId && activeAudioPhraseId !== focusedPhrase.id ? (
                <button className="btn" onClick={() => setFocusedPhraseId(activeAudioPhraseId)}>
                  Focus currently playing
                </button>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Phrase replay is unavailable for this line because timing data is missing. You can still play full-pack audio, read the transcript, and save or flag this phrase.
            </p>
          )}
          {focusedFromPhraseQuery && timingAvailability === "none" ? (
            <p className="text-xs text-slate-500">From review: keep this line focused, play the pack audio, then save/flag based on transcript context.</p>
          ) : null}
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
        <button
          className="btn-primary"
          onClick={async () => {
            await markPackCompleted(pack.id);
            setDoneForNowAt(new Date().toISOString());
          }}
        >
          Done for now
        </button>
        <Link href="/review" className="btn">Go to review</Link>
      </section>

      {doneForNowAt ? (
        <section className="section space-y-2 text-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Done for now</p>
          <p className="text-slate-600">
            Saved {savedFromPackCount} · Flagged {flaggedFromPackCount} · Reheard {reheardFromPackCount} · Due now from this pack {dueFromThisPackCount}
          </p>
          <div className="flex flex-wrap gap-2">
            {dueFromThisPackCount > 0 ? (
              <Link href="/review" className="btn">Review now</Link>
            ) : (
              <Link href="/" className="btn">Return home</Link>
            )}
            <Link href={`/pack/${pack.id}`} className="btn">Stay in this pack</Link>
          </div>
          {dueFromThisPackCount === 0 ? (
            <p className="text-xs text-slate-500">No phrases from this pack are due right now. You can return later or keep studying.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
