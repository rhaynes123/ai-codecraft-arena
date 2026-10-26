# Show AI models + dedicated "What we measure" pages

## 1. Show which model is used
- **Chat panel (workspace):** a small "Model: GPT-6 Luna" tag beside the AI pair chat header and under the typing box, so users see which model answers their prompt.
- **Report page:** a line near the score, "Judged by GPT-6 Sol", so users know which model scored them.
- Both read from the existing model setting, so if the model changes later the labels update automatically.

## 2. Detail pages for each measured skill
Four new public pages, one per scoring dimension:
- `/measures/verification` — Verification Rigor
- `/measures/economy` — Prompt & Context Economy
- `/measures/steering` — Steering & Iteration
- `/measures/correctness` — Correctness & Quality

Each page explains, in plain language:
- What it is and why it matters when working with AI
- What we look at during a session (taken from how scoring actually works, e.g. running tests after applying AI code, prompt length, rejecting bad diffs, visible + hidden test pass rate)
- What a strong vs. weak session looks like
- Tips to improve, plus a "Practice a challenge" button
- Links to the other three skills

Plus a short `/measures` overview page listing all four.

## 3. Hyperlinks
- **Home page:** layout and text stay exactly as they are; only each skill title in the "what we measure" cards becomes a link to its page.
- **Dashboard:** each AI proficiency label next to the radar chart becomes a link to its page.
- **Report page:** the same labels get the same links, for consistency.

## Technical details
- Add a `description`/detail content map keyed by dimension in a browser-safe module next to `DIMENSIONS` in `src/lib/scoring.ts` (or `src/lib/measures.ts`).
- Route `src/routes/measures.$dimension.tsx` with param validation (unknown → notFound) and per-dimension `head()` metadata; `src/routes/measures.index.tsx` for the overview.
- Links via `<Link to="/measures/$dimension" params={{ dimension: d.key }}>`.
- Model labels: friendly-name helper over `CHAT_MODEL` / `JUDGE_MODEL` in `src/lib/ai-models.ts`; small test asserting the friendly names map correctly.
