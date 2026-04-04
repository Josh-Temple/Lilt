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

type DbLink = {
  pack_id: string;
  phrase_id: string;
  sort_order: number;
};

type DbPhraseTag = {
  id: string;
  tags: string[] | null;
};

export async function GET() {
  if (!hasSupabaseServerEnv()) {
    return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
  }

  try {
    const rows = await selectServerRows<DbPack[]>(
      "packs",
      "select=id,slug,title,level,topic,transcript,estimated_duration_sec,status&status=eq.published&order=created_at.desc",
    );

    if (!rows.length) {
      return NextResponse.json({ packs: [] });
    }

    const packIds = rows.map((pack) => pack.id);
    const packIdFilter = packIds.map((id) => `\"${id}\"`).join(",");

    const links = await selectServerRows<DbLink[]>(
      "pack_phrases",
      `select=pack_id,phrase_id,sort_order&pack_id=in.(${packIdFilter})&order=sort_order.asc`,
    );

    const phraseIds = Array.from(new Set(links.map((link) => link.phrase_id)));
    const phraseTags = phraseIds.length
      ? await selectServerRows<DbPhraseTag[]>(
          "phrases",
          `select=id,tags&id=in.(${phraseIds.map((id) => `\"${id}\"`).join(",")})`,
        )
      : [];

    const accessToken = await getServerAccessToken();
    const primaryAudioByPack = await resolvePrimaryAudioByPackIds(packIds, accessToken);

    const linksByPack = new Map<string, DbLink[]>();
    links.forEach((link) => {
      const current = linksByPack.get(link.pack_id) ?? [];
      current.push(link);
      linksByPack.set(link.pack_id, current);
    });

    const tagsByPhrase = new Map(phraseTags.map((phrase) => [phrase.id, phrase.tags ?? []]));
    const packs = rows.map((pack) => {
      const packLinks = linksByPack.get(pack.id) ?? [];
      const phraseIdsInOrder = packLinks.map((link) => link.phrase_id);
      const tags = Array.from(new Set(phraseIdsInOrder.flatMap((id) => tagsByPhrase.get(id) ?? [])));
      const primary = primaryAudioByPack.get(pack.id);

      return {
        id: pack.id,
        title: pack.title,
        level: (pack.level as "A2" | "B1" | "B2") ?? "B1",
        topic: pack.topic ?? "General",
        transcript: pack.transcript,
        durationSec: primary?.durationSec ?? pack.estimated_duration_sec ?? undefined,
        audioUrl: primary?.audioUrl ?? "",
        phraseIds: phraseIdsInOrder,
        tags,
      };
    });

    return NextResponse.json({ packs });
  } catch {
    return NextResponse.json({ error: "Failed to load packs from Supabase." }, { status: 500 });
  }
}
