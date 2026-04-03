import { getClientAccessToken, getSupabaseEnv, requestSupabase } from "@/lib/supabase/http";

export function hasSupabaseEnv() {
  return getSupabaseEnv().hasEnv;
}

export async function requestMagicLink(email: string) {
  await requestSupabase({
    path: "/auth/v1/otp",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, create_user: false }),
  });
}

export async function selectRows<T>(table: string, query: string) {
  const response = await requestSupabase({
    path: `/rest/v1/${table}?${query}`,
    token: getClientAccessToken() ?? undefined,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return (await response.json()) as T;
}

export async function insertRows<T>(table: string, payload: Record<string, unknown> | Record<string, unknown>[]) {
  const response = await requestSupabase({
    path: `/rest/v1/${table}`,
    method: "POST",
    token: getClientAccessToken() ?? undefined,
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  return (await response.json()) as T;
}

export async function updateRows(table: string, query: string, payload: Record<string, unknown>) {
  await requestSupabase({
    path: `/rest/v1/${table}?${query}`,
    method: "PATCH",
    token: getClientAccessToken() ?? undefined,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function uploadAudio(path: string, file: File) {
  await requestSupabase({
    path: `/storage/v1/object/audio/${path}`,
    method: "POST",
    token: getClientAccessToken() ?? undefined,
    headers: {
      "Content-Type": file.type || "audio/mpeg",
      "x-upsert": "false",
    },
    body: file,
  });
}
