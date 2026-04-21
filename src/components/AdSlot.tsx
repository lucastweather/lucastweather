import { ExternalLink } from "lucide-react";

/**
 * Sponsored ad slot. Currently rotating sponsor: White Stag Monterey —
 * a boutique inn on California's Monterey Peninsula.
 */
export default function AdSlot() {
  return (
    <a
      href="https://whitestagmonterey.com"
      target="_blank"
      rel="noopener sponsored"
      className="block panel p-5 group relative overflow-hidden hover:ring-1 hover:ring-primary/40 transition-all"
    >
      <div className="absolute top-2 right-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        Sponsored
      </div>
      <div className="flex items-center gap-4">
        <div className="text-4xl">🦌</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono uppercase tracking-wider text-warning">
            Monterey, California
          </div>
          <div className="text-base font-semibold mt-0.5 flex items-center gap-1.5">
            White Stag Monterey
            <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-sm text-muted-foreground mt-0.5">
            Coastal hideaway moments from Cannery Row & 17-Mile Drive. Book your
            ocean-view stay tonight.
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end shrink-0">
          <span className="chip px-3 py-1.5 text-xs font-medium text-primary border-primary/30">
            Reserve →
          </span>
        </div>
      </div>
    </a>
  );
}
