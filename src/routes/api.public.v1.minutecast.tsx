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

        const params = new URLSearchParams({
          latitude: String(coords.lat),
          longitude: String(coords.lon),
          minutely_15: "precipitation,precipitation_probability,weather_code",
          forecast_minutely_15: "8",
          precipitation_unit: "inch",
          timezone: "UTC",
        });

        const upstream = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!upstream.ok) {
          await logUsage(row.key_id, "/v1/minutecast", 502);
          return jsonResponse({ error: "Upstream weather provider failed." }, 502);
        }

        const data = await upstream.json();
        const m = data.minutely_15 ?? {};
        const times: string[] = m.time ?? [];
        const now = Date.now();

        // Find the 15-minute step covering "now", then interpolate to minutes.
        const steps = times.map((t, i) => ({
          at: Date.parse(`${t}Z`),
          precip: Number(m.precipitation?.[i] ?? 0),
          prob: Number(m.precipitation_probability?.[i] ?? 0),
          code: m.weather_code?.[i] ?? 0,
        }));
        const startIdx = Math.max(
          0,
          steps.findIndex((s) => s.at + 15 * 60_000 > now),
        );

        const minutes = Array.from({ length: 60 }, (_, i) => {
          const at = now + i * 60_000;
          const stepIdx = Math.min(
            steps.length - 1,
            startIdx + Math.floor((at - (steps[startIdx]?.at ?? now)) / (15 * 60_000)),
          );
          const step = steps[stepIdx] ?? { precip: 0, prob: 0, code: 0 };
          const perMinute = step.precip / 15;
          return {
            minute: i,
            at: new Date(at).toISOString(),
            precipitation_in: Number(perMinute.toFixed(4)),
            probability_pct: step.prob,
            weather_code: step.code,
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
