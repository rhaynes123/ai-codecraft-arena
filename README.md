# Ai Codecraft Arena

Create an interactive technical interview prep web application for software engineers in an AI-driven era (like LeetCode or HackerRank, but evaluating how engineers collaborate with and steer AI coding tools).

Key Product Features & Architecture:
1. Workspace / IDE Interface:
   - Split-pane layout with a file explorer, multi-file code editor (Monaco or syntax-highlighted code editor), browser test runner / output console, and an integrated AI pair-programming chat pane.
   - Live AI Assistant interface in the side pane where candidates ask questions, request diffs, draft implementations, or debug with an AI companion.
   
2. Exercise Catalog (Real-World Repo Challenges):
   - Curated real-world challenge repository (e.g. refactoring legacy async services, resolving tricky concurrency/race condition bugs, migrating API contracts, resolving tricky state machine edge cases).
   - Each challenge includes problem description, acceptance criteria, starter files/codebase, hidden/visible test suites, and hints.

3. In-Browser Test Execution & Runtime:
   - Client-side code evaluation and test suite runner with instant feedback and visual test pass/fail indicators.

4. Multi-Dimensional AI Proficiency Scoring & Rubric:
   - Automated post-submission evaluation rubric scoring across:
     * Verification Rigor (testing AI outputs, checking edge cases)
     * Prompt & Context Economy (clarity, concise framing, avoidance of token bloat)
     * Steering & Iteration Velocity (course-correcting when AI hallucinates or produces flawed code)
     * Solution Correctness & Code Quality (test pass rate, readability)
   - Comprehensive feedback report with radar chart, detailed breakdown, and actionable coaching tips on AI-assisted engineering practices.

5. User Hub & Credit System:
   - Dashboard with user practice streaks, AI Proficiency radar scores over time, challenge history, and credit balance tracking for live AI queries.
   - Clean, dark-mode focused, modern developer-centric UI (Tailwind CSS, shadcn/ui).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ai-codecraft-arena.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/554c5f91-9d46-4bbc-bde1-3bf724098f50).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
