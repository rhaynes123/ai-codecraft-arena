// Browser-safe model identifiers; credentials and providers stay server-only.
export const CHAT_MODEL = "openai/gpt-6-luna";
export const JUDGE_MODEL = "openai/gpt-6-luna";

/** Human-friendly label for a gateway model id, e.g. "openai/gpt-6-luna" -> "GPT-6 Luna". */
export function modelLabel(id: string): string {
  const name = id.split("/").pop() ?? id;
  return name
    .split("-")
    .map((p) => (p === "gpt" ? "GPT" : p.charAt(0).toUpperCase() + p.slice(1)))
    .join("-")
    .replace(/^GPT-(\d+)-/, "GPT-$1 ");
}
