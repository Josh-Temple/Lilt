import { getSupabaseEnv, requestSupabase } from "@/lib/supabase/http";

export function hasSupabaseServerEnv() {
  return getSupabaseEnv().hasEnv;
}

export async function selectServerRows<T>(table: string, query: string) {
  const response = await requestSupabase({
    path: `/rest/v1/${table}?${query}`,
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  return (await response.json()) as T;
}
