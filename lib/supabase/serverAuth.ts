import { cookies } from "next/headers";

type JsonToken = { access_token?: unknown };

function parseAccessToken(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      return parsed[0];
    }
    if (parsed && typeof parsed === "object") {
      const token = (parsed as JsonToken).access_token;
      if (typeof token === "string") {
        return token;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function getServerAccessToken() {
  const jar = await cookies();
  const authCookie = jar.getAll().find((cookie) => cookie.name.includes("-auth-token"));
  if (!authCookie?.value) {
    return null;
  }
  return parseAccessToken(authCookie.value);
}
