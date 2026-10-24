// Normalizes live listings from public job feeds into the shape the job cards render.
// Pure helpers only — no network, no secrets — so the server route and the tests share one source of truth.

import type { Scores } from "@/lib/scoring";

export type LiveJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  level: number;
  role_type: string;
  salary_min: number;
  salary_max: number;
  required: Partial<Scores>;
  description: string;
  url: string;
  source: string;
  /** Posting is in Detroit Metro / Michigan. */
  local: boolean;
};

const ENGINEERING_ROLE =
  /\b(engineer|engineering|developer|programmer|sre|devops|architect|full[- ]?stack|fullstack|frontend|front[- ]?end|backend|back[- ]?end|software|platform)\b/i;

/** Titles that borrow an engineering word without being an engineering job. */
const NON_ENGINEERING =
  /\b(service desk|help desk|it support|customer support|customer success|sales engineer|solutions consultant|account executive|recruiter|copywriter|content writer)\b/i;

/** Only engineering roles are relevant here, and the feeds mix in sales, writing and support posts. */
export function isEngineeringRole(title: string) {
  const t = title || "";
  if (NON_ENGINEERING.test(t)) return false;
  return ENGINEERING_ROLE.test(t);
}

/**
 * Some feeds double-encode UTF-8, so "Sotheby’s" arrives as "Sothebyâs".
 * Rebuild the bytes when every code point fits in one byte and the result is valid UTF-8.
 */
export function fixMojibake(text: string) {
  const t = text || "";
  if (!/[\u0080-\u00ff]/.test(t)) return t;
  if ([...t].some((c) => c.charCodeAt(0) > 0xff)) return t;
  const repaired = new TextDecoder("utf-8").decode(Uint8Array.from(t, (c) => c.charCodeAt(0)));
  if (repaired.includes("\uFFFD") || /[\u0080-\u009f]/.test(repaired)) return t;
  return repaired;
}

function clean(text: unknown) {
  return fixMojibake(String(text ?? "")).trim();
}

export function decodeEntities(text: string) {
  return clean(text)
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

export function stripHtml(html: string) {
  return decodeEntities((html || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
}

export function truncate(text: string, max: number) {
  const t = (text || "").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** First link in an HTML snippet — feeds hide the real posting URL behind markup. */
export function firstLink(html: string) {
  const anchor = /href=["']([^"']+)["']/i.exec(html || "");
  const found = anchor?.[1] || /(https?:\/\/[^\s<>"']+)/i.exec(html || "")?.[1] || "";
  // A bare link at the end of a sentence or bracket picks up trailing punctuation.
  return found.replace(/[),.;\]]+$/, "");
}

export function inferRoleType(text: string): string {
  const t = (text || "").toLowerCase();
  if (/full[- ]?stack|fullstack/.test(t)) return "full-stack";
  if (/devops|\bsre\b|platform|infra|kubernetes|site reliability|cloud engineer/.test(t)) return "platform";
  if (/back[- ]?end|backend|\bapi\b|golang|\bgo\b|ruby|python|java|php|rails|node|\.net|rust|\bc\+\+|\bdata engineer|machine learning/.test(t)) return "backend";
  if (/front[- ]?end|frontend|react|vue|angular|ui engineer|web dev|typescript|css/.test(t)) return "frontend";
  return "full-stack";
}

/** Seniority from the posting title, with salary floors lifting clearly mislabelled roles. */
export function inferLevel(title: string, salaryMin = 0): number {
  const t = (title || "").toLowerCase();
  let level = 2;
  if (/\b(junior|jun|intern|internship|graduate|trainee|associate|entry[- ]level)\b/.test(t)) level = 1;
  else if (/\b(senior|sr|lead|expert|iii)\b/.test(t)) level = 3;
  if (/\b(staff|specialist)\b/.test(t)) level = 4;
  if (/\b(principal|architect|distinguished|fellow|head of engineering|director of engineering|vp of engineering|vp engineering)\b/.test(t)) level = 5;
  if (salaryMin >= 170000) level = Math.max(level, 3);
  if (salaryMin >= 210000) level = Math.max(level, 4);
  if (salaryMin >= 250000) level = 5;
  return level;
}

export function inferRemote(text: string, assumeRemote = false): boolean {
  const t = (text || "").toLowerCase();
  if (/\b(remote|worldwide|anywhere|any location|remote-first|remote first)\b/.test(t)) return true;
  if (/\bonsite|\bhybrid\b|\bon-site\b/.test(t)) return false;
  return assumeRemote;
}

/** Turn a free-text salary ("$170k - $200k", "70K-80K", "$35,3k- $52k") into annual dollars. */
export function parseSalaryString(raw: string): { min: number; max: number } {
  const text = (raw || "").toLowerCase();
  if (!text.trim()) return { min: 0, max: 0 };
  if (/\b(hour|hr|hours|task|day|week|month|project|contract)\b/.test(text)) return { min: 0, max: 0 };
  const values = [...text.matchAll(/(\d[\d.,]*)\s*(k?)/gi)]
    .map((m) => {
      const digits = (m[1] || "").replace(/,(?=\d{3}$)/g, "").replace(",", ".");
      const n = Number(digits);
      if (!Number.isFinite(n) || n <= 0) return 0;
      return m[2] ? n * 1000 : n;
    })
    .filter((n) => n >= 20000 && n <= 600000);
  if (values.length < 2) return { min: 0, max: 0 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** Dimension bars a role of this level expects, used for the match percentage. */
export function requiredForLevel(level: number): Partial<Scores> {
  const base = [0, 30, 45, 55, 65, 75][Math.max(1, Math.min(5, level))] ?? 45;
  return { verification: base, economy: base, steering: base, correctness: base + 10 };
}

function slug(text: string) {
  return (text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

const METRO_CITIES =
  /\b(detroit|ann arbor|dearborn|troy|southfield|novi|royal oak|farmington hills|auburn hills|pontiac|livonia|warren|grand rapids|michigan)\b/i;
const METRO_IN_TEXT = /\b(detroit|ann arbor|michigan)\b/i;

/** Detroit Metro / Michigan posting. City names count only in the location; the blurb needs an unambiguous name. */
export function isDetroitMetro(location: string, text = "") {
  const loc = location || "";
  // "MI" is matched case-sensitively so "Miami" or "mid-level" never qualify.
  return METRO_CITIES.test(loc) || /(^|[\s,(])MI\b/.test(loc) || METRO_IN_TEXT.test(text || "");
}

/** Remote roles open to US-based people, which Michigan engineers can apply to. */
export function hiresInUs(job: Pick<LiveJob, "location" | "remote">) {
  return job.remote && /\b(us|usa|united states|north america|americas|worldwide|anywhere)\b/i.test(job.location || "");
}

function job(partial: Omit<LiveJob, "required" | "local"> & { required?: Partial<Scores> }): LiveJob {
  return {
    ...partial,
    required: partial.required ?? requiredForLevel(partial.level),
    local: isDetroitMetro(partial.location, `${partial.title} ${partial.description}`),
  };
}

export function normalizeRemoteok(raw: any): LiveJob | null {
  const title = clean(raw?.position);
  const company = clean(raw?.company);
  let url = clean(raw?.url ?? raw?.apply_url);
  if (!title || !company || !url || !isEngineeringRole(title)) return null;
  if (url.startsWith("/")) url = `https://remoteok.com${url}`;
  const salaryMin = Number(raw?.salary_min ?? 0) || 0;
  const salaryMax = Number(raw?.salary_max ?? 0) || 0;
  const min = salaryMin >= 20000 && salaryMin <= 600000 ? salaryMin : 0;
  const max = salaryMax >= 20000 && salaryMax <= 600000 ? salaryMax : min;
  const level = inferLevel(title, min);
  const tags = Array.isArray(raw?.tags) ? raw.tags.join(" ") : "";
  return job({
    id: `remoteok-${raw?.id ?? slug(`${title}-${company}`)}`,
    title,
    company,
    location: clean(raw?.location) || "Remote",
    remote: true,
    level,
    role_type: roleTypeFor(title, tags),
    salary_min: min,
    salary_max: max,
    description: truncate(stripHtml(clean(raw?.description)), 200),
    url,
    source: "Remote OK",
  });
}

export function normalizeRemotive(raw: any): LiveJob | null {
  const title = clean(raw?.title);
  const company = clean(raw?.company_name);
  const url = clean(raw?.url);
  if (!title || !company || !url || !isEngineeringRole(title)) return null;
  const salary = parseSalaryString(clean(raw?.salary));
  const level = inferLevel(title, salary.min);
  const tags = Array.isArray(raw?.tags) ? raw.tags.join(" ") : "";
  const location = clean(raw?.candidate_required_location);
  return job({
    id: `remotive-${raw?.id ?? slug(`${title}-${company}`)}`,
    title,
    company,
    location: location || "Remote",
    remote: inferRemote(location, true),
    level,
    role_type: roleTypeFor(title, tags),
    salary_min: salary.min,
    salary_max: salary.max,
    description: truncate(stripHtml(clean(raw?.description)), 200),
    url,
    source: "Remotive",
  });
}

/**
 * "Who is hiring?" posts follow a pipe-delimited convention:
 * Company | Role | Location | Remote/Onsite | Full-time | blurb + link
 */
/** Postings sometimes smuggle the company site into the name field: "Sendery ( https://sendery.co)". */
function stripInlineUrl(text: string) {
  return (text || "")
    .replace(/\(?\s*(?:https?:\/\/|www\.)[^\s)]+\s*\)?/gi, " ")
    // "Chronograph (chronograph.pe)" — a bare domain in brackets is the company site, not part of the name.
    .replace(/\(\s*[a-z0-9-]+(?:\.[a-z]{2,}){1,2}\s*\)/gi, " ")
    .replace(/\s*\(\s*\)\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[,;:]+$/, "")
    .trim();
}

const POSTING_META = /^(remote|onsite|on-site|hybrid|full[- ]?time|part[- ]?time|contract|b2b|worldwide|anywhere)\b/i;

export function parseHnPosting(
  commentText: string,
): Omit<LiveJob, "required" | "id" | "source" | "role_type" | "salary_min" | "salary_max"> | null {
  const html = commentText || "";
  const url = firstLink(html);
  if (!url) return null;
  const text = decodeEntities(html.replace(/<p>/gi, "\n").replace(/<a[^>]*>/gi, " ").replace(/<[^>]*>/g, ""));
  const parts = text.split("|").map((p) => clean(p)).filter(Boolean);
  if (parts.length < 3) return null;
  const company = stripInlineUrl(parts[0] ?? "");
  const title = stripInlineUrl(parts[1] ?? "");
  if (!company || !title || company.length > 60 || title.length > 90) return null;
  if (!isEngineeringRole(title)) return null;
  const locationRaw = parts[2] ?? "";
  const remoteText = parts.slice(2).join(" | ");
  let blurb = parts.slice(3);
  while (blurb.length && POSTING_META.test(blurb[0] ?? "")) blurb = blurb.slice(1);
  return {
    title,
    company,
    location: locationRaw.length > 0 && locationRaw.length <= 45 ? locationRaw : "See posting",
    remote: inferRemote(remoteText, false),
    level: inferLevel(title),
    description: truncate(stripHtml(stripInlineUrl(blurb.join(" | "))), 200),
    url,
  };
}

export function normalizeHn(hit: any): LiveJob | null {
  const parsed = parseHnPosting(String(hit?.comment_text ?? ""));
  if (!parsed) return null;
  return job({
    ...parsed,
    id: `hn-${hit?.objectID ?? slug(`${parsed.title}-${parsed.company}`)}`,
    role_type: roleTypeFor(parsed.title, parsed.description),
    salary_min: 0,
    salary_max: 0,
    source: "HN Who's Hiring",
  });
}

/** Same role cross-posted to several boards should appear once. */
export function dedupeJobs(jobs: LiveJob[]): LiveJob[] {
  const seen = new Set<string>();
  const out: LiveJob[] = [];
  for (const j of jobs) {
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(j);
  }
  return out;
}

/**
 * A posting's own title is a better signal than its tag soup — RemoteOK tags a
 * "Senior Frontend Engineer" role with backend, game dev and finance alike.
 */
export function roleTypeFor(title: string, tags = ""): string {
  const fromTitle = inferRoleType(title);
  if (fromTitle !== "full-stack" || /full[- ]?stack|fullstack/i.test(title || "")) return fromTitle;
  return inferRoleType(tags);
}
