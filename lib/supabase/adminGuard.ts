import { getSupabaseEnv, requestSupabase } from "@/lib/supabase/http";
import { getServerAccessToken } from "@/lib/supabase/serverAuth";

type AuthUser = { id: string };
type ProfileRow = { is_admin: boolean };

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
