# AI-Era Interview Prep ("Steer") — Build Plan

An interview practice platform that scores how well engineers work *with* an AI coding assistant, not just whether their code passes.

## Visual direction
Dark-first developer aesthetic: near-black graphite background, single electric-lime accent for "pass"/primary actions, coral for failures, JetBrains Mono for code and labels with Space Grotesk headings. Dense, IDE-like, no purple gradients.

## Pages
- `/` — Landing: what's measured, the four rubric dimensions, CTA to sign up / browse challenges.
- `/auth` — Email + password and Google sign-in.
- `/dashboard` — Streak, credit balance, latest radar, radar trend over time (line chart per dimension), challenge history table.
- `/challenges` — Catalog with filters (difficulty, category: async refactor, concurrency, API migration, state machines), tags, estimated time.
- `/challenges/$slug` — Brief page: description, acceptance criteria, start button.
- `/workspace/$attemptId` — The IDE (see below).
- `/reports/$attemptId` — Post-submission report: radar chart, per-dimension score with evidence quotes from the session, coaching tips, test results (visible + hidden).

## Workspace (IDE)
```text
+-----------+----------------------------+------------------+
| Files     | Editor tabs (Monaco)       | AI Pair chat     |
| tree      |                            | (streaming,      |
|           |                            |  diff cards w/   |
|           +----------------------------+  Apply / Reject) |
|           | Tests | Console | Brief    | credits left     |
+-----------+----------------------------+------------------+
```
- Resizable panes, multi-file editing, autosave of files to the attempt.
- AI can see open file / selected files the candidate chooses to attach (attaching context is itself scored).
- AI returns proposed edits as diffs the candidate explicitly applies or rejects.
- "Run tests" runs visible tests in-browser; "Submit" runs visible + hidden tests and triggers scoring.
- Hints unlock progressively (usage noted in report).

## Challenge catalog (seeded, 6 to start)
TypeScript/JavaScript challenges, each with starter files, visible tests, hidden tests, hints, and some intentionally tricky spots where AI tends to hallucinate:
1. Callback-hell payment service to async/await without changing retry semantics
2. Race condition in an inventory reservation cache
3. Debounced search with stale-response bug
4. REST v1 to v2 contract migration with backward-compat adapter
5. Order state machine with illegal-transition edge cases
6. Rate limiter token bucket with clock-skew bug

## Scoring
Every session event is logged: prompts, attached context size, AI responses, diffs applied/rejected, edits after apply, test runs, failures, hints.
At submit, scores 0–100 on:
- Verification Rigor — ran tests after applying AI code, added/edited tests, inspected diffs before applying
- Prompt & Context Economy — prompt clarity, token totals, relevant vs. bloated context
- Steering & Iteration Velocity — rejected/corrected flawed AI output, time and turns to recovery
- Correctness & Code Quality — hidden + visible pass rate plus AI review of final code readability
Deterministic metrics from the event log combine with an AI judge pass that reads the transcript and returns structured scores, evidence, and coaching tips.

## Credits
- New users get 200 credits; each AI chat message costs credits based on size (shown before sending). Balance and ledger on dashboard.
- Purchasing more credits is out of scope for v1 (can add payments later); a daily free top-up keeps practice going.

## Technical details
- Lovable Cloud: auth, tables for profiles, challenges (files/tests as JSON), attempts, attempt_files, session_events, reports, credit_ledger; RLS so users only see their own attempts; hidden tests only readable server-side.
- AI via Lovable AI Gateway (default model) in server functions: streaming pair-chat endpoint, structured-output judge for scoring. Credits deducted server-side atomically before each call.
- In-browser test runner: sandboxed iframe/Web Worker executing user code transpiled with Sucrase plus a tiny expect/describe harness, with timeouts. Hidden tests executed the same way after being fetched at submit time (server re-validates results by recording them; acceptable for a practice tool).
- Monaco via `@monaco-editor/react`, loaded client-only. Recharts for radar/trend. `react-resizable-panels` for panes. AI Elements for chat UI.
- Streaks computed from days with at least one submitted attempt.

## Out of scope for v1
Languages other than TS/JS, paid credit packs, team/recruiter views, proctoring.
