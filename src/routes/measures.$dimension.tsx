import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { MEASURES, MEASURE_KEYS, isMeasureKey } from "@/lib/measures";

export const Route = createFileRoute("/measures/$dimension")({
  loader: ({ params }) => {
    if (!isMeasureKey(params.dimension)) throw notFound();
    return { key: params.dimension };
  },
  head: ({ loaderData }) => {
    const m = loaderData ? MEASURES[loaderData.key] : null;
    const title = m ? `${m.title} — What we measure — Steer10x` : "Unavailable — Steer10x";
    const desc = m ? `${m.tagline} ${m.why}` : "This page isn't available.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(m ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen"><AppHeader /><main className="mx-auto max-w-3xl px-4 py-16"><p>That skill doesn't exist.</p><Link to="/measures" className="text-primary underline">See all skills</Link></main></div>
  ),
  component: MeasurePage,
});

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{title}</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </section>
  );
}

function MeasurePage() {
  const { key } = Route.useLoaderData();
  const m = MEASURES[key];
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-12">
        <div>
          <Link to="/measures" className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">What we measure</Link>
          <h1 className="mt-2 text-3xl font-bold">{m.title}</h1>
          <p className="mt-1 text-lg text-primary">{m.tagline}</p>
          <p className="mt-4 text-muted-foreground">{m.why}</p>
        </div>
        <List title="What we look at" items={m.signals} />
        <div className="grid gap-4 md:grid-cols-2">
          <List title="Strong sessions" items={m.strong} />
          <List title="Weak sessions" items={m.weak} />
        </div>
        <List title="How to improve" items={m.tips} />
        <Button asChild><Link to="/challenges">Practice a challenge</Link></Button>
        <nav className="flex flex-wrap gap-2 border-t pt-6">
          {MEASURE_KEYS.filter((k) => k !== key).map((k) => (
            <Link key={k} to="/measures/$dimension" params={{ dimension: k }} className="rounded-sm border px-3 py-1.5 text-sm hover:border-primary">{MEASURES[k].title}</Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
