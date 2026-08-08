import { ExternalLink, Wind } from "lucide-react";

const HURRICANE_APP_URL = "https://lucasthurricanes.lovable.app";

/**
 * Hurricane tracking is maintained as its own Lucast app; embed it here so
 * the outlook, storm cones and advisories stay in one source of truth.
 */
export default function HurricaneTracker() {
  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wind className="size-5 text-primary" /> Hurricane Tracker
          <span className="chip px-2 py-0.5 text-[10px] text-success border-success/30">
            Live
          </span>
        </h2>
        <a
          href={HURRICANE_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="chip px-2.5 py-1 text-xs flex items-center gap-1 hover:bg-accent/30"
        >
          Open full tracker <ExternalLink className="size-3" />
        </a>
      </div>

      <div className="rounded-xl overflow-hidden border border-border bg-surface-2">
        <iframe
          src={HURRICANE_APP_URL}
          title="Lucast Hurricanes — live tropical cyclone tracker"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-[70vh] min-h-[520px] block border-0"
        />
      </div>
    </section>
  );
}
