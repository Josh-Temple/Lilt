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

export async function GET() {
  if (!hasSupabaseServerEnv()) {
    return NextResponse.json({ packs: contentService.getPacks() });
  }

  try {
    const rows = await selectServerRows<DbPack[]>(
      "packs",
      "select=id,slug,title,level,topic,transcript,estimated_duration_sec,status&status=eq.published&order=created_at.desc",
    );

    const packs = rows.map((pack) => ({
      id: pack.id,
      title: pack.title,
      level: (pack.level as "A2" | "B1" | "B2") ?? "B1",
      topic: pack.topic ?? "General",
      transcript: pack.transcript,
      durationSec: pack.estimated_duration_sec ?? undefined,
      audioUrl: "",
      phraseIds: [],
      tags: [],
    }));

    return NextResponse.json({ packs });
  } catch {
    return NextResponse.json({ packs: contentService.getPacks() });
  }
}
