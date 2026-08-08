import { createFileRoute } from "@tanstack/react-router";

/** GET /api/public/v1/alerts — active US severe weather alerts (NWS). */
export const Route = createFileRoute("/api/public/v1/alerts")({
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
          await logUsage(row.key_id, "/v1/alerts", 400);
          return jsonResponse(
            { error: "Missing or invalid 'lat' and 'lon' query parameters." },
            400,
          );
        }

        const point = `${coords.lat.toFixed(4)},${coords.lon.toFixed(4)}`;
        const upstream = await fetch(
          `https://api.weather.gov/alerts/active?point=${point}`,
          { headers: { Accept: "application/geo+json", "User-Agent": "LucastWeather/1.0" } },
        );

        if (!upstream.ok) {
          // Outside NWS coverage the API 400s — report "no alerts" rather than failing.
          if (upstream.status === 400 || upstream.status === 404) {
            await logUsage(row.key_id, "/v1/alerts", 200);
            return jsonResponse(
              {
                location: { lat: coords.lat, lon: coords.lon },
                alerts: [],
                note: "No official alert coverage for this location.",
                quota: { limit: row.monthly_limit, remaining: row.remaining },
              },
              200,
              quotaHeaders(row),
            );
          }
          await logUsage(row.key_id, "/v1/alerts", 502);
          return jsonResponse({ error: "Upstream alert provider failed." }, 502);
        }

        const data = await upstream.json();
        const alerts = (data.features ?? []).map((f: any) => ({
          id: f.id,
          event: f.properties?.event,
          severity: f.properties?.severity,
          urgency: f.properties?.urgency,
          certainty: f.properties?.certainty,
          headline: f.properties?.headline,
          description: f.properties?.description,
          instruction: f.properties?.instruction,
          area: f.properties?.areaDesc,
          sender: f.properties?.senderName,
          effective: f.properties?.effective,
          expires: f.properties?.expires,
        }));

        await logUsage(row.key_id, "/v1/alerts", 200);

        return jsonResponse(
          {
            location: { lat: coords.lat, lon: coords.lon },
            alerts,
            quota: { limit: row.monthly_limit, remaining: row.remaining },
          },
          200,
          quotaHeaders(row),
        );
      },
    },
  },
});
