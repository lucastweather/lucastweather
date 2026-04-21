import { useEffect, useState } from "react";
import type { GeoResult } from "./weather";

const KEY = "lucast-city-v1";

const DEFAULT: GeoResult = {
  id: 5128581,
  name: "New York",
  country: "United States",
  country_code: "US",
  admin1: "NY",
  latitude: 40.7128,
  longitude: -74.006,
  timezone: "America/New_York",
};

let listeners: Array<(c: GeoResult) => void> = [];
let current: GeoResult = DEFAULT;

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) current = JSON.parse(raw);
  } catch {
    // ignore
  }
}

export function getCity() {
  return current;
}

export function setCity(c: GeoResult) {
  current = c;
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(c));
  }
  listeners.forEach((l) => l(c));
}

export function useCity(): [GeoResult, (c: GeoResult) => void] {
  const [city, setLocal] = useState<GeoResult>(current);
  useEffect(() => {
    const l = (c: GeoResult) => setLocal(c);
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);
  return [city, setCity];
}
