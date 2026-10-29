# Make levels feel earned

Today your level comes only from the average of your last 5 scores, so a few strong results can reach Principal. The new rules add three requirements: how much you've done, how hard it was, and how steady your scores are.

## New level rules

A level is reached only when **all** of its requirements are met:

| Level | Rating | Distinct challenges submitted | Other gates |
|---|---|---|---|
| L1 Junior | 0 | 0 | none |
| L2 Mid-level | 50 | 3 | none |
| L3 Senior | 65 | 8 | at least 2 Hard challenges |
| L4 Staff | 78 | 15 | at least 5 Hard, every skill averages 65+ |
| L5 Principal | 90 | 25 | at least 8 Hard, every skill averages 75+ |

- **Rating** becomes the average of your best attempt on each of your last 10 *distinct* challenges, weighted by difficulty. Repeating the same challenge no longer pads it.
- **Confidence ramp:** with fewer than 10 distinct challenges, the rating is pulled toward 50 (for example, 5 challenges counts half your result and half 50). A hot streak early on can't jump straight to the top.
- Only Hard challenges count toward the Hard gates. At 11 exercises you'd land around Senior at most, depending on your scores.

## What you'll see

- **Dashboard level card:** the progress bar now lists what's missing for the next level, e.g. "Staff needs: 4 more challenges · 2 more Hard · Steering 65+".
- **Jobs page:** locked roles show the same checklist instead of only "unlocks at rating X".
- **Report page:** the "New roles unlocked" note uses the new rules.
- **Home page:** the level ladder shows the new thresholds and a line saying levels also need volume and Hard challenges.
- Existing users are recalculated automatically. Some will drop a level, including you. Nothing is stored, so no data changes.

## Technical details

- `src/lib/scoring.ts`: new `LEVELS` entries with `minRating`, `minChallenges`, `minHard`, `minDimension`; new `engineerRating(reports)` (dedupe by challenge slug keeping best, last 10, difficulty weight, shrink toward 50 by `n/10`); `levelFor({ rating, distinct, hard, avg })` returns level, next, progress, and a `missing[]` list of unmet requirements.
- `summarizeReports` in `src/lib/queries.ts` passes the challenge slug and difficulty; the report route's before/after comparison uses the same inputs.
- Update `scoring.test.ts`: one test per gate (rating, count, Hard, skill floor), the dedupe rule, the confidence ramp, and the case "11 exercises with high scores is not Principal".
- Save the new thresholds to project memory. Record the rule "level is computed client-side from reports through pure scoring helpers" in AGENTS.md.
