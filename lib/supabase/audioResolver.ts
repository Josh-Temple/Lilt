import { getSupabaseEnv, requestSupabase } from "@/lib/supabase/http";
import { selectServerRows } from "@/lib/supabase/server";

type AudioRow = {
  pack_id: string;
  storage_path: string;
  duration_sec: number | null;
};

type SignedResponse = {
  signedURL?: string;
};

async function signAudioPath(storagePath: string, token?: string | null) {
  const env = getSupabaseEnv();
  if (!env.baseUrl) return "";

  try {
    const safePath = storagePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    const response = await requestSupabase({
      path: `/storage/v1/object/sign/audio/${safePath}`,
      method: "POST",
      token: token ?? undefined,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 60 * 60 }),
      cache: "no-store",
    });

    const json = (await response.json()) as SignedResponse;
    if (!json.signedURL) return "";
    return json.signedURL.startsWith("http") ? json.signedURL : `${env.baseUrl}${json.signedURL}`;
  } catch {
    return "";
  }
}

export async function resolvePrimaryAudioByPackIds(packIds: string[], token?: string | null) {
  if (!packIds.length) return new Map<string, { audioUrl: string; durationSec?: number }>();

  const packIdFilter = packIds.map((id) => `\"${id}\"`).join(",");
  const rows = await selectServerRows<AudioRow[]>(
    "audio_assets",
    `select=pack_id,storage_path,duration_sec&pack_id=in.(${packIdFilter})&kind=eq.pack_full&is_primary=eq.true&order=created_at.desc`,
  );

  const firstByPack = new Map<string, AudioRow>();
  rows.forEach((row) => {
    if (!firstByPack.has(row.pack_id)) {
      firstByPack.set(row.pack_id, row);
    }
  });

  const resolved = new Map<string, { audioUrl: string; durationSec?: number }>();
  for (const [packId, row] of firstByPack.entries()) {
    const signedUrl = await signAudioPath(row.storage_path, token);
    resolved.set(packId, {
      audioUrl: signedUrl,
      durationSec: row.duration_sec ?? undefined,
    });
  }

  return resolved;
}
