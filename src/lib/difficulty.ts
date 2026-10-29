export const diffTone = (d?: string | null) =>
  d === "Easy" ? "text-success" : d === "Medium" ? "text-warning" : "text-destructive";
