import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GeoResult } from "./weather";

export type FavoriteRow = {
  id: string;
  kind: "city" | "camera";
  ref_id: string;
  name: string;
  subtitle: string | null;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  country_code: string | null;
  admin1: string | null;
  timezone: string | null;
  created_at: string;
};

const listeners = new Set<(rows: FavoriteRow[]) => void>();
let cache: FavoriteRow[] = [];

function broadcast() {
  listeners.forEach((l) => l(cache));
}

export async function refreshFavorites() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      cache = [];
      broadcast();
      return;
    }
    const { data, error } = await supabase
      .from("favorites")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return;
    cache = (data ?? []) as FavoriteRow[];
    broadcast();
  } catch {
    cache = [];
    broadcast();
  }
}

export function useFavorites() {
  const [rows, setRows] = useState<FavoriteRow[]>(cache);

  useEffect(() => {
    listeners.add(setRows);
    void refreshFavorites();
    let unsub: (() => void) | undefined;
    try {
      const { data: sub } = supabase.auth.onAuthStateChange(() => {
        void refreshFavorites();
      });
      unsub = () => sub.subscription.unsubscribe();
    } catch {
      unsub = undefined;
    }
    return () => {
      listeners.delete(setRows);
      unsub?.();
    };
  }, []);


  const cities = rows.filter((r) => r.kind === "city");
  const cameras = rows.filter((r) => r.kind === "camera");

  const isFavoriteCity = useCallback(
    (id: number | string) => cities.some((c) => c.ref_id === String(id)),
    [cities],
  );
  const isFavoriteCamera = useCallback(
    (id: string) => cameras.some((c) => c.ref_id === id),
    [cameras],
  );

  const addCity = useCallback(async (city: GeoResult) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { error: "Not signed in" };
    const { error } = await supabase.from("favorites").insert({
      user_id: session.user.id,
      kind: "city",
      ref_id: String(city.id),
      name: city.name,
      subtitle: [city.admin1, city.country].filter(Boolean).join(", "),
      latitude: city.latitude,
      longitude: city.longitude,
      country: city.country,
      country_code: city.country_code,
      admin1: city.admin1 ?? null,
      timezone: city.timezone,
    });
    if (!error) await refreshFavorites();
    return { error: error?.message ?? null };
  }, []);

  const addCamera = useCallback(
    async (cam: { id: string; name: string; region: string }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return { error: "Not signed in" };
      const { error } = await supabase.from("favorites").insert({
        user_id: session.user.id,
        kind: "camera",
        ref_id: cam.id,
        name: cam.name,
        subtitle: cam.region,
      });
      if (!error) await refreshFavorites();
      return { error: error?.message ?? null };
    },
    [],
  );

  const remove = useCallback(async (kind: "city" | "camera", refId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", session.user.id)
      .eq("kind", kind)
      .eq("ref_id", refId);
    await refreshFavorites();
  }, []);

  return {
    favorites: rows,
    cities,
    cameras,
    isFavoriteCity,
    isFavoriteCamera,
    addCity,
    addCamera,
    remove,
  };
}

/** Convert a stored favorite city back into a GeoResult for use with setCity. */
export function favoriteToGeo(f: FavoriteRow): GeoResult | null {
  if (f.kind !== "city" || f.latitude == null || f.longitude == null) return null;
  return {
    id: Number(f.ref_id),
    name: f.name,
    country: f.country ?? "",
    country_code: f.country_code ?? "",
    admin1: f.admin1 ?? undefined,
    latitude: f.latitude,
    longitude: f.longitude,
    timezone: f.timezone ?? "UTC",
  };
}
