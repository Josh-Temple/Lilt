import { NextResponse } from "next/server";
import { hasSupabaseServerEnv, selectServerRows } from "@/lib/supabase/server";
import { resolvePrimaryAudioByPackIds } from "@/lib/supabase/audioResolver";
import { getServerAccessToken } from "@/lib/supabase/serverAuth";

type DbPack = {
  id: string;
  title: string;
  level: string | null;
  topic: string | null;
  transcript: string;
  estimated_duration_sec: number | null;
};

type DbPhrase = {
  id: string;
  text: string;
  core_pattern: string | null;
  meaning_ja: string;
  meaning_en: string | null;
  notes: string | null;
  difficulty: number | null;
  tags: string[] | null;
  variants: string[] | null;
  contrasts: string[] | null;
  examples: string[] | null;
};

type DbLink = {
  id: string;
  phrase_id: string;
  sort_order: number;
  role: "main" | "support";
  start_char_index: number | null;
  end_char_index: number | null;
  start_sec: number | null;
  end_sec: number | null;
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!hasSupabaseServerEnv()) {
    return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
  }

  try {
    const packs = await selectServerRows<DbPack[]>(
      "packs",
      `select=id,title,level,topic,transcript,estimated_duration_sec,status&id=eq.${encodeURIComponent(id)}&status=eq.published&limit=1`,
    );

    const pack = packs[0];
    if (!pack) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const links = await selectServerRows<DbLink[]>(
      "pack_phrases",
      `select=id,phrase_id,sort_order,role,start_char_index,end_char_index,start_sec,end_sec&pack_id=eq.${encodeURIComponent(id)}&order=sort_order.asc`,
    );
    const phraseIds = links.map((row) => row.phrase_id);

    const phrases = phraseIds.length
      ? await selectServerRows<DbPhrase[]>(
          "phrases",
          `select=id,text,core_pattern,meaning_ja,meaning_en,notes,difficulty,tags,variants,contrasts,examples&id=in.(${phraseIds.map((pid) => `\"${pid}\"`).join(",")})`,
        )
      : [];

    const phraseById = new Map(phrases.map((phrase) => [phrase.id, phrase]));

    const accessToken = await getServerAccessToken();
    const primaryAudioByPack = await resolvePrimaryAudioByPackIds([id], accessToken);
    const primaryAudio = primaryAudioByPack.get(id);

    const orderedPhrases = links
      .map((link) => {
        const phrase = phraseById.get(link.phrase_id);
        if (!phrase) return null;

        return {
          id: phrase.id,
          text: phrase.text,
          corePattern: phrase.core_pattern ?? "",
          meaningJa: phrase.meaning_ja,
          meaningEn: phrase.meaning_en ?? undefined,
          notes: phrase.notes ?? undefined,
          difficulty: (phrase.difficulty as 1 | 2 | 3) ?? 2,
          variants: phrase.variants ?? [],
          contrasts: phrase.contrasts ?? [],
          examples: phrase.examples ?? [],
          tags: phrase.tags ?? [],
          packLink: {
            id: link.id,
            sort_order: link.sort_order,
            role: link.role,
            start_char_index: link.start_char_index,
            end_char_index: link.end_char_index,
            start_sec: link.start_sec,
            end_sec: link.end_sec,
          },
        };
      })
      .filter((phrase): phrase is NonNullable<typeof phrase> => Boolean(phrase));

    return NextResponse.json({
      pack: {
        id: pack.id,
        title: pack.title,
        level: (pack.level as "A2" | "B1" | "B2") ?? "B1",
        topic: pack.topic ?? "General",
        transcript: pack.transcript,
        durationSec: primaryAudio?.durationSec ?? pack.estimated_duration_sec ?? undefined,
        audioUrl: primaryAudio?.audioUrl ?? "",
        phraseIds,
        tags: Array.from(new Set(orderedPhrases.flatMap((phrase) => phrase.tags))),
      },
      phrases: orderedPhrases,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load pack detail from Supabase." }, { status: 500 });
  }
}
