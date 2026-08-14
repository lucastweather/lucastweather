import { createServerFn } from "@tanstack/react-start";

export const getBlendedAirQuality = createServerFn({ method: "GET" })
  .inputValidator((input: { lat: number; lon: number }) => input)
  .handler(async ({ data }) => {
    const { buildBlendedAirQuality } = await import("./airquality.server");
    return buildBlendedAirQuality(data.lat, data.lon);
  });
