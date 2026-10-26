import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage } from "ai";
import { createGateway, reasoningOptions } from "@/lib/ai.server";
import { CHAT_MODEL } from "@/lib/ai-models";
import { userClientFromRequest } from "@/lib/supabase-user.server";
import { creditCost } from "@/lib/scoring";

type Body = {
  attemptId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  context: { path: string; content: string }[];
};

const INSTRUCTIONS = `You are an AI pair programmer inside a technical interview practice IDE.
The candidate is being evaluated on how well they steer you, so behave like a realistic coding assistant: helpful, concise, and occasionally imperfect is fine, but never deliberately wrong.
Rules:
- Only use files the candidate attached; if you need another file, ask for it.
- When proposing a change, output the COMPLETE new file content in a fenced block whose info string is the language followed by path=<file path>, e.g. \`\`\`ts path=src/example.ts
- Keep explanations short.
- You CAN run the visible test suite: write the exact token [[run-tests]] on its own line at the end of your reply. The IDE will run the tests against the current files and send you the results in the next message. Use it when verification is useful or the candidate asks; don't loop on it.
- Messages starting with "[test results]" come from the IDE, not the candidate.
- Tests use a minimal harness: test(name, fn), expect(x).toBe/toEqual/toThrow/rejects.toThrow.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const caller = await userClientFromRequest(request);
        if (!caller) return Response.json({ error: "Please sign in again." }, { status: 401 });
        const body = (await request.json()) as Body;
        if (!body.attemptId || !Array.isArray(body.messages) || !body.messages.length) {
          return Response.json({ error: "Invalid request" }, { status: 400 });
        }
        const { data: attempt } = await caller.supabase
          .from("attempts")
          .select("id, status, challenges(title, description)")
          .eq("id", body.attemptId)
          .maybeSingle();
        if (!attempt) return Response.json({ error: "Attempt not found" }, { status: 404 });
        if (attempt.status !== "in_progress") {
          return Response.json({ error: "This attempt is already submitted." }, { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return Response.json(
            { error: "The AI connection is temporarily unavailable. No practice credits were spent. You can still edit code and run tests." },
            { status: 503 },
          );
        }
        const gateway = createGateway(CHAT_MODEL, apiKey, request);

        const last = body.messages[body.messages.length - 1];
        if (!last) return Response.json({ error: "Invalid request" }, { status: 400 });
        const context = (body.context ?? []).slice(0, 10);
        const contextText = context.map((f) => `--- ${f.path} ---\n${f.content}`).join("\n\n");
        const cost = creditCost(last.content.length + contextText.length);
        const { error: spendErr } = await caller.supabase.rpc("spend_credits", { _amount: cost, _reason: "AI pair message" });
        if (spendErr) return Response.json({ error: spendErr.message }, { status: 402 });

        const history: ModelMessage[] = body.messages.slice(-12).map((m, i, arr) => ({
          role: m.role,
          content:
            i === arr.length - 1 && m.role === "user" && contextText
              ? `${m.content}\n\nAttached files:\n${contextText}`
              : m.content,
        }));
        const challenge = attempt.challenges as { title: string; description: string } | null;
        const result = streamText({
          model: gateway.model as any,
          instructions: `${INSTRUCTIONS}\n\nCurrent challenge: ${challenge?.title}\n${challenge?.description}`,
          messages: history,
          abortSignal: request.signal,
          providerOptions: reasoningOptions("low"),
          onError: ({ error }) => console.error("chat stream error", error),
        });
        return result.toTextStreamResponse({ headers: { "X-Credits-Spent": String(cost) } });
      },
    },
  },
});
