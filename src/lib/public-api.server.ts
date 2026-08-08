/**
 * Shared auth + quota plumbing for the public Lucast Weather API
 * (`/api/public/v1/*`). Server-only: never import from client code.
 */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type QuotaRow = {
  key_id: string;
  user_id: string;
  monthly_limit: number;
  remaining: number;
};

type AuthResult =
  | { ok: true; row: QuotaRow }
  | { ok: false; response: Response };

/** Verifies the bearer API key and atomically consumes one quota unit. */
export async function authorizeApiKey(request: Request): Promise<AuthResult> {
  const auth = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (!match) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "Missing API key. Send 'Authorization: Bearer YOUR_KEY' header." },
        401,
      ),
    };
  }

  const rawKey = match[1]!.trim();
  if (!rawKey.startsWith("lwk_live_") || rawKey.length > 128) {
    return { ok: false, response: jsonResponse({ error: "Invalid API key format." }, 401) };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hash = await sha256Hex(rawKey);
  const { data, error } = await supabaseAdmin.rpc("increment_api_usage", {
    _key_hash: hash,
  });

  if (error) {
    return { ok: false, response: jsonResponse({ error: "Internal error verifying key." }, 500) };
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | (QuotaRow & { allowed: boolean })
    | null;

  if (!row || !row.key_id) {
    return { ok: false, response: jsonResponse({ error: "Invalid or revoked API key." }, 401) };
  }

  if (!row.allowed) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Monthly quota exceeded.",
          limit: row.monthly_limit,
          remaining: 0,
          reset: "Resets at the start of next month (UTC).",
          upgrade_url: "/premium",
        },
        429,
        { "X-RateLimit-Limit": String(row.monthly_limit), "X-RateLimit-Remaining": "0" },
      ),
    };
  }

  return { ok: true, row };
}

export function quotaHeaders(row: QuotaRow) {
  return {
    "X-RateLimit-Limit": String(row.monthly_limit),
    "X-RateLimit-Remaining": String(row.remaining),
  };
}

export async function logUsage(keyId: string, endpoint: string, status: number) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("api_usage_log").insert({ key_id: keyId, endpoint, status });
  } catch {
    /* logging must never break a response */
  }
}

export type Coords = { lat: number; lon: number };

export function parseCoords(request: Request): Coords | null {
  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get("lat") ?? "");
  const lon = parseFloat(url.searchParams.get("lon") ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}
