import { cookies } from "next/headers";
import { getSupabaseEnv, requestSupabase } from "@/lib/supabase/http";

type AuthUser = { id: string };
type ProfileRow = { is_admin: boolean };

function parseAccessToken(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      return parsed[0];
    }
    if (parsed && typeof parsed === "object") {
      const token = (parsed as { access_token?: unknown }).access_token;
      if (typeof token === "string") {
        return token;
      }
    }
  } catch {
    // fall through
  }

  return null;
}

async function getServerAccessToken() {
  const jar = await cookies();
  const authCookie = jar.getAll().find((cookie) => cookie.name.includes("-auth-token"));
  if (!authCookie?.value) {
    return null;
  }
  return parseAccessToken(authCookie.value);
}

export async function isServerAdmin() {
  if (!getSupabaseEnv().hasEnv) {
    return false;
  }

  const token = await getServerAccessToken();
  if (!token) {
    return false;
  }

  try {
    const authResponse = await requestSupabase({
      path: "/auth/v1/user",
      token,
      cache: "no-store",
    });
    const user = (await authResponse.json()) as AuthUser;
    if (!user?.id) {
      return false;
    }

    const profileResponse = await requestSupabase({
      path: `/rest/v1/profiles?select=is_admin&id=eq.${encodeURIComponent(user.id)}&limit=1`,
      token,
      cache: "no-store",
    });
    const profiles = (await profileResponse.json()) as ProfileRow[];
    return profiles[0]?.is_admin === true;
  } catch {
    return false;
  }
}
