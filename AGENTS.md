<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Job listings

- Live openings come from public feeds (Remote OK, Remotive, Hacker News "Who is hiring")
  through `/api/public/jobs`. Keep the normalizers in `src/lib/job-feed.ts` pure and
  network-free so they stay unit-testable; the route owns fetching and caching.

## Training directory

- Keep training-provider records in a browser-safe data module with official source URLs and verification dates; the public directory filters those records without implying current cohort availability or a provider partnership.

## AI configuration and context

- Keep chat and judge model identifiers independently configured in a browser-safe module; instantiate the server-only gateway per call with the appropriate identifier so model changes cannot accidentally affect both roles.
- Read AI credentials inside route/server-function handlers and pass them to the provider helper; chat must check availability before spending practice credits and return a safe 503 message when configuration is absent rather than throwing a route error.
- Select automatic active-file and companion visible-test context through a pure helper, then merge manual extras and use the same selection for requests, costs, indicators, and event logs so scoring reflects the actual context sent.

## Levels
- Engineer level is computed client-side from the user's reports through pure helpers in `src/lib/scoring.ts` (`levelFromReports`), so thresholds stay unit-testable and need no stored state.
