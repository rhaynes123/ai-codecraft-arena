import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { averageScores, levelFromReports, type RatedReport, type Scores } from "./scoring";

export type ChallengeRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  difficulty: string;
  est_minutes: number;
  tags: string[];
};

export function useChallenges() {
  return useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, slug, title, summary, category, difficulty, est_minutes, tags")
        .order("sort_order");
      if (error) throw error;
      return data as ChallengeRow[];
    },
  });
}

export type AttemptStatusRow = { challenge_id: string; status: string };

export function useMyAttempts(enabled: boolean) {
  return useQuery({
    queryKey: ["my-attempts"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attempts")
        .select("challenge_id, status");
      if (error) throw error;
      return data as AttemptStatusRow[];
    },
  });
}

/** challenge_id -> "completed" | "in_progress" (first match wins: completed beats in progress) */
export function attemptStatusByChallenge(attempts: AttemptStatusRow[] | undefined) {
  const map = new Map<string, "completed" | "in_progress">();
  for (const a of attempts ?? []) {
    if (a.status === "submitted") map.set(a.challenge_id, "completed");
    else if (a.status === "in_progress" && !map.has(a.challenge_id)) map.set(a.challenge_id, "in_progress");
  }
  return map;
}

/** challenge_id -> total number of attempts (any status) the user has made on it */
export function attemptCountByChallenge(attempts: AttemptStatusRow[] | undefined) {
  const map = new Map<string, number>();
  for (const a of attempts ?? []) map.set(a.challenge_id, (map.get(a.challenge_id) ?? 0) + 1);
  return map;
}

export function useMyReports() {
  return useQuery({
    queryKey: ["my-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("attempt_id, verification, economy, steering, correctness, overall, created_at, challenges(title, slug, difficulty)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function toRated(reports: NonNullable<ReturnType<typeof useMyReports>["data"]>): RatedReport[] {
  return reports.map((r) => ({
    overall: r.overall, difficulty: r.challenges?.difficulty ?? "Medium", slug: r.challenges?.slug,
    scores: { verification: r.verification, economy: r.economy, steering: r.steering, correctness: r.correctness },
  }));
}

export function summarizeReports(reports: NonNullable<ReturnType<typeof useMyReports>["data"]>) {
  const { rating, level } = levelFromReports(toRated(reports));
  const recentScores: Scores[] = reports.slice(0, 5).map((r) => ({
    verification: r.verification, economy: r.economy, steering: r.steering, correctness: r.correctness,
  }));
  return { rating, level, avg: averageScores(recentScores), ranked: reports.length > 0 };
}
