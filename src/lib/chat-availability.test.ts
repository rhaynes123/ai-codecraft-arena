import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), gateway: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/lib/ai.server", () => ({ createGateway: mocks.gateway, reasoningOptions: vi.fn() }));
vi.mock("@/lib/supabase-user.server", () => ({
  userClientFromRequest: async () => ({ supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "attempt", status: "in_progress" } }) }) }) }),
    rpc: mocks.rpc,
  } }),
}));

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("returns 503 without spending practice credits when AI credentials are unavailable", async () => {
  vi.stubEnv("LOVABLE_API_KEY", "");
  const { Route } = await import("@/routes/api/chat");
  const route = Route as unknown as { server: { handlers: { POST: (input: { request: Request }) => Promise<Response> } } };
  const response = await route.server.handlers.POST({ request: new Request("http://localhost/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId: "attempt", messages: [{ role: "user", content: "Help" }], context: [] }),
  }) });
  expect(response.status).toBe(503);
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.gateway).not.toHaveBeenCalled();
});