import { createFileRoute } from "@tanstack/react-router";

/** GET /api/public/v1/forecast/daily — up to 16-day daily forecast. */
export const Route = createFileRoute("/api/public/v1/forecast/daily")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { preflight } = await import("@/lib/public-api.server");
        return preflight();
      },
      GET: async ({ request }) => {
        const { authorizeApiKey, jsonResponse, logUsage, parseCoords, quotaHeaders } =
          await import("@/lib/public-api.server");

        const auth = await authorizeApiKey(request);
        if (!auth.ok) return auth.response;
        const row = auth.row;

        const coords = parseCoords(request);
        if (!coords) {
          await logUsage(row.key_id, "/v1/forecast/daily", 400);
          return jsonResponse(
            { error: "Missing or invalid 'lat' and 'lon' query parameters." },
            400,
          );
        }

        const url = new URL(request.url);
        const rawDays = parseInt(url.searchParams.get("days") ?? "7", 10);
        const days = Number.isFinite(rawDays) ? Math.min(16, Math.max(1, rawDays)) : 7;

        const params = new URLSearchParams({
          latitude: String(coords.lat),
          longitude: String(coords.lon),
          daily:
            "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset",
          forecast_days: String(days),
          temperature_unit: "fahrenheit",
          wind_speed_unit: "mph",
          precipitation_unit: "inch",
          timezone: "auto",
        });

        const upstream = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!upstream.ok) {
          await logUsage(row.key_id, "/v1/forecast/daily", 502);
          return jsonResponse({ error: "Upstream weather provider failed." }, 502);
        }

        const data = await upstream.json();
        const d = data.daily ?? {};
        const list = (d.time ?? []).map((date: string, i: number) => ({
          date,
          weather_code: d.weather_code?.[i],
          high_f: d.temperature_2m_max?.[i],
          low_f: d.temperature_2m_min?.[i],
          feels_high_f: d.apparent_temperature_max?.[i],
          feels_low_f: d.apparent_temperature_min?.[i],
          precipitation_in: d.precipitation_sum?.[i],
          precipitation_probability_pct: d.precipitation_probability_max?.[i],
          wind_speed_max_mph: d.wind_speed_10m_max?.[i],
          wind_gust_max_mph: d.wind_gusts_10m_max?.[i],
          uv_index_max: d.uv_index_max?.[i],
          sunrise: d.sunrise?.[i],
          sunset: d.sunset?.[i],
        }));

        await logUsage(row.key_id, "/v1/forecast/daily", 200);

        return jsonResponse(
          {
            location: { lat: coords.lat, lon: coords.lon, timezone: data.timezone },
            days: list,
            quota: { limit: row.monthly_limit, remaining: row.remaining },
          },
          200,
          quotaHeaders(row),
        );
      },
    },
  },
});
