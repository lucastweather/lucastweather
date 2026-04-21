import { Star, X, MapPin, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCity, setCity } from "@/lib/city-store";
import { useFavorites, favoriteToGeo } from "@/lib/favorites-store";
import { useSubscription, useAuth } from "@/lib/auth-store";

/**
 * Quick-switch list of saved cities. Premium-only feature: free users see
 * a locked teaser. Includes a "favorite current city" star so users can save
 * their current location without leaving the dashboard.
 */
export default function FavoriteCities() {
  const [city] = useCity();
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { cities, isFavoriteCity, addCity, remove } = useFavorites();

  const isCurrentFav = isFavoriteCity(city.id);

  async function toggleCurrent() {
    if (!subscribed) return;
    if (isCurrentFav) {
      await remove("city", String(city.id));
    } else {
      await addCity(city);
    }
  }

  if (!subscribed) {
    return (
      <section className="panel p-5 border-warning/30">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Lock className="size-5 text-warning" />
            <div>
              <div className="font-semibold flex items-center gap-2">
                <Star className="size-4 text-warning" /> Favorite Cities
              </div>
              <div className="text-xs text-muted-foreground">
                {user
                  ? "Save unlimited locations and switch in one tap with Premium ($3/mo)."
                  : "Sign in & upgrade to save your favorite cities and cameras."}
              </div>
            </div>
          </div>
          <Link
            to="/premium"
            className="chip px-3 py-1.5 text-xs text-warning border-warning/40 hover:bg-warning/10"
          >
            Upgrade →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Star className="size-4 text-warning" /> Favorite Cities
          <span className="text-[10px] uppercase tracking-wider chip px-2 py-0.5 text-warning">
            Premium
          </span>
        </h2>
        <button
          onClick={toggleCurrent}
          className={`chip px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
            isCurrentFav
              ? "text-warning border-warning/40 bg-warning/10"
              : "hover:bg-accent"
          }`}
        >
          <Star className={`size-3.5 ${isCurrentFav ? "fill-current" : ""}`} />
          {isCurrentFav ? "Saved" : `Favorite ${city.name}`}
        </button>
      </div>

      {cities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No saved cities yet. Tap the star above to save your current location.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {cities.map((f) => {
            const isActive = String(city.id) === f.ref_id;
            return (
              <div
                key={f.id}
                className={`group chip pl-3 pr-1 py-1 flex items-center gap-1.5 text-xs ${
                  isActive ? "border-primary/40 text-primary" : ""
                }`}
              >
                <button
                  onClick={() => {
                    const geo = favoriteToGeo(f);
                    if (geo) setCity(geo);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <MapPin className="size-3" />
                  <span className="font-medium">{f.name}</span>
                  {f.subtitle && (
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {f.subtitle}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => remove("city", f.ref_id)}
                  className="size-5 rounded-full hover:bg-danger/20 hover:text-danger flex items-center justify-center transition-colors"
                  aria-label="Remove favorite"
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
