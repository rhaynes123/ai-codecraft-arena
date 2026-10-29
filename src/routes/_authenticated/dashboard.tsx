import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { Coins, Flame, Trophy } from "lucide-react";
import { AppHeader, useProfile } from "@/components/AppHeader";
import { ScoreRadar, ScoreTrend, scoreTone } from "@/components/ScoreRadar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { summarizeReports, useChallenges, useMyReports } from "@/lib/queries";
import { DIMENSIONS, practiceStreak } from "@/lib/scoring";
import { diffTone } from "@/lib/difficulty";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Steer10x" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Your AI proficiency scores, level, streak and credits." },
      { property: "og:title", content: "Dashboard — Steer10x" },
      { property: "og:description", content: "Track your AI-assisted engineering progress." },
    ],
  }),
  component: Dashboard,
});


function Dashboard() {
  const qc = useQueryClient();
  const profile = useProfile();
  const reports = useMyReports();
  const ledger = useQuery({
    queryKey: ["ledger"],
    queryFn: async () => (await supabase.from("credit_ledger").select("*").order("created_at", { ascending: false }).limit(8)).data ?? [],
  });
  const inProgress = useQuery({
    queryKey: ["in-progress"],
    queryFn: async () => (await supabase.from("attempts").select("id, started_at, challenges(title, difficulty)").eq("status", "in_progress").order("started_at", { ascending: false }).limit(5)).data ?? [],
  });

  useEffect(() => {
    supabase.rpc("claim_daily_credits").then(({ data }) => {
      if (data && data > 0) {
        toast.success(`+${data} daily practice credits`);
        qc.invalidateQueries({ queryKey: ["profile"] });
        qc.invalidateQueries({ queryKey: ["ledger"] });
      }
    });
  }, [qc]);

  const challenges = useChallenges();
  const inDetroit = (profile.data as any)?.region === "detroit";
  async function toggleDetroit(on: boolean) {
    const { error } = await supabase.rpc("set_region", { _region: on ? "detroit" : (null as any) });
    if (error) { toast.error("Couldn't save that setting. Try again."); return; }
    qc.invalidateQueries({ queryKey: ["profile"] });
  }
  const done = new Set((reports.data ?? []).map((r) => r.challenges?.slug));
  const localPicks = (challenges.data ?? []).filter((c) => c.tags.includes("Detroit") && !done.has(c.slug));

  const list = reports.data ?? [];
  const sum = summarizeReports(list);
  const streak = practiceStreak(list.map((r) => r.created_at));
  const trend = [...list].reverse().map((r, i) => ({ n: i + 1, ...Object.fromEntries(DIMENSIONS.map((d) => [d.key, (r as any)[d.key]])) }));

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">welcome back</p>
            <h1 className="text-3xl font-bold">{profile.data?.display_name ?? "Engineer"}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="detroit" checked={inDetroit} onCheckedChange={toggleDetroit} />
              <Label htmlFor="detroit" className="text-sm">I'm in Detroit Metro</Label>
            </div>
            <Button asChild><Link to="/challenges">Start a challenge</Link></Button>
          </div>
        </div>

        {inDetroit && localPicks.length > 0 && (
          <section className="rounded-lg border bg-card p-5">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">suggested for Detroit Metro</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {localPicks.map((c) => (
                <Link key={c.id} to="/challenges/$slug" params={{ slug: c.slug }} className="rounded-md border p-4 transition-colors hover:border-primary">
                  <div className="font-mono text-xs text-muted-foreground">{c.category} · {c.difficulty}</div>
                  <div className="mt-1 font-semibold">{c.title}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Stat icon={<Trophy className="h-4 w-4 text-primary" />} label="Level">
            <div className="font-mono text-3xl font-bold">{sum.ranked ? `L${sum.level.level}` : "—"}</div>
            <div className="text-sm text-muted-foreground">{sum.ranked ? sum.level.name : "Submit a challenge to get ranked"}</div>
            {sum.ranked && sum.level.next && (
              <div className="mt-3">
                <Progress value={sum.level.progress * 100} className="h-1.5" />
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">rating {sum.rating}</div>
                {sum.level.missing.length > 0 && <div className="mt-1 text-[11px] text-muted-foreground">{sum.level.next.name} needs: {sum.level.missing.join(" · ")}</div>}
              </div>
            )}
          </Stat>
          <Stat icon={<Flame className="h-4 w-4 text-warning" />} label="Streak">
            <div className="font-mono text-3xl font-bold">{streak}<span className="text-base text-muted-foreground"> days</span></div>
            <div className="text-sm text-muted-foreground">{list.length} challenges submitted</div>
          </Stat>
          <Stat icon={<Coins className="h-4 w-4 text-warning" />} label="Credits">
            <div className="font-mono text-3xl font-bold">{profile.data?.credits ?? "—"}</div>
            <div className="text-sm text-muted-foreground">+25 free every day you practice</div>
          </Stat>
          <Stat icon={<Trophy className="h-4 w-4 text-chart-2" />} label="Matching roles">
            <div className="font-mono text-3xl font-bold">{sum.ranked ? `L${sum.level.level}–L${Math.min(5, sum.level.level + 1)}` : "L1"}</div>
            <Link to="/jobs" className="text-sm text-primary hover:underline">See job openings →</Link>
          </Stat>
        </div>

        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <Panel title="AI proficiency (last 5)">
            {sum.avg ? (
              <>
                <ScoreRadar scores={sum.avg} />
                <div className="grid grid-cols-2 gap-2">
                  {DIMENSIONS.map((d) => (
                    <div key={d.key} className="flex justify-between rounded-sm border px-2 py-1.5 text-xs"><Link to="/measures/$dimension" params={{ dimension: d.key }} title={d.label} className="text-muted-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary">{d.short}</Link><span className={`font-mono font-bold ${scoreTone(sum.avg![d.key])}`}>{sum.avg![d.key]}</span></div>
                  ))}
                </div>
              </>
            ) : <Empty />}
          </Panel>
          <Panel title="Scores over time">
            {trend.length > 1 ? (
              <ScoreTrend points={trend as any} />
            ) : <p className="py-16 text-center text-sm text-muted-foreground">Submit two or more challenges to see your trend.</p>}
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Panel title="Challenge history">
            {inProgress.data?.map((a) => (
              <Link key={a.id} to="/workspace/$attemptId" params={{ attemptId: a.id }} className="flex items-center justify-between border-b py-2.5 text-sm hover:text-primary">
                <span>{a.challenges?.title}</span><span className="font-mono text-xs text-warning">in progress → resume</span>
              </Link>
            ))}
            {list.map((r) => (
              <Link key={r.attempt_id} to="/reports/$attemptId" params={{ attemptId: r.attempt_id }} className="flex items-center justify-between border-b py-2.5 text-sm hover:text-primary">
                <span>{r.challenges?.title}</span>
                <span className="flex items-center gap-4 font-mono text-xs"><span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span><span className={`font-bold ${scoreTone(r.overall)}`}>{r.overall}</span></span>
              </Link>
            ))}
            {!list.length && !inProgress.data?.length && <Empty />}
          </Panel>
          <Panel title="Credit activity">
            {ledger.data?.map((l) => (
              <div key={l.id} className="flex justify-between border-b py-2 text-sm">
                <span className="text-muted-foreground">{l.reason}</span>
                <span className={`font-mono ${l.delta > 0 ? "text-success" : "text-muted-foreground"}`}>{l.delta > 0 ? "+" : ""}{l.delta}</span>
              </div>
            ))}
          </Panel>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return <div className="rounded-lg border bg-card p-5"><div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">{icon}{label}</div>{children}</div>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border bg-card p-5"><h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">{title}</h2>{children}</section>;
}
function Empty() {
  return <p className="py-10 text-center text-sm text-muted-foreground">Nothing yet. <Link to="/challenges" className="text-primary hover:underline">Try a challenge</Link>.</p>;
}
