import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Public weather API endpoint authenticated with developer API keys.
 * Free plan: 20 calls per month per key. Quotas tracked atomically in DB.
 */

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      ...extraHeaders,
    },
  });
}

export const Route = createFileRoute("/api/public/v1/current")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type",
          },
        }),
      GET: async ({ request }) => {
        // Auth: Bearer token
        const auth = request.headers.get("authorization") ?? "";
        const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
        if (!match) {
          return jsonResponse(
            { error: "Missing API key. Send 'Authorization: Bearer YOUR_KEY' header." },
            401,
          );
        }
        const rawKey = match[1].trim();
        if (!rawKey.startsWith("lwk_live_")) {
          return jsonResponse({ error: "Invalid API key format." }, 401);
        }

        const hash = await sha256Hex(rawKey);

        // Atomically check + increment
        const { data: usage, error: usageErr } = await supabaseAdmin.rpc(
          "increment_api_usage",
          { _key_hash: hash },
        );

        if (usageErr) {
          return jsonResponse({ error: "Internal error verifying key." }, 500);
        }
        const row = Array.isArray(usage) ? usage[0] : usage;

        if (!row || !row.key_id) {
          return jsonResponse({ error: "Invalid or revoked API key." }, 401);
        }

        if (!row.allowed) {
          return jsonResponse(
            {
              error: "Monthly quota exceeded.",
              limit: row.monthly_limit,
              remaining: 0,
              reset: "Resets at the start of next month (UTC).",
              upgrade_url: "/premium",
            },
            429,
            { "X-RateLimit-Limit": String(row.monthly_limit), "X-RateLimit-Remaining": "0" },
          );
        }

        // Parse query
        const url = new URL(request.url);
        const lat = parseFloat(url.searchParams.get("lat") ?? "");
        const lon = parseFloat(url.searchParams.get("lon") ?? "");
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
          // Don't penalize quota for client-side validation errors? We already did.
          // Log as failure
          await supabaseAdmin.from("api_usage_log").insert({
            key_id: row.key_id,
            endpoint: "/v1/current",
            status: 400,
          });
          return jsonResponse(
            { error: "Missing or invalid 'lat' and 'lon' query parameters." },
            400,
          );
        }

        // Fetch upstream
        const params = new URLSearchParams({
          latitude: String(lat),
          longitude: String(lon),
          current:
            "temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,dew_point_2m,uv_index,cloud_cover,is_day,weather_code",
          temperature_unit: "fahrenheit",
          wind_speed_unit: "mph",
          pressure_unit: "inHg",
          timezone: "auto",
        });
        const upstream = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params}`,
        );
        if (!upstream.ok) {
          await supabaseAdmin.from("api_usage_log").insert({
            key_id: row.key_id,
            endpoint: "/v1/current",
            status: 502,
          });
          return jsonResponse({ error: "Upstream weather provider failed." }, 502);
        }
        const upstreamData = await upstream.json();
        const c = upstreamData.current ?? {};

        await supabaseAdmin.from("api_usage_log").insert({
          key_id: row.key_id,
          endpoint: "/v1/current",
          status: 200,
        });

        return jsonResponse(
          {
            location: { lat, lon, timezone: upstreamData.timezone },
            current: {
              temperature_f: c.temperature_2m,
              apparent_f: c.apparent_temperature,
              humidity: c.relative_humidity_2m,
              pressure_inhg: c.pressure_msl,
              wind_speed_mph: c.wind_speed_10m,
              wind_direction_deg: c.wind_direction_10m,
              dew_point_f: c.dew_point_2m,
              uv_index: c.uv_index,
              cloud_cover_pct: c.cloud_cover,
              is_day: c.is_day === 1,
              weather_code: c.weather_code,
              observed_at: c.time,
            },
            quota: {
              limit: row.monthly_limit,
              remaining: row.remaining,
            },
          },
          200,
          {
            "X-RateLimit-Limit": String(row.monthly_limit),
            "X-RateLimit-Remaining": String(row.remaining),
          },
        );
      },
    },
  },
});
