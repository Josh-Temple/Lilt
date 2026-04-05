import { contentService } from "@/lib/content";
import { Pack, Phrase } from "@/lib/types";

export type LearnerPhrase = Phrase & {
  packLink?: {
    start_char_index?: number | null;
    end_char_index?: number | null;
    start_sec?: number | null;
    end_sec?: number | null;
  };
};

export type LearnerPhraseWithContext = LearnerPhrase & {
  linkedPacks: Array<{ id: string; title: string; topic?: string }>;
  reviewContext?: {
    packId: string;
    packTitle: string;
    packTopic?: string;
    transcriptExcerpt?: string;
    example?: string;
    authoredNote?: string;
    authoredContrast?: string;
  };
};

export type LearnerPackDetail = {
  pack: Pack | null;
  phrases: LearnerPhrase[];
};

const jsonHeaders = { "Content-Type": "application/json" };

async function safeJson<T>(input: RequestInfo): Promise<T | null> {
  try {
    const response = await fetch(input, { headers: jsonHeaders });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function buildFallbackPhrase(phraseId: string): LearnerPhraseWithContext | null {
  const phrase = contentService.getPhrase(phraseId);
  if (!phrase) return null;

  const linkedPacks = contentService
    .getPacks()
    .filter((pack) => pack.phraseIds.includes(phraseId))
    .map((pack) => ({ id: pack.id, title: pack.title, topic: pack.topic }));

  return {
    ...phrase,
    linkedPacks,
  };
}

function createTranscriptExcerpt(transcript: string, phrase: LearnerPhrase): string | undefined {
  if (!transcript.trim()) return undefined;

  const start = phrase.packLink?.start_char_index;
  const end = phrase.packLink?.end_char_index;
  if (typeof start === "number" && typeof end === "number" && end > start) {
    const windowStart = Math.max(0, start - 38);
    const windowEnd = Math.min(transcript.length, end + 38);
    const snippet = transcript.slice(windowStart, windowEnd).replace(/\s+/g, " ").trim();
    if (snippet) return snippet;
  }

  const phraseStem = phrase.text.replace("...", "").trim().toLowerCase();
  if (!phraseStem) return undefined;
  const normalizedTranscript = transcript.toLowerCase();
  const phraseIndex = normalizedTranscript.indexOf(phraseStem);
  if (phraseIndex === -1) return undefined;

  const fallbackStart = Math.max(0, phraseIndex - 38);
  const fallbackEnd = Math.min(transcript.length, phraseIndex + phraseStem.length + 38);
  const fallback = transcript.slice(fallbackStart, fallbackEnd).replace(/\s+/g, " ").trim();
  return fallback || undefined;
}

function compactText(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || undefined;
}

function buildFallbackPackDetail(packId: string): LearnerPackDetail {
  const pack = contentService.getPack(packId) ?? null;
  if (!pack) return { pack: null, phrases: [] };

  const phrases = contentService.getPhrasesByPack(packId).map((phrase) => {
    const link = contentService.getPackLinks(packId).find((item) => item.phraseId === phrase.id);

    return {
      ...phrase,
      packLink: link
        ? {
            start_char_index: link.startIndex,
            end_char_index: link.endIndex,
            start_sec: link.startSec,
            end_sec: link.endSec,
          }
        : undefined,
    };
  });

  return {
    pack: {
      ...pack,
      audioUrl: "",
    },
    phrases,
  };
}

export const learnerContentRepository = {
  async getPublishedPacks(): Promise<Pack[]> {
    const payload = await safeJson<{ packs?: Pack[] }>("/api/packs");
    if (payload?.packs && Array.isArray(payload.packs) && payload.packs.length > 0) return payload.packs;
    return contentService.getPacks();
  },

  async getPackDetail(packId: string): Promise<LearnerPackDetail> {
    const payload = await safeJson<{ pack?: Pack; phrases?: LearnerPhrase[] }>(`/api/packs/${packId}`);
    if (payload?.pack) {
      return {
        pack: payload.pack,
        phrases: Array.isArray(payload.phrases) ? payload.phrases : [],
      };
    }

    return buildFallbackPackDetail(packId);
  },

  async getPhraseDetail(phraseId: string): Promise<LearnerPhraseWithContext | null> {
    const packs = await this.getPublishedPacks();
    const linkedPacks = packs.filter((pack) => pack.phraseIds.includes(phraseId));

    for (const pack of linkedPacks) {
      const detail = await this.getPackDetail(pack.id);
      const phrase = detail.phrases.find((item) => item.id === phraseId);
      if (phrase) {
        const transcriptExcerpt = createTranscriptExcerpt(detail.pack?.transcript ?? "", phrase);
        const linkedPackContext = linkedPacks.map((item) => ({ id: item.id, title: item.title, topic: item.topic }));

        return {
          ...phrase,
          linkedPacks: linkedPackContext,
          reviewContext: {
            packId: pack.id,
            packTitle: pack.title,
            packTopic: pack.topic,
            transcriptExcerpt,
            example: compactText(phrase.examples[0]),
            authoredNote: compactText(phrase.notes),
            authoredContrast: compactText(phrase.contrasts[0]),
          },
        };
      }
    }

    return buildFallbackPhrase(phraseId);
  },

  async getPhrasesByIds(phraseIds: string[]): Promise<LearnerPhraseWithContext[]> {
    const uniqueIds = Array.from(new Set(phraseIds));
    const result = await Promise.all(uniqueIds.map((id) => this.getPhraseDetail(id)));
    return result.filter((item): item is LearnerPhraseWithContext => Boolean(item));
  },
};
