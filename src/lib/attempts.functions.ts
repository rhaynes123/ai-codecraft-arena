import { createServerFn } from "@tanstack/react-start";
import { streamText, Output, jsonSchema } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { combineScores, computeMetrics, overallScore, type Scores } from "./scoring";
import { JUDGE_MODEL } from "./ai-models";

type TestSummary = { name: string; file: string; passed: boolean; error?: string | undefined; hidden?: boolean | undefined };

async function ownedAttempt(supabase: any, attemptId: string) {
  const { data, error } = await supabase
    .from("attempts")
    .select("id, user_id, status, challenge_id, hints_used, started_at, challenges(title, description, acceptance, difficulty)")
    .eq("id", attemptId)
    .maybeSingle();
  if (error || !data) throw new Error("Attempt not found");
  return data;
}

export const getHiddenTests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string }) => input)
  .handler(async ({ data, context }) => {
    const attempt = await ownedAttempt(context.supabase, data.attemptId);
    if (attempt.status !== "in_progress") throw new Error("Attempt already submitted");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("challenge_hidden_tests")
      .select("files")
      .eq("challenge_id", attempt.challenge_id)
      .maybeSingle();
    return { files: (row?.files ?? []) as { path: string; content: string }[] };
  });

const judgeSchema = jsonSchema<{
  verification: number; economy: number; steering: number; correctness: number;
  summary: string;
  evidence: { verification: string; economy: string; steering: string; correctness: string };
  tips: string[];
}>({
  type: "object",
  additionalProperties: false,
  required: ["verification", "economy", "steering", "correctness", "summary", "evidence", "tips"],
  properties: {
    verification: { type: "integer" },
    economy: { type: "integer" },
    steering: { type: "integer" },
    correctness: { type: "integer" },
    summary: { type: "string" },
    evidence: {
      type: "object",
      additionalProperties: false,
      required: ["verification", "economy", "steering", "correctness"],
      properties: {
        verification: { type: "string" },
        economy: { type: "string" },
        steering: { type: "string" },
        correctness: { type: "string" },
      },
    },
    tips: { type: "array", items: { type: "string" } },
  },
});

export const submitAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string; files: { path: string; content: string }[]; results: TestSummary[] }) => input)
  .handler(async ({ data, context }) => {
    const attempt = await ownedAttempt(context.supabase, data.attemptId);
    if (attempt.status !== "in_progress") throw new Error("Attempt already submitted");

    const { data: events } = await context.supabase
      .from("session_events")
      .select("type, payload, created_at")
      .eq("attempt_id", data.attemptId)
      .order("created_at", { ascending: true })
      .limit(1000);
    const evs = (events ?? []) as { type: string; payload: any; created_at: string }[];
    const total = data.results.length;
    const passed = data.results.filter((r) => r.passed).length;
    const passRate = total ? passed / total : 0;
    const metrics = computeMetrics(evs, passRate);

    // Transcript for the judge (truncated).
    const transcript = evs
      .map((e) => {
        const p = e.payload ?? {};
        if (e.type === "prompt") return `CANDIDATE PROMPT (${p.contextFiles?.length ?? 0} files, ${p.contextChars ?? 0} ctx chars): ${String(p.text ?? "").slice(0, 600)}`;
        if (e.type === "ai_response") return `AI: ${String(p.text ?? "").slice(0, 500)}`;
        if (e.type === "test_run") return `TEST RUN: ${p.passed}/${p.total} passed`;
        if (e.type === "diff_applied") return `APPLIED AI DIFF to ${p.path}`;
        if (e.type === "diff_rejected") return `REJECTED AI DIFF to ${p.path}`;
        if (e.type === "manual_edit") return `MANUAL EDIT in ${p.path}`;
        if (e.type === "hint") return `USED HINT #${p.index}`;
        return null;
      })
      .filter(Boolean)
      .join("\n")
      .slice(-14000);
    const ch = attempt.challenges as { title: string; description: string; acceptance: string[] };
    const finalCode = data.files
      .filter((f) => f.path.startsWith("src/"))
      .map((f) => `--- ${f.path} ---\n${f.content}`)
      .join("\n\n")
      .slice(0, 12000);

    let judge: Scores = { ...metrics.scores };
    let summary = "Scored from your session activity.";
    let evidence: Record<string, string> = {};
    let tips: string[] = [];
    try {
      const { createGateway, reasoningOptions } = await import("./ai.server");
      const gateway = createGateway(JUDGE_MODEL);
      const result = streamText({
        model: gateway.model as any,
        instructions:
          "You are an expert interviewer grading how a software engineer collaborated with an AI coding assistant. Score each dimension 0-100. verification: did they test and scrutinize AI output? economy: were prompts clear, concise, with only relevant context? steering: did they catch and correct flawed AI output and iterate efficiently? correctness: readability and quality of the final code (tests are scored separately). Cite concrete evidence from the transcript in one or two sentences per dimension. Give 3-5 specific, actionable coaching tips. Write the summary in second person, 2-3 sentences.",
        prompt: `Challenge: ${ch.title}\n${ch.description}\nAcceptance criteria:\n- ${ch.acceptance.join("\n- ")}\n\nTests: ${passed}/${total} passed (incl. hidden).\nHints used: ${attempt.hints_used}\nSession stats: ${JSON.stringify(metrics.stats)}\n\nTranscript:\n${transcript || "(no AI interaction)"}\n\nFinal code:\n${finalCode}`,
        output: Output.object({ schema: judgeSchema }),
        providerOptions: reasoningOptions("low"),
      });
      const out = await result.output;
      judge = { verification: out.verification, economy: out.economy, steering: out.steering, correctness: out.correctness };
      summary = out.summary;
      evidence = out.evidence;
      tips = out.tips;
    } catch (e) {
      console.error("judge failed", e);
      tips = ["Run the test suite after every AI change you apply.", "Attach only the files the AI needs to answer."];
    }

    const scores = combineScores(metrics.scores, judge);
    const overall = overallScore(scores);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: repErr } = await supabaseAdmin.from("reports").insert({
      attempt_id: data.attemptId,
      user_id: context.userId,
      challenge_id: attempt.challenge_id,
      ...scores,
      overall,
      summary,
      evidence: { ...evidence, stats: metrics.stats, metrics: metrics.scores, judge } as any,
      tips: tips as any,
      tests: { passed, total, results: data.results.slice(0, 100) } as any,
    });
    if (repErr) throw new Error(repErr.message);
    await supabaseAdmin
      .from("attempts")
      .update({ status: "submitted", submitted_at: new Date().toISOString(), files: data.files as any })
      .eq("id", data.attemptId);
    return { overall };
  });
