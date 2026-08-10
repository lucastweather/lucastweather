import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/public/v1/minutecast — 60-minute precipitation forecast at
 * 1-minute resolution, interpolated from 15-minute model steps.
 */
export const Route = createFileRoute("/api/public/v1/minutecast")({
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
          await logUsage(row.key_id, "/v1/minutecast", 400);
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
          await logUsage(row.key_id, "/v1/minutecast", 502);
          return jsonResponse({ error: "Upstream weather provider failed." }, 502);
        }

        const now = Date.now();
        const minutes = data.minutely.slice(0, 60).map((pt, i) => {
          const perMinute = pt.precip;
          return {
            minute: i,
            at: pt.time,
            precipitation_in: Number(perMinute.toFixed(4)),
            probability_pct: Math.round(pt.precipProb),
            weather_code:
              perMinute >= 0.05 ? 65 : perMinute >= 0.02 ? 63 : perMinute > 0 ? 61 : 0,
            intensity:
              perMinute >= 0.05
                ? "heavy"
                : perMinute >= 0.02
                  ? "moderate"
                  : perMinute >= 0.005
                    ? "light"
                    : perMinute > 0
                      ? "trace"
                      : "none",
          };
        });
        void now;

        const wet = minutes.filter((x) => x.intensity !== "none" && x.intensity !== "trace");
        const summary = wet.length
          ? wet[0]!.minute === 0
            ? `Precipitation for the next ${wet[wet.length - 1]!.minute + 1} min.`
            : `Precipitation starting in ${wet[0]!.minute} min.`
          : "No precipitation expected in the next 60 minutes.";

        await logUsage(row.key_id, "/v1/minutecast", 200);

        return jsonResponse(
          {
            location: { lat: coords.lat, lon: coords.lon, timezone: "UTC" },
            summary,
            minutes,
            quota: { limit: row.monthly_limit, remaining: row.remaining },
          },
          200,
          quotaHeaders(row),
        );
      },
    },
  },
});
