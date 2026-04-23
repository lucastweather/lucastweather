import { supabase } from "@/integrations/supabase/client";

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  return session.access_token;
}

async function authedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, {
    ...init,
    headers,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(typeof json?.error === "string" ? json.error : "Request failed.");
  }

  return json as T;
}

export function createApiKey({ data }: { data: { label: string } }) {
  return authedRequest<{ key: unknown; rawKey: string }>("/api/keys", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listApiKeys() {
  return authedRequest<{ keys: unknown[] }>("/api/keys", {
    method: "GET",
  });
}

export function revokeApiKey({ data }: { data: { id: string } }) {
  return authedRequest<{ ok: true }>("/api/keys/revoke", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
