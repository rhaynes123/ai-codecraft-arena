import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Lightbulb, PartyPopper, XCircle } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ScoreRadar, scoreTone } from "@/components/ScoreRadar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMyReports } from "@/lib/queries";
import { DIMENSIONS, engineerRating, levelFor } from "@/lib/scoring";

export const Route = createFileRoute("/_authenticated/reports/$attemptId")({
  head: () => ({
    meta: [
      { title: "Feedback report — Steer10x" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Your AI proficiency breakdown, evidence and coaching tips." },
      { property: "og:title", content: "Feedback report — Steer10x" },
      { property: "og:description", content: "AI proficiency breakdown and coaching tips." },
    ],
  }),
  component: Report,
});

function Report() {
  const { attemptId } = Route.useParams();
  const all = useMyReports();
  const { data: r, isLoading } = useQuery({
    queryKey: ["report", attemptId],
    queryFn: async () => (await supabase.from("reports").select("*, challenges(title, slug, difficulty)").eq("attempt_id", attemptId).maybeSingle()).data,
  });
  if (isLoading) return <div className="min-h-screen"><AppHeader /></div>;
  if (!r) return <div className="min-h-screen"><AppHeader /><p className="p-10 text-center text-muted-foreground">Report not found.</p></div>;

  const scores = { verification: r.verification, economy: r.economy, steering: r.steering, correctness: r.correctness };
  const evidence: any = r.evidence ?? {};
  const tips = (r.tips ?? []) as string[];
  const tests = (r.tests ?? {}) as { passed: number; total: number; results: any[] };

  // Level change caused by this submission.
  const list = all.data ?? [];
  const idx = list.findIndex((x) => x.attempt_id === attemptId);
  const toRating = (arr: typeof list) => engineerRating(arr.map((x) => ({ overall: x.overall, difficulty: x.challenges?.difficulty ?? "Medium" })));
  const after = idx >= 0 ? levelFor(toRating(list.slice(idx))) : null;
  const beforeList = idx >= 0 ? list.slice(idx + 1) : [];
  const before = beforeList.length ? levelFor(toRating(beforeList)) : null;
  const leveledUp = after && (!before || after.level > before.level) && after.level > 1;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">report · {r.challenges?.title}</p>
            <h1 className="mt-1 text-3xl font-bold">Overall <span className={`font-mono ${scoreTone(r.overall)}`}>{r.overall}</span><span className="text-lg text-muted-foreground">/100</span></h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/challenges/$slug" params={{ slug: r.challenges?.slug ?? "" }}>Retry</Link></Button>
            <Button asChild><Link to="/dashboard">Dashboard</Link></Button>
          </div>
        </div>

        {leveledUp && after && (
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-primary bg-primary/10 p-4">
            <PartyPopper className="h-6 w-6 text-primary" />
            <div className="flex-1"><p className="font-semibold">You reached L{after.level} · {after.name}</p><p className="text-sm text-muted-foreground">New roles unlocked at this level and one level up.</p></div>
            <Button asChild size="sm"><Link to="/jobs">See new roles</Link></Button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="rounded-lg border bg-card p-5">
            <ScoreRadar scores={scores} height={300} />
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.summary}</p>
          </section>
          <section className="space-y-3">
            {DIMENSIONS.map((d) => (
              <div key={d.key} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{d.label}</h3>
                  <span className={`font-mono text-xl font-bold ${scoreTone(scores[d.key])}`}>{scores[d.key]}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${scores[d.key]}%` }} /></div>
                {evidence[d.key] && <p className="mt-3 text-sm text-muted-foreground">{evidence[d.key]}</p>}
              </div>
            ))}
          </section>
        </div>

        <section className="rounded-lg border bg-card p-5">
          <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground"><Lightbulb className="h-4 w-4 text-warning" />Coaching tips</h2>
          <ol className="mt-3 space-y-2">{tips.map((t, i) => <li key={i} className="flex gap-3 text-sm"><span className="font-mono text-primary">{String(i + 1).padStart(2, "0")}</span>{t}</li>)}</ol>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Tests · {tests.passed}/{tests.total} passed</h2>
          {evidence.stats && (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {evidence.stats.prompts} prompts · {evidence.stats.applies} diffs applied · {evidence.stats.rejects} rejected · {evidence.stats.testRuns} test runs · {evidence.stats.manualEdits} manual edits
            </p>
          )}
          <ul className="mt-3 divide-y">
            {(tests.results ?? []).map((t, i) => (
              <li key={i} className="flex items-start gap-2 py-2 text-sm">
                {t.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> : <XCircle className="mt-0.5 h-4 w-4 text-destructive" />}
                <div className="flex-1"><span>{t.name}</span>{t.hidden && <span className="ml-2 font-mono text-[10px] text-muted-foreground">hidden</span>}{t.error && <p className="font-mono text-xs text-destructive">{t.error}</p>}</div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
