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
