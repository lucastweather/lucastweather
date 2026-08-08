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

        const params = new URLSearchParams({
          latitude: String(coords.lat),
          longitude: String(coords.lon),
          current:
            "temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_gusts_10m,wind_direction_10m,dew_point_2m,uv_index,cloud_cover,precipitation,is_day,weather_code",
          temperature_unit: "fahrenheit",
          wind_speed_unit: "mph",
          precipitation_unit: "inch",
          pressure_unit: "inHg",
          timezone: "auto",
        });

        const upstream = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!upstream.ok) {
          await logUsage(row.key_id, "/v1/current", 502);
          return jsonResponse({ error: "Upstream weather provider failed." }, 502);
        }

        const data = await upstream.json();
        const c = data.current ?? {};
        await logUsage(row.key_id, "/v1/current", 200);

        return jsonResponse(
          {
            location: { lat: coords.lat, lon: coords.lon, timezone: data.timezone },
            current: {
              temperature_f: c.temperature_2m,
              apparent_f: c.apparent_temperature,
              humidity: c.relative_humidity_2m,
              pressure_inhg: c.pressure_msl,
              wind_speed_mph: c.wind_speed_10m,
              wind_gust_mph: c.wind_gusts_10m,
              wind_direction_deg: c.wind_direction_10m,
              dew_point_f: c.dew_point_2m,
              uv_index: c.uv_index,
              cloud_cover_pct: c.cloud_cover,
              precipitation_in: c.precipitation,
              is_day: c.is_day === 1,
              weather_code: c.weather_code,
              observed_at: c.time,
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
