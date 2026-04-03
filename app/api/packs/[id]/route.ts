import { NextResponse } from "next/server";
import { contentService } from "@/lib/content";
import { hasSupabaseServerEnv, selectServerRows } from "@/lib/supabase/server";

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
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!hasSupabaseServerEnv()) {
    const pack = contentService.getPack(id);
    const phrases = contentService.getPhrasesByPack(id);
    if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ pack, phrases });
  }

  try {
    const packs = await selectServerRows<DbPack[]>(
      "packs",
      `select=id,slug,title,description,level,topic,transcript,estimated_duration_sec,status&id=eq.${encodeURIComponent(id)}&limit=1`,
    );

    const pack = packs[0];
    if (!pack) throw new Error("not found");

    const links = await selectServerRows<Array<{ phrase_id: string }>>(
      "pack_phrases",
      `select=phrase_id&pack_id=eq.${encodeURIComponent(id)}&order=sort_order.asc`,
    );
    const phraseIds = links.map((row) => row.phrase_id);

    const phrases = phraseIds.length
      ? await selectServerRows<DbPhrase[]>(
          "phrases",
          `select=id,text,core_pattern,meaning_ja,meaning_en,notes,difficulty,tags&id=in.(${phraseIds.map((pid) => `"${pid}"`).join(",")})`,
        )
      : [];

    return NextResponse.json({
      pack: {
        id: pack.id,
        title: pack.title,
        level: (pack.level as "A2" | "B1" | "B2") ?? "B1",
        topic: pack.topic ?? "General",
        transcript: pack.transcript,
        durationSec: pack.estimated_duration_sec ?? undefined,
        audioUrl: "",
        phraseIds,
        tags: [],
      },
      phrases: phrases.map((phrase) => ({
        id: phrase.id,
        text: phrase.text,
        corePattern: phrase.core_pattern ?? "",
        meaningJa: phrase.meaning_ja,
        meaningEn: phrase.meaning_en ?? undefined,
        notes: phrase.notes ?? undefined,
        difficulty: (phrase.difficulty as 1 | 2 | 3) ?? 2,
        variants: [],
        contrasts: [],
        examples: [],
        tags: phrase.tags ?? [],
      })),
    });
  } catch {
    const fallback = contentService.getPack(id);
    if (!fallback) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ pack: fallback, phrases: contentService.getPhrasesByPack(id) });
  }
}
