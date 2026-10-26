import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Clock, GraduationCap } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useChallenges } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/challenges/")({
  head: () => ({
    meta: [
      { title: "Challenge catalog — Steer10x" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Real-world repo challenges: async refactors, race conditions, API migrations and state machine edge cases." },
      { property: "og:title", content: "Challenge catalog — Steer10x" },
      { property: "og:description", content: "Real-world repo challenges for AI-assisted engineers." },
    ],
  }),
  component: Catalog,
});

export const diffTone = (d: string) => (d === "Easy" ? "text-success" : d === "Medium" ? "text-warning" : "text-destructive");

function Catalog() {
  const { data, isLoading } = useChallenges();
  const [diff, setDiff] = useState("All");
  const [cat, setCat] = useState("All");
  const cats = useMemo(() => ["All", ...new Set((data ?? []).map((c) => c.category))], [data]);
  const [detroit, setDetroit] = useState(false);
  const list = (data ?? []).filter(
    (c) => (diff === "All" || c.difficulty === diff) && (cat === "All" || c.category === cat) && (!detroit || c.tags.includes("Detroit")),
  );
  const chip = (active: boolean) => cn("rounded-sm border px-2.5 py-1 font-mono text-xs transition-colors", active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent");

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h1 className="text-3xl font-bold">Challenges</h1>
          <p className="mt-1 text-muted-foreground">Pick a repo, open the IDE, and pair with the AI.</p></div>
          <Button asChild variant="outline"><Link to="/training"><GraduationCap />Detroit bootcamps & training<ArrowUpRight /></Link></Button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {["All", "Easy", "Medium", "Hard"].map((d) => <button key={d} className={chip(diff === d)} onClick={() => setDiff(d)}>{d}</button>)}
          <span className="mx-2 w-px bg-border" />
          {cats.map((c) => <button key={c} className={chip(cat === c)} onClick={() => setCat(c)}>{c}</button>)}
          <span className="mx-2 w-px bg-border" />
          <button className={chip(detroit)} onClick={() => setDetroit((d) => !d)}>Detroit industries</button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-lg border bg-card" />)}
          {list.map((c) => (
            <Link key={c.id} to="/challenges/$slug" params={{ slug: c.slug }} className="group rounded-lg border bg-card p-5 transition-colors hover:border-primary">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-muted-foreground">{c.category}</span>
                <span className={diffTone(c.difficulty)}>{c.difficulty}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold group-hover:text-primary">{c.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {c.tags.map((t) => <Badge key={t} variant="secondary" className="font-mono text-[10px]">{t}</Badge>)}
                <span className="ml-auto flex items-center gap-1 font-mono text-xs text-muted-foreground"><Clock className="h-3 w-3" />{c.est_minutes}m</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
