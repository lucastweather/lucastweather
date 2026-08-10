import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/public/v1/current — current conditions.
 * Authenticated with developer API keys; quota enforced atomically in the DB.
 */
export const Route = createFileRoute("/api/public/v1/current")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { preflight } = await import("@/lib/public-api.server");
        return preflight();
      },
      GET: async ({ request }) => {
        const {
          authorizeApiKey,
          jsonResponse,
          logUsage,
          parseCoords,
          quotaHeaders,
        } = await import("@/lib/public-api.server");

        const auth = await authorizeApiKey(request);
        if (!auth.ok) return auth.response;
        const row = auth.row;

        const coords = parseCoords(request);
        if (!coords) {
          await logUsage(row.key_id, "/v1/current", 400);
          return jsonResponse(
            { error: "Missing or invalid 'lat' and 'lon' query parameters." },
            400,
          );
        }

        let data;
        try {
          const { buildEnsembleForecast } = await import("@/lib/models/ensemble.server");
          data = await buildEnsembleForecast(coords.lat, coords.lon, 1);
        } catch {
          await logUsage(row.key_id, "/v1/current", 502);
          return jsonResponse({ error: "Upstream weather provider failed." }, 502);
        }

        const c = data.current;
        await logUsage(row.key_id, "/v1/current", 200);

        return jsonResponse(
          {
            location: { lat: coords.lat, lon: coords.lon, utc_offset_seconds: data.utcOffsetSeconds },
            current: {
              temperature_f: c.temperature,
              apparent_f: c.apparent,
              humidity: c.humidity,
              pressure_inhg: c.pressure,
              wind_speed_mph: c.windSpeed,
              wind_gust_mph: c.windGust,
              wind_direction_deg: c.windDirection,
              dew_point_f: c.dewPoint,
              uv_index: c.uvIndex,
              cloud_cover_pct: c.cloudCover,
              precipitation_in: data.hourly[0]?.precip ?? 0,
              is_day: c.isDay,
              weather_code: c.weatherCode,
              observed_at: new Date().toISOString(),
            },
            quota: { limit: row.monthly_limit, remaining: row.remaining },
          },
          200,
          quotaHeaders(row),
        );
      },
    },
  },
});
