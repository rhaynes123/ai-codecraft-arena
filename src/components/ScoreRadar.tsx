// Lightweight SVG charts (no chart library) — the charting library crashed on page changes.
import { DIMENSIONS, type Dimension, type Scores } from "@/lib/scoring";

export function ScoreRadar({ scores, compare, height = 280 }: { scores: Scores; compare?: Scores | null; height?: number }) {
  const size = 300;
  const c = size / 2;
  const r = 105;
  const n = DIMENSIONS.length;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(a) * r * (v / 100), c + Math.sin(a) * r * (v / 100)] as const;
  };
  const poly = (s: Scores) => DIMENSIONS.map((d, i) => pt(i, s[d.key]).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ height, width: "100%" }} role="img" aria-label="Score radar chart">
      {[25, 50, 75, 100].map((g) => (
        <polygon key={g} points={DIMENSIONS.map((_, i) => pt(i, g).join(",")).join(" ")} fill="none" stroke="var(--border)" />
      ))}
      {DIMENSIONS.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--border)" />;
      })}
      {compare && <polygon points={poly(compare)} fill="var(--chart-2)" fillOpacity={0.12} stroke="var(--chart-2)" />}
      <polygon points={poly(scores)} fill="var(--primary)" fillOpacity={0.3} stroke="var(--primary)" strokeWidth={2} />
      {DIMENSIONS.map((d, i) => {
        const [x, y] = pt(i, 122);
        return (
          <text key={d.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="var(--muted-foreground)" fontSize={12} fontFamily="JetBrains Mono">
            {d.short} {scores[d.key]}
          </text>
        );
      })}
    </svg>
  );
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export function ScoreTrend({ points, height = 300 }: { points: Record<Dimension, number>[]; height?: number }) {
  const w = 600, h = 260, pad = 30;
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
  const y = (v: number) => h - pad - (v / 100) * (h - pad * 2);
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ height, width: "100%" }} preserveAspectRatio="none" role="img" aria-label="Scores over time">
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeDasharray="3 3" />
            <text x={4} y={y(g)} dominantBaseline="middle" fill="var(--muted-foreground)" fontSize={10}>{g}</text>
          </g>
        ))}
        {DIMENSIONS.map((d, k) => (
          <polyline key={d.key} fill="none" stroke={COLORS[k]} strokeWidth={2} points={points.map((p, i) => `${x(i)},${y(p[d.key])}`).join(" ")} />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {DIMENSIONS.map((d, k) => (
          <span key={d.key} className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm" style={{ background: COLORS[k] }} />{d.short}</span>
        ))}
      </div>
    </div>
  );
}

export function scoreTone(n: number) {
  return n >= 75 ? "text-success" : n >= 50 ? "text-warning" : "text-destructive";
}
