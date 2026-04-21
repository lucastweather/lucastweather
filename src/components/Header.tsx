import { Link, useLocation } from "@tanstack/react-router";
import { Cloud, Map, ShieldAlert, Code2, Crown, LockKeyhole, LogIn } from "lucide-react";
import CitySearch from "./CitySearch";
import { useCity } from "@/lib/city-store";

const tabs = [
  { to: "/", label: "Weather", icon: Cloud },
  { to: "/radar", label: "Radar & Maps", icon: Map },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert },
  { to: "/api", label: "API", icon: Code2 },
  { to: "/premium", label: "Premium", icon: Crown },
  { to: "/admin", label: "Admin", icon: LockKeyhole },
] as const;

export default function Header() {
  const [city] = useCity();
  const loc = useLocation();

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-3 flex items-center gap-3 flex-wrap">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight shrink-0">
          <span className="text-2xl">⛅</span>
          <span className="text-lg">Lucast Weather</span>
        </Link>

        <div className="flex-1 min-w-[260px] max-w-xl">
          <CitySearch currentCity={city} />
        </div>

        <nav className="flex items-center gap-1 flex-wrap">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname === to || (to !== "/" && loc.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <Link
            to="/admin"
            className="ml-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            aria-label="Sign in"
          >
            <LogIn className="size-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
