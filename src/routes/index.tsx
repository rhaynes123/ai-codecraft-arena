import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bug, Gauge, MessageSquareCode, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { LEVELS } from "@/lib/scoring";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Steer — Interview prep for engineers who code with AI" },
      { name: "description", content: "Solve real-world repo challenges with an AI pair programmer. Get scored on verification, prompt economy, steering and correctness — then see jobs that match your level." },
      { property: "og:title", content: "Steer — Interview prep for engineers who code with AI" },
      { property: "og:description", content: "Real-world challenges, an AI pair programmer, and a rubric that scores how well you steer it." },
    ],
  }),
  component: Landing,
});

const DIMS = [
  { icon: ShieldCheck, title: "Verification Rigor", body: "Do you run tests after applying AI code, and catch the edge cases it missed?" },
  { icon: MessageSquareCode, title: "Prompt & Context Economy", body: "Clear asks, only the files that matter, no token bloat." },
  { icon: Bug, title: "Steering & Iteration", body: "Spot hallucinations, reject bad diffs, recover fast from red tests." },
  { icon: Gauge, title: "Correctness & Quality", body: "Visible and hidden test pass rate plus readable final code." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <section className="grid-bg border-b">
        <div className="mx-auto max-w-7xl px-4 py-24">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">// interview prep for the AI era</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            The interview isn't whether you can code. It's whether you can <span className="text-primary">steer</span> the AI that does.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Fix race conditions, migrate API contracts and untangle legacy async code alongside an AI pair programmer.
            Every prompt, diff and test run is scored — and your level unlocks matching job openings.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/challenges">Browse challenges <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth">Create free account</Link></Button>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">What we measure</h2>
        <div className="mt-6 grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4">
          {DIMS.map((d) => (
            <div key={d.title} className="bg-card p-6">
              <d.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-semibold">{d.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-24">
        <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Level up, unlock roles</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {LEVELS.map((l) => (
            <div key={l.level} className="rounded-lg border bg-card p-4">
              <div className="font-mono text-2xl font-bold text-primary">L{l.level}</div>
              <div className="mt-1 font-medium">{l.name}</div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">rating ≥ {l.min}</div>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t py-8 text-center font-mono text-xs text-muted-foreground">steer.dev — practice like it's 2026</footer>
    </div>
  );
}
