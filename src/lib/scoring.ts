// Pure scoring, level and job-matching rules. Shared by server and UI.

export type SessionEvent = { type: string; payload: any; created_at?: string };
export type Dimension = "verification" | "economy" | "steering" | "correctness";
export const DIMENSIONS: { key: Dimension; label: string; short: string }[] = [
  { key: "verification", label: "Verification Rigor", short: "Verify" },
  { key: "economy", label: "Prompt & Context Economy", short: "Economy" },
  { key: "steering", label: "Steering & Iteration", short: "Steering" },
  { key: "correctness", label: "Correctness & Quality", short: "Correct" },
];
export type Scores = Record<Dimension, number>;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Credits charged for one AI message: 1 per 500 characters of prompt + attached context, minimum 1. */
export function creditCost(chars: number): number {
  return Math.max(1, Math.ceil(chars / 500));
}

/** Economy adjustment from credits spent vs the 20-credit attempt budget: +5 at 0 spent, -5 at the full budget. */
export function creditEconomyAdjustment(creditsSpent: number, budget = 20): number {
  const used = Math.max(0, Math.min(1, creditsSpent / budget));
  return Math.round(5 - used * 10);
}

/** Deterministic metrics from the session event log. */
export function computeMetrics(events: SessionEvent[], passRate: number, creditsSpent = 0) {
  const prompts = events.filter((e) => e.type === "prompt");
  const applies = events.filter((e) => e.type === "diff_applied");
  const rejects = events.filter((e) => e.type === "diff_rejected");
  const testRuns = events.filter((e) => e.type === "test_run");
  const manualEdits = events.filter((e) => e.type === "manual_edit");

  // Verification: was each applied diff followed by a test run before the next apply?
  let verifiedApplies = 0;
  events.forEach((e, i) => {
    if (e.type !== "diff_applied") return;
    for (let j = i + 1; j < events.length; j++) {
      if (events[j]!.type === "test_run") { verifiedApplies++; break; }
      if (events[j]!.type === "diff_applied") break;
    }
  });
  const applyCoverage = applies.length ? verifiedApplies / applies.length : testRuns.length ? 1 : 0;
  const verification = clamp(
    applyCoverage * 60 + Math.min(testRuns.length, 4) * 7 + (manualEdits.length > 0 ? 12 : 0),
  );

  // Economy: prompt length sweet spot 40-700 chars, context under 8k chars per prompt.
  let economy = 70;
  if (prompts.length) {
    const scores = prompts.map((p) => {
      const chars = Number(p.payload.chars ?? 0);
      const ctx = Number(p.payload.contextChars ?? 0);
      let s = 100;
      if (chars < 40) s -= 25;
      if (chars > 700) s -= Math.min(40, (chars - 700) / 40);
      if (ctx > 8000) s -= Math.min(40, (ctx - 8000) / 300);
      return s;
    });
    economy = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (prompts.length > 12) economy -= Math.min(25, (prompts.length - 12) * 3);
    economy += creditEconomyAdjustment(creditsSpent);
  }

  // Steering: rejecting/correcting AI output and recovering from failing runs.
  const failedThenPassed = testRuns.some((r, i) =>
    r.payload.passed < r.payload.total && testRuns.slice(i + 1).some((n) => n.payload.passed === n.payload.total),
  );
  let steering = 45 + Math.min(rejects.length, 3) * 10 + (manualEdits.length ? 10 : 0) + (failedThenPassed ? 15 : 0);
  if (!prompts.length) steering = 50;

  const correctness = clamp(passRate * 100);
  return {
    scores: { verification, economy: clamp(economy), steering: clamp(steering), correctness } as Scores,
    stats: {
      prompts: prompts.length,
      applies: applies.length,
      rejects: rejects.length,
      testRuns: testRuns.length,
      manualEdits: manualEdits.length,
      verifiedApplies,
      creditsSpent,
    },
  };
}

/** Final score: 60% event metrics + 40% AI judge; correctness is 80% pass rate + 20% judged quality. */
export function combineScores(metrics: Scores, judge: Scores): Scores {
  return {
    verification: clamp(metrics.verification * 0.6 + judge.verification * 0.4),
    economy: clamp(metrics.economy * 0.6 + judge.economy * 0.4),
    steering: clamp(metrics.steering * 0.6 + judge.steering * 0.4),
    correctness: clamp(metrics.correctness * 0.8 + judge.correctness * 0.2),
  };
}

export function overallScore(s: Scores): number {
  return clamp((s.verification + s.economy + s.steering + s.correctness) / 4);
}

// ---------- Levels ----------
export const LEVELS = [
  { level: 1, name: "Junior", min: 0 },
  { level: 2, name: "Mid-level", min: 40 },
  { level: 3, name: "Senior", min: 55 },
  { level: 4, name: "Staff", min: 70 },
  { level: 5, name: "Principal", min: 85 },
] as const;

const DIFFICULTY_WEIGHT: Record<string, number> = { Easy: 0.85, Medium: 1, Hard: 1.15 };

/** Rating = average of the 5 most recent overall scores, weighted by difficulty, capped at 100. */
export function engineerRating(reports: { overall: number; difficulty: string }[]): number {
  const recent = reports.slice(0, 5);
  if (!recent.length) return 0;
  const vals = recent.map((r) => Math.min(100, r.overall * (DIFFICULTY_WEIGHT[r.difficulty] ?? 1)));
  return clamp(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function levelFor(rating: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const l of LEVELS) if (rating >= l.min) current = l;
  const next = LEVELS.find((l) => l.level === current.level + 1) ?? null;
  const progress = next ? (rating - current.min) / (next.min - current.min) : 1;
  return { ...current, next, progress: Math.max(0, Math.min(1, progress)) };
}

// ---------- Jobs ----------
export type JobAccess = "open" | "stretch" | "locked";
/** Jobs at or below your level are open, one level up is a stretch, higher are locked. */
export function jobAccess(jobLevel: number, userLevel: number): JobAccess {
  if (jobLevel <= userLevel) return "open";
  if (jobLevel === userLevel + 1) return "stretch";
  return "locked";
}

/** Match % = average over required dimensions of min(1, yours / required). */
export function jobMatch(required: Partial<Scores>, mine: Scores | null): number {
  const keys = Object.keys(required) as Dimension[];
  if (!keys.length) return 100;
  if (!mine) return 0;
  const parts = keys.map((k) => Math.min(1, (mine[k] ?? 0) / Math.max(1, required[k] ?? 1)));
  return clamp((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}

export function averageScores(list: Scores[]): Scores | null {
  if (!list.length) return null;
  const out = { verification: 0, economy: 0, steering: 0, correctness: 0 } as Scores;
  for (const s of list) for (const d of DIMENSIONS) out[d.key] += s[d.key];
  for (const d of DIMENSIONS) out[d.key] = clamp(out[d.key] / list.length);
  return out;
}

/** Consecutive days (ending today or yesterday) with at least one submission. */
export function practiceStreak(dates: string[], today = new Date()): number {
  const days = new Set(dates.map((d) => new Date(d).toISOString().slice(0, 10)));
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function formatSalary(min: number, max: number) {
  const k = (n: number) => `$${Math.round(n / 1000)}k`;
  return max && max !== min ? `${k(min)} – ${k(max)}` : k(min);
}
