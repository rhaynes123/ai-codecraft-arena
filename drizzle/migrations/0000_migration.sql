
-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  credits integer NOT NULL DEFAULT 200,
  last_daily_claim date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE TABLE public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_ledger TO authenticated;
GRANT ALL ON public.credit_ledger TO service_role;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ledger read" ON public.credit_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.credit_ledger (user_id, delta, reason) VALUES (NEW.id, 200, 'Welcome credits');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.spend_credits(_amount integer, _reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE remaining integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  UPDATE public.profiles SET credits = credits - _amount
   WHERE id = auth.uid() AND credits >= _amount
   RETURNING credits INTO remaining;
  IF remaining IS NULL THEN RAISE EXCEPTION 'Not enough credits'; END IF;
  INSERT INTO public.credit_ledger (user_id, delta, reason) VALUES (auth.uid(), -_amount, _reason);
  RETURN remaining;
END $$;

CREATE OR REPLACE FUNCTION public.claim_daily_credits()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE remaining integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  UPDATE public.profiles SET credits = credits + 25, last_daily_claim = current_date
   WHERE id = auth.uid() AND (last_daily_claim IS NULL OR last_daily_claim < current_date)
   RETURNING credits INTO remaining;
  IF remaining IS NULL THEN RETURN 0; END IF;
  INSERT INTO public.credit_ledger (user_id, delta, reason) VALUES (auth.uid(), 25, 'Daily practice top-up');
  RETURN 25;
END $$;
REVOKE EXECUTE ON FUNCTION public.spend_credits(integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_daily_credits() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.spend_credits(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_credits() TO authenticated;

-- Challenges
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  difficulty text NOT NULL,
  est_minutes integer NOT NULL DEFAULT 30,
  tags text[] NOT NULL DEFAULT '{}',
  acceptance text[] NOT NULL DEFAULT '{}',
  starter_files jsonb NOT NULL,
  visible_tests jsonb NOT NULL,
  hints text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.challenges TO anon, authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges public read" ON public.challenges FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.challenge_hidden_tests (
  challenge_id uuid PRIMARY KEY REFERENCES public.challenges(id) ON DELETE CASCADE,
  files jsonb NOT NULL
);
GRANT ALL ON public.challenge_hidden_tests TO service_role;
ALTER TABLE public.challenge_hidden_tests ENABLE ROW LEVEL SECURITY;

-- Attempts
CREATE TABLE public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress',
  files jsonb NOT NULL,
  hints_used integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts read" ON public.attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own attempts insert" ON public.attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own attempts update" ON public.attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'in_progress') WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX session_events_attempt_idx ON public.session_events(attempt_id, created_at);
GRANT SELECT, INSERT ON public.session_events TO authenticated;
GRANT ALL ON public.session_events TO service_role;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events read" ON public.session_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own events insert" ON public.session_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.reports (
  attempt_id uuid PRIMARY KEY REFERENCES public.attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  verification integer NOT NULL,
  economy integer NOT NULL,
  steering integer NOT NULL,
  correctness integer NOT NULL,
  overall integer NOT NULL,
  summary text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}',
  tips jsonb NOT NULL DEFAULT '[]',
  tests jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports read" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Jobs
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  location text NOT NULL,
  remote boolean NOT NULL DEFAULT false,
  level integer NOT NULL,
  role_type text NOT NULL,
  salary_min integer NOT NULL,
  salary_max integer NOT NULL,
  required jsonb NOT NULL DEFAULT '{}',
  description text NOT NULL,
  url text NOT NULL
);
GRANT SELECT ON public.jobs TO anon, authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs public read" ON public.jobs FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.jobs (title, company, location, remote, level, role_type, salary_min, salary_max, required, description, url) VALUES
('Junior Software Engineer', 'Brightline Health', 'Austin, TX', false, 1, 'full-stack', 80000, 105000, '{"verification":40,"correctness":45}', 'Ship features on a patient scheduling app with mentorship from senior engineers.', 'https://example.com/jobs/brightline-junior'),
('Associate Frontend Engineer', 'Parcelly', 'Remote (US)', true, 1, 'frontend', 78000, 100000, '{"correctness":40,"economy":35}', 'Build React interfaces for a shipping logistics dashboard.', 'https://example.com/jobs/parcelly-associate'),
('Backend Engineer I', 'Fernwood Bank', 'Charlotte, NC', false, 1, 'backend', 85000, 110000, '{"verification":45}', 'Maintain internal payment APIs in a well-tested Node codebase.', 'https://example.com/jobs/fernwood-be1'),
('Software Engineer II', 'Loomwork', 'Remote (US/CA)', true, 2, 'full-stack', 115000, 145000, '{"verification":55,"steering":50}', 'Own features end to end on a collaborative docs product using AI-assisted workflows.', 'https://example.com/jobs/loomwork-swe2'),
('Frontend Engineer', 'Tidepool Analytics', 'Denver, CO', false, 2, 'frontend', 110000, 140000, '{"economy":50,"correctness":55}', 'Data-dense charting and dashboards for climate analytics.', 'https://example.com/jobs/tidepool-fe'),
('Backend Engineer', 'Quarry Logistics', 'Remote (US)', true, 2, 'backend', 120000, 150000, '{"steering":55,"correctness":55}', 'Event-driven order services with tricky concurrency at scale.', 'https://example.com/jobs/quarry-be'),
('Senior Software Engineer', 'Northstar Payments', 'New York, NY', false, 3, 'backend', 165000, 205000, '{"verification":65,"steering":65,"correctness":65}', 'Lead migration of legacy callback services to async pipelines.', 'https://example.com/jobs/northstar-senior'),
('Senior Frontend Engineer', 'Canvasly', 'Remote (Global)', true, 3, 'frontend', 155000, 195000, '{"economy":65,"correctness":65}', 'Architect a real-time design editor with AI copilots.', 'https://example.com/jobs/canvasly-senior'),
('Senior Full-Stack Engineer', 'Harborline', 'Seattle, WA', false, 3, 'full-stack', 160000, 200000, '{"verification":60,"steering":60}', 'Own a booking platform from API contracts to UI.', 'https://example.com/jobs/harborline-senior'),
('Staff Engineer, Platform', 'Meridian Cloud', 'San Francisco, CA', false, 4, 'platform', 220000, 290000, '{"verification":75,"steering":75,"economy":70}', 'Set direction for developer platform and AI tooling adoption across 200 engineers.', 'https://example.com/jobs/meridian-staff'),
('Staff Backend Engineer', 'Ledgerline', 'Remote (US)', true, 4, 'backend', 210000, 270000, '{"correctness":75,"steering":70}', 'Design the consistency model for a multi-region ledger.', 'https://example.com/jobs/ledgerline-staff'),
('Staff Frontend Engineer', 'Orbit Studio', 'Los Angeles, CA', false, 4, 'frontend', 205000, 265000, '{"economy":75,"verification":70}', 'Lead frontend architecture for a creative suite.', 'https://example.com/jobs/orbit-staff'),
('Principal Engineer, AI Developer Experience', 'Vector Labs', 'San Francisco, CA', false, 5, 'platform', 290000, 400000, '{"verification":85,"steering":85,"economy":85,"correctness":85}', 'Define how a 1,000-person engineering org builds software with AI agents.', 'https://example.com/jobs/vector-principal'),
('Principal Backend Engineer', 'Atlas Exchange', 'Remote (US)', true, 5, 'backend', 280000, 380000, '{"correctness":85,"steering":80}', 'Own low-latency matching engine architecture.', 'https://example.com/jobs/atlas-principal');

-- Seed challenges
WITH c AS (
INSERT INTO public.challenges (slug, title, summary, description, category, difficulty, est_minutes, tags, acceptance, starter_files, visible_tests, hints, sort_order) VALUES
('async-payment-retry', 'Async payment retry migration',
 'Migrate a callback-based payment retrier to async/await without changing retry semantics.',
 'The billing team wants to retire the callback-based `chargeWithRetry`. Implement `chargeWithRetryAsync` in `src/paymentService.ts` using async/await. The legacy callback gateway must still be used (wrap it), and the observable behaviour must match the legacy function exactly. AI assistants often "improve" the retry policy here - do not.',
 'Async refactor', 'Easy', 20, ARRAY['async','promises','refactor'],
 ARRAY['Resolves with the receipt on success','Retries only errors with retryable: true','Makes at most 3 attempts in total, then rejects with the last error','Rejects with "Invalid amount" for amounts <= 0 without calling the gateway'],
 jsonb_build_array(jsonb_build_object('path','src/paymentService.ts','content',$f$export type Receipt = { id: string };
export type GatewayError = Error & { retryable?: boolean };
export type Gateway = {
  charge(amount: number, cb: (err: GatewayError | null, receipt?: Receipt) => void): void;
};

// Legacy implementation - keep for reference, do not change its behaviour.
export function chargeWithRetry(
  gateway: Gateway,
  amount: number,
  cb: (err: GatewayError | null, receipt?: Receipt) => void,
  attempt = 1,
): void {
  if (amount <= 0) return cb(new Error("Invalid amount"));
  gateway.charge(amount, (err, receipt) => {
    if (err) {
      if (err.retryable && attempt < 3) {
        return chargeWithRetry(gateway, amount, cb, attempt + 1);
      }
      return cb(err);
    }
    cb(null, receipt);
  });
}

// TODO: implement with async/await, same semantics as chargeWithRetry.
export async function chargeWithRetryAsync(gateway: Gateway, amount: number): Promise<Receipt> {
  throw new Error("Not implemented");
}
$f$)),
 jsonb_build_array(jsonb_build_object('path','tests/paymentService.test.ts','content',$f$import { chargeWithRetryAsync } from "../src/paymentService";

function gatewayFrom(results: Array<Error & { retryable?: boolean } | string>) {
  let calls = 0;
  return {
    get calls() { return calls; },
    charge(_amount: number, cb: any) {
      const r = results[calls++];
      setTimeout(() => (typeof r === "string" ? cb(null, { id: r }) : cb(r)), 0);
    },
  };
}
function retryable(msg: string) { return Object.assign(new Error(msg), { retryable: true }); }

test("resolves with receipt on first success", async () => {
  const g = gatewayFrom(["rcpt_1"]);
  expect(await chargeWithRetryAsync(g, 100)).toEqual({ id: "rcpt_1" });
  expect(g.calls).toBe(1);
});

test("retries a retryable error then succeeds", async () => {
  const g = gatewayFrom([retryable("timeout"), "rcpt_2"]);
  expect(await chargeWithRetryAsync(g, 50)).toEqual({ id: "rcpt_2" });
  expect(g.calls).toBe(2);
});
$f$)),
 ARRAY['Wrap gateway.charge in a Promise once, then loop.','Track the attempt number explicitly; the legacy code stops after attempt 3.','Check the amount before ever touching the gateway.'], 1),

('inventory-race', 'Inventory reservation race condition',
 'Concurrent reservations oversell stock. Fix the race without blocking unrelated SKUs.',
 'Under load, `Inventory.reserve` oversells: two concurrent requests read the same stock and both succeed. Fix `src/inventory.ts` so reservations for the same SKU are serialized. Reservations for different SKUs must not wait on each other, and a failed reservation must never leave the SKU locked.',
 'Concurrency', 'Medium', 30, ARRAY['concurrency','race-condition','async'],
 ARRAY['Concurrent reservations never oversell','reserve resolves with the remaining stock','Throws "Insufficient stock" when stock is too low','Different SKUs do not block each other','A failed reservation does not deadlock later ones','Throws "Invalid quantity" for qty <= 0'],
 jsonb_build_array(jsonb_build_object('path','src/inventory.ts','content',$f$export interface Store {
  get(sku: string): Promise<number>;
  set(sku: string, stock: number): Promise<void>;
}

export class Inventory {
  constructor(private store: Store) {}

  async reserve(sku: string, qty: number): Promise<number> {
    const stock = await this.store.get(sku);
    if (stock < qty) throw new Error("Insufficient stock");
    await this.store.set(sku, stock - qty);
    return stock - qty;
  }
}
$f$)),
 jsonb_build_array(jsonb_build_object('path','tests/inventory.test.ts','content',$f$import { Inventory } from "../src/inventory";

function makeStore(initial: Record<string, number>) {
  const data = { ...initial };
  const tick = () => new Promise((r) => setTimeout(r, 1));
  return {
    data,
    async get(sku: string) { await tick(); return data[sku] ?? 0; },
    async set(sku: string, n: number) { await tick(); data[sku] = n; },
  };
}

test("single reservation returns remaining stock", async () => {
  const inv = new Inventory(makeStore({ A: 10 }));
  expect(await inv.reserve("A", 3)).toBe(7);
});

test("concurrent reservations never oversell", async () => {
  const store = makeStore({ A: 10 });
  const inv = new Inventory(store);
  const results = await Promise.allSettled([inv.reserve("A", 4), inv.reserve("A", 4), inv.reserve("A", 4)]);
  const ok = results.filter((r) => r.status === "fulfilled").length;
  expect(ok).toBe(2);
  expect(store.data.A).toBe(2);
});
$f$)),
 ARRAY['Keep a Map<sku, Promise> as a per-key lock chain.','Chain the next reservation onto the previous promise, but swallow its rejection for the chain itself.','Validate qty before acquiring the lock.'], 2),

('stale-search', 'Stale search responses',
 'Out-of-order network responses overwrite newer results. Only the latest query should win.',
 'Typing quickly in the search box sometimes shows results for an older query because responses arrive out of order. Fix `createSearch` in `src/search.ts` so only the most recent query''s results are delivered. An empty (or whitespace) query should immediately deliver `[]` without fetching and discard pending responses. Errors from stale requests must be ignored.',
 'Async state', 'Easy', 20, ARRAY['async','ui-state','race-condition'],
 ARRAY['Only the latest query''s results reach onResults','Stale responses are dropped even if they arrive last','Empty/whitespace query calls onResults([]) immediately without fetching','Errors from stale requests are swallowed; errors from the latest request reject search()'],
 jsonb_build_array(jsonb_build_object('path','src/search.ts','content',$f$export type Fetcher = (query: string) => Promise<string[]>;

export function createSearch(fetcher: Fetcher, onResults: (results: string[]) => void) {
  return async function search(query: string): Promise<void> {
    const results = await fetcher(query);
    onResults(results);
  };
}
$f$)),
 jsonb_build_array(jsonb_build_object('path','tests/search.test.ts','content',$f$import { createSearch } from "../src/search";

function deferred<T>() {
  let resolve!: (v: T) => void, reject!: (e: any) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

test("delivers results for a single query", async () => {
  const seen: string[][] = [];
  const search = createSearch(async (q) => [q + "!"], (r) => seen.push(r));
  await search("hi");
  expect(seen).toEqual([["hi!"]]);
});

test("drops a stale response that arrives late", async () => {
  const d1 = deferred<string[]>(), d2 = deferred<string[]>();
  const seen: string[][] = [];
  const search = createSearch((q) => (q === "a" ? d1.promise : d2.promise), (r) => seen.push(r));
  const p1 = search("a"); const p2 = search("ab");
  d2.resolve(["ab-result"]); await p2;
  d1.resolve(["a-result"]); await p1;
  expect(seen).toEqual([["ab-result"]]);
});
$f$)),
 ARRAY['A monotonically increasing request id is enough.','Compare the id captured before await with the latest id after await.','The empty-query path must also bump the id.'], 3),

('user-api-v2', 'User API v1 to v2 contract migration',
 'Write a two-way adapter between the legacy v1 user payload and the new v2 contract.',
 'Mobile clients still send v1 users while the new service speaks v2. Implement `toV2` and `toV1` in `src/userAdapter.ts`.

v1: `{ id: number, full_name: string, email: string, created: "YYYY-MM-DD" }`

v2: `{ id: "usr_<n>", name: { first, last }, contact: { email }, createdAt: ISO string }`

Names: first = first word, last = remaining words joined by single spaces (extra whitespace collapsed). Emails are lowercased and trimmed in v2. `createdAt` is midnight UTC. `toV1` must throw "Invalid id" for ids that are not `usr_` followed by digits.',
 'API migration', 'Medium', 25, ARRAY['api','contracts','data-mapping'],
 ARRAY['toV2 maps id to "usr_<n>"','Names split on first word; whitespace collapsed','Emails lowercased and trimmed','createdAt is midnight UTC ISO string','toV1(toV2(x)) round-trips normalized data','toV1 throws "Invalid id" on malformed ids'],
 jsonb_build_array(jsonb_build_object('path','src/userAdapter.ts','content',$f$export type UserV1 = { id: number; full_name: string; email: string; created: string };
export type UserV2 = {
  id: string;
  name: { first: string; last: string };
  contact: { email: string };
  createdAt: string;
};

export function toV2(user: UserV1): UserV2 {
  // TODO
  throw new Error("Not implemented");
}

export function toV1(user: UserV2): UserV1 {
  // TODO
  throw new Error("Not implemented");
}
$f$), jsonb_build_object('path','docs/CONTRACT.md','content',$f$# User contract v2

- `id`: string, format `usr_<digits>`
- `name.first`, `name.last`: strings (last may be empty)
- `contact.email`: lowercase
- `createdAt`: ISO-8601 timestamp, UTC
$f$)),
 jsonb_build_array(jsonb_build_object('path','tests/userAdapter.test.ts','content',$f$import { toV1, toV2 } from "../src/userAdapter";

test("maps a basic v1 user to v2", () => {
  expect(toV2({ id: 42, full_name: "Ada Lovelace", email: "Ada@Example.com", created: "2024-03-05" })).toEqual({
    id: "usr_42",
    name: { first: "Ada", last: "Lovelace" },
    contact: { email: "ada@example.com" },
    createdAt: "2024-03-05T00:00:00.000Z",
  });
});

test("maps v2 back to v1", () => {
  expect(toV1({ id: "usr_7", name: { first: "Grace", last: "Hopper" }, contact: { email: "g@navy.mil" }, createdAt: "2023-01-02T00:00:00.000Z" }))
    .toEqual({ id: 7, full_name: "Grace Hopper", email: "g@navy.mil", created: "2023-01-02" });
});
$f$)),
 ARRAY['Use .trim().split(/\s+/) for names.','new Date(created + "T00:00:00Z").toISOString() gives midnight UTC.','Validate the id with /^usr_\d+$/.'], 4),

('order-state-machine', 'Order state machine edge cases',
 'The order workflow allows illegal transitions. Lock it down and keep it immutable.',
 'Support tickets show orders being shipped before payment and cancelled after shipping. Fix `transition` in `src/orderMachine.ts`.

Legal transitions:
- pending --pay--> paid
- paid --ship--> shipped
- shipped --deliver--> delivered
- pending --cancel--> cancelled
- paid --cancel--> refunded

Anything else throws an `IllegalTransition` error (exported class) with message `Cannot <event> from <state>`. `transition` must not mutate its input and must append the new state to `history`.',
 'State machines', 'Medium', 25, ARRAY['state-machine','immutability','edge-cases'],
 ARRAY['All five legal transitions work','Illegal transitions throw IllegalTransition with the exact message','Input order is never mutated','history gets the new state appended'],
 jsonb_build_array(jsonb_build_object('path','src/orderMachine.ts','content',$f$export type State = "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
export type Event = "pay" | "ship" | "deliver" | "cancel";
export type Order = { id: string; state: State; history: State[] };

export class IllegalTransition extends Error {}

export function transition(order: Order, event: Event): Order {
  switch (event) {
    case "pay":
      order.state = "paid";
      break;
    case "ship":
      order.state = "shipped";
      break;
    case "deliver":
      order.state = "delivered";
      break;
    case "cancel":
      order.state = order.state === "paid" ? "refunded" : "cancelled";
      break;
  }
  order.history.push(order.state);
  return order;
}
$f$)),
 jsonb_build_array(jsonb_build_object('path','tests/orderMachine.test.ts','content',$f$import { transition, IllegalTransition } from "../src/orderMachine";

const fresh = () => ({ id: "o1", state: "pending" as const, history: ["pending" as const] });

test("happy path to delivered", () => {
  let o: any = fresh();
  for (const e of ["pay", "ship", "deliver"] as const) o = transition(o, e);
  expect(o.state).toBe("delivered");
  expect(o.history).toEqual(["pending", "paid", "shipped", "delivered"]);
});

test("cannot ship before paying", () => {
  expect(() => transition(fresh() as any, "ship")).toThrow("Cannot ship from pending");
});
$f$)),
 ARRAY['A lookup table { [state]: { [event]: nextState } } beats a switch.','Return { ...order, state, history: [...order.history, state] }.','Remember the error must be an instance of IllegalTransition.'], 5),

('token-bucket-skew', 'Rate limiter clock skew',
 'A token bucket misbehaves when the clock jumps backwards and refills past capacity.',
 'Our API rate limiter (`src/rateLimiter.ts`) lets bursts through after idle periods and starves clients after an NTP clock correction moves time backwards. Fix it:

- Tokens never exceed `capacity`.
- If `now()` goes backwards, no tokens are added or removed by the jump, and the reference time is not moved backwards (so time is not double-counted when the clock recovers).
- Fractional refill accumulates correctly.',
 'Concurrency', 'Hard', 30, ARRAY['rate-limiting','time','edge-cases'],
 ARRAY['Starts full at capacity','Never exceeds capacity after idle','Backward clock jumps neither drain nor add tokens','Recovering clock is not double-counted','Fractional refills accumulate'],
 jsonb_build_array(jsonb_build_object('path','src/rateLimiter.ts','content',$f$export type LimiterOptions = { capacity: number; refillPerSec: number; now: () => number };

export function createLimiter({ capacity, refillPerSec, now }: LimiterOptions) {
  let tokens = capacity;
  let last = now();
  return {
    tryRemove(): boolean {
      const t = now();
      tokens += ((t - last) / 1000) * refillPerSec;
      last = t;
      if (tokens >= 1) {
        tokens -= 1;
        return true;
      }
      return false;
    },
  };
}
$f$)),
 jsonb_build_array(jsonb_build_object('path','tests/rateLimiter.test.ts','content',$f$import { createLimiter } from "../src/rateLimiter";

function clock(start = 0) { let t = start; return { now: () => t, set: (v: number) => { t = v; } }; }

test("allows up to capacity immediately", () => {
  const c = clock();
  const l = createLimiter({ capacity: 3, refillPerSec: 1, now: c.now });
  expect([l.tryRemove(), l.tryRemove(), l.tryRemove(), l.tryRemove()]).toEqual([true, true, true, false]);
});

test("does not exceed capacity after a long idle", () => {
  const c = clock();
  const l = createLimiter({ capacity: 2, refillPerSec: 1, now: c.now });
  c.set(60_000);
  expect([l.tryRemove(), l.tryRemove(), l.tryRemove()]).toEqual([true, true, false]);
});
$f$)),
 ARRAY['Clamp with Math.min(capacity, ...).','Only add tokens when t > last, and only advance last in that case.','Watch for floating point: 0.5 + 0.5 should allow a request.'], 6)
RETURNING id, slug
)
INSERT INTO public.challenge_hidden_tests (challenge_id, files)
SELECT c.id, h.files FROM c JOIN (VALUES
('async-payment-retry', jsonb_build_array(jsonb_build_object('path','tests/hidden/paymentService.hidden.test.ts','content',$f$import { chargeWithRetryAsync } from "../../src/paymentService";
function gw(results: any[]) { let calls = 0; return { get calls() { return calls; }, charge(_a: number, cb: any) { const r = results[calls++]; setTimeout(() => (typeof r === "string" ? cb(null, { id: r }) : cb(r)), 0); } }; }
const R = (m: string) => Object.assign(new Error(m), { retryable: true });
test("hidden: non-retryable errors are not retried", async () => {
  const g = gw([new Error("card declined"), "x"]);
  await expect(chargeWithRetryAsync(g, 10)).rejects.toThrow("card declined");
  expect(g.calls).toBe(1);
});
test("hidden: stops after 3 attempts with last error", async () => {
  const g = gw([R("t1"), R("t2"), R("t3"), "x"]);
  await expect(chargeWithRetryAsync(g, 10)).rejects.toThrow("t3");
  expect(g.calls).toBe(3);
});
test("hidden: invalid amount never calls gateway", async () => {
  const g = gw(["x"]);
  await expect(chargeWithRetryAsync(g, 0)).rejects.toThrow("Invalid amount");
  expect(g.calls).toBe(0);
});
$f$))),
('inventory-race', jsonb_build_array(jsonb_build_object('path','tests/hidden/inventory.hidden.test.ts','content',$f$import { Inventory } from "../../src/inventory";
function store(init: Record<string, number>, delay = 5) { const data = { ...init }; const t = () => new Promise((r) => setTimeout(r, delay)); return { data, async get(s: string) { await t(); return data[s] ?? 0; }, async set(s: string, n: number) { await t(); data[s] = n; } }; }
test("hidden: failed reservation does not deadlock", async () => {
  const inv = new Inventory(store({ A: 1 }));
  await expect(inv.reserve("A", 5)).rejects.toThrow("Insufficient stock");
  expect(await inv.reserve("A", 1)).toBe(0);
});
test("hidden: different SKUs run concurrently", async () => {
  const s = store({ A: 5, B: 5 }, 20);
  const inv = new Inventory(s);
  const start = Date.now();
  await Promise.all([inv.reserve("A", 1), inv.reserve("B", 1)]);
  expect(Date.now() - start < 70).toBe(true);
});
test("hidden: invalid quantity", async () => {
  const inv = new Inventory(store({ A: 5 }));
  await expect(inv.reserve("A", 0)).rejects.toThrow("Invalid quantity");
});
test("hidden: ten concurrent reservations of 1 on stock 7", async () => {
  const s = store({ A: 7 }, 1);
  const inv = new Inventory(s);
  const r = await Promise.allSettled(Array.from({ length: 10 }, () => inv.reserve("A", 1)));
  expect(r.filter((x) => x.status === "fulfilled").length).toBe(7);
  expect(s.data.A).toBe(0);
});
$f$))),
('stale-search', jsonb_build_array(jsonb_build_object('path','tests/hidden/search.hidden.test.ts','content',$f$import { createSearch } from "../../src/search";
function d<T>() { let resolve!: (v: T) => void, reject!: (e: any) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
test("hidden: empty query clears immediately and drops pending", async () => {
  const d1 = d<string[]>(); let calls = 0; const seen: string[][] = [];
  const search = createSearch((q) => { calls++; return d1.promise; }, (r) => seen.push(r));
  const p1 = search("abc"); await search("   ");
  d1.resolve(["old"]); await p1;
  expect(seen).toEqual([[]]);
  expect(calls).toBe(1);
});
test("hidden: stale errors are ignored", async () => {
  const d1 = d<string[]>(); const seen: string[][] = [];
  const search = createSearch((q) => (q === "a" ? d1.promise : Promise.resolve(["b"])), (r) => seen.push(r));
  const p1 = search("a"); await search("b");
  d1.reject(new Error("boom"));
  await p1;
  expect(seen).toEqual([["b"]]);
});
test("hidden: latest error rejects", async () => {
  const search = createSearch(() => Promise.reject(new Error("down")), () => {});
  await expect(search("x")).rejects.toThrow("down");
});
$f$))),
('user-api-v2', jsonb_build_array(jsonb_build_object('path','tests/hidden/userAdapter.hidden.test.ts','content',$f$import { toV1, toV2 } from "../../src/userAdapter";
test("hidden: single-word name", () => {
  expect(toV2({ id: 1, full_name: "Cher", email: "c@x.io", created: "2020-01-01" }).name).toEqual({ first: "Cher", last: "" });
});
test("hidden: multi-word last name and extra whitespace", () => {
  expect(toV2({ id: 2, full_name: "  Ludwig   van  Beethoven ", email: " L@B.DE ", created: "2020-01-01" })).toEqual({
    id: "usr_2", name: { first: "Ludwig", last: "van Beethoven" }, contact: { email: "l@b.de" }, createdAt: "2020-01-01T00:00:00.000Z" });
});
test("hidden: toV1 joins without trailing space", () => {
  expect(toV1({ id: "usr_3", name: { first: "Cher", last: "" }, contact: { email: "c@x.io" }, createdAt: "2020-01-01T00:00:00.000Z" }).full_name).toBe("Cher");
});
test("hidden: invalid ids", () => {
  const base = { name: { first: "a", last: "b" }, contact: { email: "a@b.c" }, createdAt: "2020-01-01T00:00:00.000Z" };
  expect(() => toV1({ ...base, id: "user_3" })).toThrow("Invalid id");
  expect(() => toV1({ ...base, id: "usr_abc" })).toThrow("Invalid id");
});
test("hidden: round trip", () => {
  const v1 = { id: 99, full_name: "Alan Turing", email: "alan@bletchley.uk", created: "1936-11-12" };
  expect(toV1(toV2(v1))).toEqual(v1);
});
$f$))),
('order-state-machine', jsonb_build_array(jsonb_build_object('path','tests/hidden/orderMachine.hidden.test.ts','content',$f$import { transition, IllegalTransition } from "../../src/orderMachine";
const o = (state: any) => ({ id: "o", state, history: [state] });
test("hidden: cancel pending -> cancelled, paid -> refunded", () => {
  expect(transition(o("pending"), "cancel").state).toBe("cancelled");
  expect(transition(o("paid"), "cancel").state).toBe("refunded");
});
test("hidden: cannot cancel after shipping", () => {
  expect(() => transition(o("shipped"), "cancel")).toThrow("Cannot cancel from shipped");
});
test("hidden: error is IllegalTransition", () => {
  let err: any; try { transition(o("delivered"), "pay"); } catch (e) { err = e; }
  expect(err instanceof IllegalTransition).toBe(true);
});
test("hidden: does not mutate input", () => {
  const input = o("pending"); const out = transition(input, "pay");
  expect(input.state).toBe("pending");
  expect(input.history).toEqual(["pending"]);
  expect(out.history).toEqual(["pending", "paid"]);
});
test("hidden: terminal states reject everything", () => {
  for (const s of ["cancelled", "refunded", "delivered"]) for (const e of ["pay", "ship", "deliver", "cancel"]) expect(() => transition(o(s), e as any)).toThrow("Cannot " + e + " from " + s);
});
$f$))),
('token-bucket-skew', jsonb_build_array(jsonb_build_object('path','tests/hidden/rateLimiter.hidden.test.ts','content',$f$import { createLimiter } from "../../src/rateLimiter";
function clock() { let t = 10_000; return { now: () => t, set: (v: number) => { t = v; } }; }
test("hidden: backward jump does not drain", () => {
  const c = clock(); const l = createLimiter({ capacity: 2, refillPerSec: 1, now: c.now });
  c.set(0);
  expect([l.tryRemove(), l.tryRemove()]).toEqual([true, true]);
});
test("hidden: recovering clock is not double counted", () => {
  const c = clock(); const l = createLimiter({ capacity: 5, refillPerSec: 1, now: c.now });
  for (let i = 0; i < 5; i++) l.tryRemove();
  c.set(5_000); l.tryRemove();
  c.set(11_000);
  expect([l.tryRemove(), l.tryRemove()]).toEqual([true, false]);
});
test("hidden: fractional refill accumulates", () => {
  const c = clock(); const l = createLimiter({ capacity: 1, refillPerSec: 1, now: c.now });
  l.tryRemove();
  c.set(10_500); expect(l.tryRemove()).toBe(false);
  c.set(11_000); expect(l.tryRemove()).toBe(true);
});
$f$)))
) AS h(slug, files) ON h.slug = c.slug;
