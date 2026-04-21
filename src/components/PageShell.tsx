import Header from "./Header";
import type { ReactNode } from "react";

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 lg:px-6 py-6 space-y-6">
        {children}
      </main>
      <footer className="border-t border-border mt-10 py-6 text-center text-xs text-muted-foreground">
        Lucast Weather · Powered by Lucast AI Ensemble · Seismic data via USGS
      </footer>
    </div>
  );
}
