import { Link, useLocation } from "@tanstack/react-router";
import { Cloud, Map, ShieldAlert, Code2, Crown, LogIn, User as UserIcon, Gamepad2 } from "lucide-react";
import CitySearch from "./CitySearch";
import { useCity } from "@/lib/city-store";
import { useAuth, useSubscription } from "@/lib/auth-store";

const tabs = [
  { to: "/", label: "Weather", icon: Cloud },
  { to: "/radar", label: "Radar & Maps", icon: Map },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/api", label: "API", icon: Code2 },
  { to: "/premium", label: "Premium", icon: Crown },
] as const;

export default function Header() {
  const [city] = useCity();
  const loc = useLocation();
  const { user } = useAuth();
  const { subscribed } = useSubscription();

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/60 border-b border-border/60">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-3 flex items-center gap-3 flex-wrap">
        <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight shrink-0 group">
          <span className="icon-tile size-9 rounded-xl shadow-glow transition-transform group-hover:scale-105">
            <Cloud className="size-5" />
          </span>
          <span className="flex items-baseline gap-2">
            <span className="text-lg text-gradient">Lucast</span>
            <span className="text-lg font-light text-muted-foreground hidden sm:inline">
              Weather
            </span>
          </span>
          {subscribed && (
            <span className="chip px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-warning border-warning/40 flex items-center gap-1">
              <Crown className="size-2.5" /> Pro
            </span>
          )}
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/15 text-primary border border-primary/40 shadow-[inset_0_1px_0_0_color-mix(in_oklab,white_10%,transparent)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60 border border-transparent"
                }`}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <Link
            to="/admin"
            search={{ redirect: undefined }}
            className="ml-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm border border-border/70 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            aria-label={user ? "Account" : "Sign in"}
            title={user?.email ?? "Sign in"}
          >
            {user ? <UserIcon className="size-4" /> : <LogIn className="size-4" />}
          </Link>
        </nav>
      </div>
    </header>
  );
}
