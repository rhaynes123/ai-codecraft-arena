import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { MEASURES, MEASURE_KEYS } from "@/lib/measures";

export const Route = createFileRoute("/measures/")({
  head: () => ({
    meta: [
      { title: "What we measure — Steer10x" },
      { name: "description", content: "The four skills Steer10x scores: verification rigor, prompt & context economy, steering & iteration, and correctness & quality." },
      { property: "og:title", content: "What we measure — Steer10x" },
      { property: "og:description", content: "How Steer10x scores your ability to work with an AI pair programmer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MeasuresIndex,
});

function MeasuresIndex() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">What we measure</p>
        <h1 className="mt-2 text-3xl font-bold">Four skills for working with AI</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {MEASURE_KEYS.map((k) => (
            <Link key={k} to="/measures/$dimension" params={{ dimension: k }} className="rounded-lg border bg-card p-5 transition-colors hover:border-primary">
              <h2 className="font-semibold">{MEASURES[k].title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{MEASURES[k].tagline}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
