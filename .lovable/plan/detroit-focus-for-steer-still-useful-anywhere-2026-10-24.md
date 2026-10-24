# Detroit focus for Steer (still useful anywhere)

Detroit features are optional layers. Engineers anywhere still see the same catalog, scoring and jobs. Detroit users get a local filter, local challenges and local context.

## 1. Detroit Metro jobs filter
- Add a **Detroit Metro / SE Michigan** chip on the Jobs page, next to the Remote toggle. It shows a count, like the other chips.
- Postings count as local when the location mentions Detroit, Ann Arbor, Dearborn, Troy, Southfield, Novi, Royal Oak, Farmington Hills, Auburn Hills, Pontiac, Livonia, Warren, Grand Rapids or Michigan/MI.
- Local cards get a small "Detroit Metro" badge.
- Add a fourth live source: **Remotive** and **Remote OK** are mostly remote, so I'll also search the HN "Who is hiring" thread for Michigan mentions. That catches more local roles.
- Every listing stays real and links to the original posting. Nothing is invented.
- If no local roles are open right now, the page says so and suggests remote roles that hire in Michigan (postings that say "US" or "Americas").

## 2. Detroit-flavored challenges
Add three new challenges based on the region's industries. They use the same workspace, tests, hints and scoring as the current six:
- **Connected vehicle telemetry** (Medium): fix a buffer that drops or duplicates out-of-order sensor readings from a car.
- **Supplier parts reorder** (Hard): fix a race condition in just-in-time inventory where two plants over-order the same part.
- **Mortgage/lending rule migration** (Medium): move loan eligibility rules to a new API format without changing decisions. This is a nod to Detroit's fintech employers.
- Add a **"Detroit"** tag and a catalog filter chip, so local users can find them and everyone else can still try them.

## 3. Light personalization
- Add an optional **"I'm in Detroit Metro"** setting on the dashboard, off by default.
- When it's on, the Jobs page opens with the Detroit filter already selected, and the dashboard suggests the Detroit challenges first.
- The landing page gets one line: "Built in Detroit, for engineers everywhere."

## Not included
- Partnerships with specific employers and in-person meetups. Those need real contacts, so I won't fake them.

## Technical details
- `src/lib/job-feed.ts`: add a pure `isDetroitMetro(location, text)` helper and a `local` flag on `LiveJob`, with unit tests (Detroit, Ann Arbor, "MI", plus negatives like "Miami" and "Milan").
- `src/routes/api/public/jobs.ts`: accept a `region=detroit` query parameter and set `local` on every job.
- Jobs page: add the chip, the badge and the empty state.
- Database migration: add a `region` column (nullable) to profiles, and insert the three challenges with their starter files, visible and hidden tests, and hints.
- Catalog: add the Detroit filter chip.
- Dashboard: add the region toggle.
