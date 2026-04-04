import { getClientAccessToken, getSupabaseEnv, requestSupabase } from "@/lib/supabase/http";

type WriteOptions = {
  query?: string;
  upsert?: boolean;
};

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

export async function getAuthenticatedUser() {
  const token = getClientAccessToken();
  if (!token) {
    return null;
  }

  try {
    const response = await requestSupabase({
      path: "/auth/v1/user",
      token,
      cache: "no-store",
    });
    const user = (await response.json()) as { id?: string };
    if (!user?.id) return null;
    return user;
  } catch {
    return null;
  }
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

export async function insertRows<T>(
  table: string,
  payload: Record<string, unknown> | Record<string, unknown>[],
  options?: WriteOptions,
) {
  const suffix = options?.query ? `?${options.query}` : "";
  const prefer = ["return=representation"];
  if (options?.upsert) {
    prefer.push("resolution=merge-duplicates");
  }

  const response = await requestSupabase({
    path: `/rest/v1/${table}${suffix}`,
    method: "POST",
    token: getClientAccessToken() ?? undefined,
    headers: {
      "Content-Type": "application/json",
      Prefer: prefer.join(","),
    },
    body: JSON.stringify(payload),
  });

  return (await response.json()) as T;
}

export async function updateRows<T = void>(table: string, query: string, payload: Record<string, unknown>, preferReturn = false) {
  const response = await requestSupabase({
    path: `/rest/v1/${table}?${query}`,
    method: "PATCH",
    token: getClientAccessToken() ?? undefined,
    headers: {
      "Content-Type": "application/json",
      ...(preferReturn ? { Prefer: "return=representation" } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!preferReturn) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function deleteRows(table: string, query: string) {
  await requestSupabase({
    path: `/rest/v1/${table}?${query}`,
    method: "DELETE",
    token: getClientAccessToken() ?? undefined,
    headers: {
      "Content-Type": "application/json",
    },
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
