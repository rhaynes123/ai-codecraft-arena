import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  dedupeJobs,
  normalizeHn,
  normalizeRemotive,
  normalizeRemoteok,
  type LiveJob,
} from "@/lib/job-feed";

const CACHE_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 9000;
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

let cache: { at: number; jobs: LiveJob[] } | null = null;
let inflight: Promise<LiveJob[]> | null = null;

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** The hiring thread is a fresh top-level post each month, so find the newest one. */
async function latestHiringThread(): Promise<string | null> {
  const data = await fetchJson(
    "https://hn.algolia.com/api/v1/search_by_date?query=%22Who%20is%20hiring%22&tags=story&hitsPerPage=10",
  );
  const hit = (data?.hits ?? []).find((h: any) =>
    /who is hiring\? \([a-z]+ \d{4}\)/i.test(String(h?.title ?? "")),
  );
  return hit?.objectID ? String(hit.objectID) : null;
}

async function loadJobs(): Promise<LiveJob[]> {
  const threadId = await latestHiringThread();
  const [remoteok, remotive, hn] = await Promise.all([
    fetchJson("https://remoteok.com/api"),
    fetchJson("https://remotive.com/api/remote-jobs?category=software-dev&limit=100"),
    threadId
      ? fetchJson(`https://hn.algolia.com/api/v1/search?tags=comment,story_${threadId}&hitsPerPage=100`)
      : Promise.resolve(null),
  ]);

  const listings = [
    ...(Array.isArray(remoteok) ? remoteok.map(normalizeRemoteok) : []),
    ...(Array.isArray(remotive?.jobs) ? remotive.jobs.map(normalizeRemotive) : []),
    ...(Array.isArray(hn?.hits) ? hn.hits.map(normalizeHn) : []),
  ].filter(Boolean) as LiveJob[];

  return dedupeJobs(listings);
}

function getJobs(): Promise<LiveJob[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return Promise.resolve(cache.jobs);
  if (!inflight) {
    inflight = loadJobs()
      .then((jobs) => {
        if (jobs.length) cache = { at: Date.now(), jobs };
        return jobs;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

const querySchema = z.object({
  role: z.enum(["all", "frontend", "backend", "full-stack", "platform"]).default("all"),
  remote: z.enum(["true", "false"]).default("false"),
  minSalary: z.coerce.number().int().min(0).max(500000).default(0),
  limit: z.coerce.number().int().min(1).max(150).default(120),
});

export const Route = createFileRoute("/api/public/jobs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!parsed.success) return Response.json({ error: "Invalid query" }, { status: 400 });

        const { role, remote, minSalary, limit } = parsed.data;
        const jobs = await getJobs();
        const filtered = jobs
          .filter(
            (j) =>
              (role === "all" || j.role_type === role) &&
              (!remote || j.remote) &&
              (!minSalary || (j.salary_max || j.salary_min) >= minSalary),
          )
          .slice(0, limit);

        return Response.json({
          jobs: filtered,
          total: jobs.length,
          fetchedAt: cache?.at ?? null,
          sources: ["Remote OK", "Remotive", "Hacker News Who is hiring"],
        });
      },
    },
  },
});
