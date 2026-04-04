const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseEnv() {
  return {
    baseUrl,
    anonKey,
    hasEnv: Boolean(baseUrl && anonKey),
  };
}

type RequestArgs = {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  cache?: RequestCache;
};

export async function requestSupabase({
  path,
  method = "GET",
  token,
  headers,
  body,
  cache,
}: RequestArgs) {
  if (!baseUrl || !anonKey) {
    throw new Error("Supabase environment variables are missing");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token ?? anonKey}`,
      ...headers,
    },
    body,
    cache,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response;
}

export function getClientAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("lilt-supabase-access-token");
}
