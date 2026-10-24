// Server-only Lovable AI Gateway helpers (OpenAI Responses via AI SDK).
import { createOpenAI } from "@ai-sdk/openai";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";
export const AI_MODEL = "openai/gpt-6-astra";

export function createGateway(request?: Request) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured (LOVABLE_API_KEY missing)");
  let runId = request?.headers.get(RUN_ID_HEADER)?.trim() || undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN_ID_HEADER)?.trim() || undefined;
      return res;
    },
  });
  return { model: provider.responses(AI_MODEL), getRunId: () => runId };
}

export const reasoningOptions = (effort: "low" | "medium" = "low") => ({
  openai: {
    forceReasoning: true,
    reasoningEffort: effort,
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
});
