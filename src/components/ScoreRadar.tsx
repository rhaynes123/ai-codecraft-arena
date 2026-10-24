import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { DIMENSIONS, type Scores } from "@/lib/scoring";

export function ScoreRadar({ scores, compare, height = 280 }: { scores: Scores; compare?: Scores | null; height?: number }) {
  const data = DIMENSIONS.map((d) => ({ dim: d.short, value: scores[d.key], prev: compare?.[d.key] ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="dim" tick={{ fill: "var(--muted-foreground)", fontSize: 12, fontFamily: "JetBrains Mono" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        {compare && <Radar dataKey="prev" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.12} />}
        <Radar dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function scoreTone(n: number) {
  return n >= 75 ? "text-success" : n >= 50 ? "text-warning" : "text-destructive";
}
