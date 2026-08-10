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

        let data;
        try {
          const { buildEnsembleForecast } = await import("@/lib/models/ensemble.server");
          data = await buildEnsembleForecast(coords.lat, coords.lon, days);
        } catch {
          await logUsage(row.key_id, "/v1/forecast/daily", 502);
          return jsonResponse({ error: "Upstream weather provider failed." }, 502);
        }

        const list = data.daily.map((d) => {
          const dayHours = data.hourly.filter((h) => h.time.startsWith(d.date));
          const max = (pick: (h: (typeof dayHours)[number]) => number) =>
            dayHours.length ? Math.max(...dayHours.map(pick)) : null;
          const min = (pick: (h: (typeof dayHours)[number]) => number) =>
            dayHours.length ? Math.min(...dayHours.map(pick)) : null;
          return {
            date: d.date,
            weather_code: d.weatherCode,
            high_f: d.tMax,
            low_f: d.tMin,
            feels_high_f: max((h) => h.apparent),
            feels_low_f: min((h) => h.apparent),
            precipitation_in: d.precipSum,
            precipitation_probability_pct: d.precipProb,
            wind_speed_max_mph: max((h) => h.windSpeed),
            wind_gust_max_mph: max((h) => h.windGust),
            uv_index_max: max((h) => h.uvIndex),
            sunrise: d.sunrise,
            sunset: d.sunset,
          };
        });

        await logUsage(row.key_id, "/v1/forecast/daily", 200);

        return jsonResponse(
          {
            location: { lat: coords.lat, lon: coords.lon, utc_offset_seconds: data.utcOffsetSeconds },
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
