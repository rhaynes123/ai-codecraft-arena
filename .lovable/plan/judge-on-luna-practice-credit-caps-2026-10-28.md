# Judge on Luna + practice credit caps

## What changes for users
- Submission reports are scored by GPT-6 Luna (the report label updates automatically to "judged by GPT-6 Luna").
- Each challenge attempt has a **20-credit budget**. The chat shows "X / 20 credits used this attempt". When the budget is used up, the AI chat is disabled with a message explaining they can still edit, run tests and submit. No credits are taken for a message that would go over the budget.
- Each user can spend at most **40 credits per day** (UTC day) across all attempts. Hitting it shows a "Daily AI limit reached — resets at midnight UTC" message; editing, tests and submitting still work.
- Reports show credits spent on the attempt, and the Economy score rewards finishing with fewer credits.

## Steps
1. Set the judge model to Luna (keep separate chat/judge settings so they can diverge later); update the model test.
2. Database: add a `credits_spent` counter to attempts; update the credit-spending function so it atomically checks both the 20-per-attempt and 40-per-day limits before deducting, and records spend against the attempt.
3. Chat endpoint: pass the attempt to the spending check; return a clear "limit reached" response (no credits spent, no AI call) naming which cap was hit.
4. Workspace: show the attempt budget meter next to the model label; disable sending with an explanation at the cap; include AI-triggered test follow-ups in the same budget.
5. Scoring: add a small Economy bonus/penalty from credits spent vs the 20 budget; show credits spent on the report.
6. Tests: one per rule — judge model is Luna; 20-credit attempt cap blocks the over-budget message; 40-credit daily cap blocks across attempts; Economy uses credits spent. Then a signed-in browser check of the meter and the cap message.
7. Save the caps (20/attempt, 40/day) to project memory and update the README and roadmap.

## Technical details
- Caps live in one browser-safe constants module shared by server, UI and tests; the database function enforces them as the source of truth.
- Daily total is summed from the existing credit ledger for the current UTC day.
