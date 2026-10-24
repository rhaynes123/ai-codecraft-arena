import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, FileCode, Lightbulb, Paperclip, Play, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Logo, useProfile } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { runTests, type TestResult, type VFile } from "@/lib/test-runner";
import { creditCost } from "@/lib/scoring";
import { getHiddenTests, submitAttempt } from "@/lib/attempts.functions";
import { cn } from "@/lib/utils";

const Editor = lazy(() => import("@monaco-editor/react"));

export const Route = createFileRoute("/_authenticated/workspace/$attemptId")({
  head: () => ({
    meta: [
      { title: "Workspace — Steer" },
      { name: "description", content: "AI-paired coding workspace." },
      { property: "og:title", content: "Workspace — Steer" },
      { property: "og:description", content: "AI-paired coding workspace." },
    ],
  }),
  component: Workspace,
});

type Msg = { role: "user" | "assistant"; content: string };
const isTest = (p: string) => p.startsWith("tests/");

function parseBlocks(text: string) {
  const re = /```[a-zA-Z]*\s+path=([^\s`]+)\n([\s\S]*?)```/g;
  const out: { path: string; content: string }[] = [];
  let m;
  while ((m = re.exec(text))) out.push({ path: m[1], content: m[2] });
  return out;
}

function Workspace() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = useProfile();
  const hidden = useServerFn(getHiddenTests);
  const submit = useServerFn(submitAttempt);
  const { data: attempt } = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: async () => (await supabase.from("attempts").select("*, challenges(*)").eq("id", attemptId).single()).data,
  });
  const [files, setFiles] = useState<VFile[]>([]);
  const [active, setActive] = useState("");
  const [attached, setAttached] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [tab, setTab] = useState<"tests" | "console" | "brief">("brief");
  const [decided, setDecided] = useState<Record<string, "applied" | "rejected">>({});
  const [hints, setHints] = useState(0);
  const [busy, setBusy] = useState(false);
  const editTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!attempt) return;
    if (attempt.status !== "in_progress") { navigate({ to: "/reports/$attemptId", params: { attemptId } }); return; }
    const f = attempt.files as VFile[];
    setFiles(f);
    setActive(f[0]?.path ?? "");
    setAttached(f[0] ? [f[0].path] : []);
    setHints(attempt.hints_used);
  }, [attempt?.id]);

  const log = (type: string, payload: Record<string, unknown> = {}) =>
    supabase.from("session_events").insert({ attempt_id: attemptId, user_id: attempt!.user_id, type, payload: payload as any }).then();

  const save = (next: VFile[]) => supabase.from("attempts").update({ files: next as any }).eq("id", attemptId).then();

  function updateFile(path: string, content: string, manual: boolean) {
    setFiles((prev) => {
      const next = prev.map((f) => (f.path === path ? { ...f, content } : f));
      if (!prev.some((f) => f.path === path)) next.push({ path, content });
      if (editTimer.current) clearTimeout(editTimer.current);
      editTimer.current = setTimeout(() => { save(next); if (manual) log("manual_edit", { path }); }, 1500);
      return next;
    });
  }

  async function runVisible() {
    setBusy(true);
    const out = await runTests(files.filter((f) => !isTest(f.path)), files.filter((f) => isTest(f.path)));
    setBusy(false);
    setResults(out.results); setLogs(out.error ? [out.error, ...out.logs] : out.logs); setTab("tests");
    const passed = out.results.filter((r) => r.passed).length;
    log("test_run", { passed, total: out.results.length });
  }

  async function doSubmit() {
    if (!confirm("Submit for scoring? Hidden tests will run and the attempt will be locked.")) return;
    setBusy(true);
    try {
      const h = await hidden({ data: { attemptId } });
      const out = await runTests(files.filter((f) => !isTest(f.path)), [...files.filter((f) => isTest(f.path)), ...h.files.map((f) => ({ ...f, hidden: true }))]);
      await save(files);
      toast.message("Scoring your session…");
      await submit({ data: { attemptId, files, results: out.results.map((r) => ({ ...r, error: r.error?.slice(0, 300) })) } });
      qc.invalidateQueries();
      navigate({ to: "/reports/$attemptId", params: { attemptId } });
    } catch (e: any) {
      toast.error(e.message ?? "Submit failed");
    } finally { setBusy(false); }
  }

  const ctxFiles = files.filter((f) => attached.includes(f.path));
  const ctxChars = ctxFiles.reduce((a, f) => a + f.content.length + f.path.length, 0);
  const cost = creditCost(input.length + ctxChars);

  async function send() {
    if (!input.trim() || streaming) return;
    const text = input.trim();
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs([...next, { role: "assistant", content: "" }]); setInput(""); setStreaming(true);
    log("prompt", { text: text.slice(0, 2000), chars: text.length, contextFiles: attached, contextChars: ctxChars });
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify({ attemptId, messages: next, context: ctxFiles }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "AI request failed" }));
        throw new Error(err.error);
      }
      qc.invalidateQueries({ queryKey: ["profile"] });
      const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: "assistant", content: acc }]);
      }
      if (!acc) throw new Error("The AI returned no answer. Please try again.");
      log("ai_response", { text: acc.slice(0, 3000), chars: acc.length, hasDiff: parseBlocks(acc).length > 0 });
    } catch (e: any) {
      setMsgs(next); toast.error(e.message);
    } finally { setStreaming(false); }
  }

  function decide(key: string, path: string, content: string, apply: boolean) {
    setDecided((d) => ({ ...d, [key]: apply ? "applied" : "rejected" }));
    if (apply) { updateFile(path, content, false); setActive(path); }
    log(apply ? "diff_applied" : "diff_rejected", { path });
  }

  function useHint() {
    const ch = attempt?.challenges as any;
    if (!ch || hints >= ch.hints.length) return;
    const n = hints + 1; setHints(n); setTab("brief");
    supabase.from("attempts").update({ hints_used: n }).eq("id", attemptId).then();
    log("hint", { index: n });
  }

  if (!attempt) return <div className="grid h-screen place-items-center font-mono text-sm text-muted-foreground">loading workspace…</div>;
  const ch = attempt.challenges as any;
  const current = files.find((f) => f.path === active);
  const passed = results?.filter((r) => r.passed).length ?? 0;

  return (
    <div className="flex h-screen flex-col bg-panel">
      <header className="flex h-12 items-center gap-4 border-b bg-background px-3">
        <Logo />
        <span className="truncate text-sm text-muted-foreground">{ch.title}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{profile.data?.credits ?? "—"} credits</span>
          <Button size="sm" variant="outline" onClick={useHint} disabled={hints >= ch.hints.length}><Lightbulb className="mr-1 h-3.5 w-3.5" />Hint ({hints}/{ch.hints.length})</Button>
          <Button size="sm" variant="secondary" onClick={runVisible} disabled={busy}><Play className="mr-1 h-3.5 w-3.5" />Run tests</Button>
          <Button size="sm" onClick={doSubmit} disabled={busy}>Submit</Button>
        </div>
      </header>
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize="16%" minSize="10%">
          <div className="h-full overflow-auto p-2">
            <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Explorer</p>
            {files.map((f) => (
              <div key={f.path} className={cn("group flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-xs", active === f.path ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50")}>
                <button className="flex flex-1 items-center gap-1.5 truncate text-left" onClick={() => setActive(f.path)}><FileCode className="h-3.5 w-3.5 shrink-0" />{f.path}</button>
                <button title="Attach to AI context" onClick={() => setAttached((a) => (a.includes(f.path) ? a.filter((x) => x !== f.path) : [...a, f.path]))}>
                  <Paperclip className={cn("h-3 w-3", attached.includes(f.path) ? "text-primary" : "opacity-0 group-hover:opacity-60")} />
                </button>
              </div>
            ))}
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="54%">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel defaultSize="65%">
              <div className="flex h-8 items-center border-b bg-background px-3 font-mono text-xs text-muted-foreground">{active}</div>
              <Suspense fallback={<div className="p-4 font-mono text-xs text-muted-foreground">loading editor…</div>}>
                {current && (
                  <Editor
                    height="calc(100% - 2rem)"
                    theme="vs-dark"
                    path={current.path}
                    language={current.path.endsWith(".md") ? "markdown" : "typescript"}
                    value={current.content}
                    onChange={(v) => updateFile(current.path, v ?? "", true)}
                    options={{ fontSize: 13, fontFamily: "JetBrains Mono", minimap: { enabled: false }, scrollBeyondLastLine: false }}
                  />
                )}
              </Suspense>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize="35%">
              <div className="flex h-full flex-col bg-background">
                <div className="flex border-b font-mono text-xs">
                  {(["brief", "tests", "console"] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={cn("px-3 py-2", tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground")}>
                      {t}{t === "tests" && results ? ` ${passed}/${results.length}` : ""}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-auto p-3 text-sm">
                  {tab === "brief" && (
                    <div className="space-y-3">
                      <p className="whitespace-pre-line text-muted-foreground">{ch.description}</p>
                      <ul className="list-disc pl-5 text-muted-foreground">{ch.acceptance.map((a: string) => <li key={a}>{a}</li>)}</ul>
                      {ch.hints.slice(0, hints).map((h: string, i: number) => <p key={i} className="rounded-sm border border-warning/40 p-2 text-warning">Hint {i + 1}: {h}</p>)}
                    </div>
                  )}
                  {tab === "tests" && (results ? results.map((r, i) => (
                    <div key={i} className="flex gap-2 py-1 font-mono text-xs">
                      {r.passed ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-destructive" />}
                      <div><div>{r.name}</div>{r.error && <div className="text-destructive">{r.error}</div>}</div>
                    </div>
                  )) : <p className="text-muted-foreground">Run tests to see results.</p>)}
                  {tab === "console" && <pre className="font-mono text-xs text-muted-foreground">{logs.join("\n") || "No output."}</pre>}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="30%" minSize="20%">
          <div className="flex h-full flex-col bg-background">
            <div className="border-b px-3 py-2 font-mono text-xs text-muted-foreground">AI pair · attached: {attached.length} files</div>
            <div className="flex-1 space-y-4 overflow-auto p-3">
              {!msgs.length && <p className="text-sm text-muted-foreground">Ask the AI to explain code, draft a fix, or debug a failing test. Attach files with the clip icon. You're scored on how you verify and steer its output.</p>}
              {msgs.map((m, i) => (
                <div key={i} className={cn("text-sm", m.role === "user" && "rounded-md bg-secondary p-2.5")}>
                  {m.role === "assistant" ? <AssistantMessage text={m.content} idx={i} decided={decided} onDecide={decide} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
                </div>
              ))}
              {streaming && <p className="font-mono text-xs text-primary">thinking…</p>}
            </div>
            <div className="border-t p-2">
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask your AI pair…" rows={3}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[11px] text-muted-foreground">{input ? `costs ${cost} credit${cost > 1 ? "s" : ""}` : "⌘/Ctrl+Enter to send"}</span>
                <Button size="sm" onClick={send} disabled={streaming || !input.trim()}><Send className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function AssistantMessage({ text, idx, decided, onDecide }: { text: string; idx: number; decided: Record<string, string>; onDecide: (k: string, p: string, c: string, a: boolean) => void }) {
  const parts = text.split(/(```[a-zA-Z]*\s+path=[^\s`]+\n[\s\S]*?```)/g);
  return (
    <div className="space-y-2">
      {parts.map((p, j) => {
        const b = parseBlocks(p)[0];
        if (!b) return p.trim() ? <p key={j} className="whitespace-pre-wrap text-foreground/90">{p.trim()}</p> : null;
        const key = `${idx}-${j}`;
        const state = decided[key];
        return (
          <div key={j} className="overflow-hidden rounded-md border">
            <div className="flex items-center justify-between bg-secondary px-2 py-1 font-mono text-[11px]">
              <span>{b.path}</span>
              {state ? <span className={state === "applied" ? "text-success" : "text-destructive"}>{state}</span> : (
                <span className="flex gap-1">
                  <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => onDecide(key, b.path, b.content, true)}>Apply</Button>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => onDecide(key, b.path, b.content, false)}>Reject</Button>
                </span>
              )}
            </div>
            <pre className="max-h-64 overflow-auto bg-panel p-2 font-mono text-[11px]">{b.content}</pre>
          </div>
        );
      })}
    </div>
  );
}
