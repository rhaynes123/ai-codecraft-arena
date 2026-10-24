import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Lock, MapPin } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { summarizeReports, useMyReports } from "@/lib/queries";
import { DIMENSIONS, LEVELS, formatSalary, jobAccess, jobMatch, type Scores } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({
    meta: [
      { title: "Job matches — Steer" },
      { name: "description", content: "Job openings matched to your AI-assisted engineering level and strengths." },
      { property: "og:title", content: "Job matches — Steer" },
      { property: "og:description", content: "Roles and salaries that unlock as your level grows." },
    ],
  }),
  component: Jobs,
});

function Jobs() {
  const reports = useMyReports();
  const jobs = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => (await supabase.from("jobs").select("*").order("level").order("salary_max", { ascending: false })).data ?? [],
  });
  const [role, setRole] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minSalary, setMinSalary] = useState(0);

  const sum = summarizeReports(reports.data ?? []);
  const userLevel = sum.ranked ? sum.level.level : 1;
  const filtered = (jobs.data ?? []).filter(
    (j) => (role === "all" || j.role_type === role) && (!remoteOnly || j.remote) && j.salary_max >= minSalary,
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
            <span className="text-xl font-semibold">{LEVELS[userLevel - 1].name} engineer</span>
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

        {[5, 4, 3, 2, 1].map((lvl) => {
          const group = filtered.filter((j) => j.level === lvl);
          if (!group.length) return null;
          const access = jobAccess(lvl, userLevel);
          return (
            <section key={lvl} className="mt-8">
              <h2 className="flex items-center gap-3 font-mono text-sm">
                <span className="font-bold">L{lvl} · {LEVELS[lvl - 1].name}</span>
                <span className={cn("rounded-sm px-1.5 py-0.5 text-[10px] uppercase", access === "open" ? "bg-primary text-primary-foreground" : access === "stretch" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground")}>
                  {access === "open" ? "open to you" : access === "stretch" ? "stretch" : `unlocks at rating ${LEVELS[lvl - 1].min}`}
                </span>
              </h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {group.map((j) => <JobCard key={j.id} job={j} access={access} mine={sum.avg} />)}
              </div>
            </section>
          );
        })}
        <p className="mt-10 text-center text-xs text-muted-foreground">Listings shown are sample roles for demonstration.</p>
      </main>
    </div>
  );
}

function JobCard({ job, access, mine }: { job: any; access: string; mine: Scores | null }) {
  const locked = access === "locked";
  const match = jobMatch(job.required, mine);
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
      </div>
      <p className="mt-3 font-mono text-lg font-bold">{formatSalary(job.salary_min, job.salary_max)}</p>
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
          <a href={job.url} target="_blank" rel="noreferrer">View role <ExternalLink className="ml-1 h-3 w-3" /></a>
        </Button>
      )}
    </div>
  );
}
