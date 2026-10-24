import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { averageScores, engineerRating, levelFor, type Scores } from "./scoring";

export function useChallenges() {
  return useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, slug, title, summary, category, difficulty, est_minutes, tags")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
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

export function summarizeReports(reports: NonNullable<ReturnType<typeof useMyReports>["data"]>) {
  const rating = engineerRating(reports.map((r) => ({ overall: r.overall, difficulty: r.challenges?.difficulty ?? "Medium" })));
  const recentScores: Scores[] = reports.slice(0, 5).map((r) => ({
    verification: r.verification, economy: r.economy, steering: r.steering, correctness: r.correctness,
  }));
  return { rating, level: levelFor(rating), avg: averageScores(recentScores), ranked: reports.length > 0 };
}
