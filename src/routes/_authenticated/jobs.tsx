import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Lock, MapPin, RotateCw } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { summarizeReports, useMyReports } from "@/lib/queries";
import { DIMENSIONS, LEVELS, formatSalary, jobAccess, jobMatch, type Scores } from "@/lib/scoring";
import type { LiveJob } from "@/lib/job-feed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({
    meta: [
      { title: "Job matches — Steer" },
      { name: "description", content: "Live engineering openings matched to your AI-assisted engineering level and strengths." },
      { property: "og:title", content: "Job matches — Steer" },
      { property: "og:description", content: "Real roles and salaries that unlock as your level grows." },
    ],
  }),
  component: Jobs,
});

async function fetchLiveJobs(): Promise<LiveJob[]> {
  const res = await fetch("/api/public/jobs?limit=150");
  if (!res.ok) throw new Error(`Job feed request failed (${res.status})`);
  const body = await res.json();
  return (body.jobs ?? []) as LiveJob[];
}

function Jobs() {
  const reports = useMyReports();
  const jobs = useQuery({ queryKey: ["live-jobs"], queryFn: fetchLiveJobs, staleTime: 60_000 });
  const [role, setRole] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minSalary, setMinSalary] = useState(0);

  const sum = summarizeReports(reports.data ?? []);
  const userLevel = sum.ranked ? sum.level.level : 1;
  const filtered = (jobs.data ?? []).filter(
    (j) =>
      (role === "all" || j.role_type === role) &&
      (!remoteOnly || j.remote) &&
      (!minSalary || (j.salary_max || j.salary_min) >= minSalary),
  );
  const chip = (a: boolean) => cn("rounded-sm border px-2.5 py-1 font-mono text-xs", a ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent");

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg border bg-card p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">your level</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-4xl font-bold text-primary">L{userLevel}</span>
            <span className="text-xl font-semibold">{LEVELS[userLevel - 1]!.name} engineer</span>
            {sum.ranked ? <span className="font-mono text-sm text-muted-foreground">rating {sum.rating}</span> : <span className="text-sm text-muted-foreground">— submit a challenge to get your real level</span>}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Roles at L{userLevel} and below are open to you, L{Math.min(5, userLevel + 1)} roles are stretch goals, and higher levels unlock as your rating climbs.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {["all", "frontend", "backend", "full-stack", "platform"].map((r) => <button key={r} className={chip(role === r)} onClick={() => setRole(r)}>{r}</button>)}
          <span className="mx-2 h-5 w-px bg-border" />
          {[0, 120000, 180000, 250000].map((s) => <button key={s} className={chip(minSalary === s)} onClick={() => setMinSalary(s)}>{s ? `$${s / 1000}k+` : "any salary"}</button>)}
          <div className="ml-auto flex items-center gap-2"><Switch id="remote" checked={remoteOnly} onCheckedChange={setRemoteOnly} /><Label htmlFor="remote" className="text-sm">Remote only</Label></div>
        </div>

        {jobs.isLoading && (
          <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-lg border bg-card" />)}
          </div>
        )}

        {jobs.isError && (
          <div className="mt-8 rounded-lg border border-destructive/40 bg-card p-6 text-center">
            <p className="text-sm">The job feeds didn't answer. Nothing was lost — your level and history are untouched.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => jobs.refetch()}>
              <RotateCw className="mr-1 h-3 w-3" /> Try again
            </Button>
          </div>
        )}

        {!jobs.isLoading && !jobs.isError && !filtered.length && (
          <p className="mt-8 rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            No live openings match these filters right now. Try widening the role or salary.
          </p>
        )}

        {[5, 4, 3, 2, 1].map((lvl) => {
          const group = filtered.filter((j) => j.level === lvl);
          if (!group.length) return null;
          const access = jobAccess(lvl, userLevel);
          return (
            <section key={lvl} className="mt-8">
              <h2 className="flex items-center gap-3 font-mono text-sm">
                <span className="font-bold">L{lvl} · {LEVELS[lvl - 1]!.name}</span>
                <span className={cn("rounded-sm px-1.5 py-0.5 text-[10px] uppercase", access === "open" ? "bg-primary text-primary-foreground" : access === "stretch" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground")}>
                  {access === "open" ? "open to you" : access === "stretch" ? "stretch" : `unlocks at rating ${LEVELS[lvl - 1]!.min}`}
                </span>
              </h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {group.map((j) => <JobCard key={j.id} job={j} access={access} mine={sum.avg} />)}
              </div>
            </section>
          );
        })}
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Live openings pulled from Remote OK, Remotive and the current Hacker News "Who is hiring" thread. Each card links to the original posting.
        </p>
      </main>
    </div>
  );
}

function JobCard({ job, access, mine }: { job: LiveJob; access: string; mine: Scores | null }) {
  const locked = access === "locked";
  const match = jobMatch(job.required, mine);
  const salary = job.salary_min ? formatSalary(job.salary_min, job.salary_max || job.salary_min) : "Salary not listed";
  return (
    <div className={cn("relative rounded-lg border bg-card p-5", locked && "opacity-55")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{job.title}</h3>
          <p className="text-sm text-muted-foreground">{job.company}</p>
        </div>
        {locked ? <Lock className="h-4 w-4 text-muted-foreground" /> : <span className={cn("font-mono text-sm font-bold", match >= 85 ? "text-success" : match >= 60 ? "text-warning" : "text-muted-foreground")}>{match}%</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
        <Badge variant="secondary" className="font-mono text-[10px]">{job.role_type}</Badge>
        <Badge variant="outline" className="font-mono text-[10px]">{job.source}</Badge>
      </div>
      <p className="mt-3 font-mono text-lg font-bold">{salary}</p>
      <p className="mt-2 text-sm text-muted-foreground">{job.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.entries(job.required as Record<string, number>).map(([k, v]) => {
          const d = DIMENSIONS.find((x) => x.key === k);
          const ok = mine && (mine as any)[k] >= v;
          return <span key={k} className={cn("rounded-sm border px-1.5 py-0.5 font-mono text-[10px]", ok ? "border-primary text-primary" : "text-muted-foreground")}>{d?.short} {v}+</span>;
        })}
      </div>
      {locked ? (
        <Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link to="/challenges">Level up to unlock</Link></Button>
      ) : (
        <Button asChild size="sm" variant={access === "open" ? "default" : "outline"} className="mt-4 w-full">
          <a href={job.url} target="_blank" rel="noreferrer noopener">View role <ExternalLink className="ml-1 h-3 w-3" /></a>
        </Button>
      )}
    </div>
  );
}
