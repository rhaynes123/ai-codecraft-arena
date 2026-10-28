import { describe, expect, it } from "vitest";
import { selectAIContext } from "./ai-context";
import { CHAT_MODEL, JUDGE_MODEL } from "./ai-models";

const files = [
  { path: "src/payment.ts", content: "export const pay = () => 1" },
  { path: "tests/payment.test.ts", content: "" },
  { path: "tests/retries.test.ts", content: "import { pay } from '../src/payment';" },
  { path: "src/other.ts", content: "" },
  { path: "tests/other.test.ts", content: "" },
  { path: "tests/payment.hidden.ts", content: "secret", hidden: true },
];

describe("AI context", () => {
  it("includes the active file and both named and importing visible tests", () => {
    expect(selectAIContext(files, "src/payment.ts", []).map((f) => f.path)).toEqual([
      "src/payment.ts", "tests/payment.test.ts", "tests/retries.test.ts",
    ]);
  });
  it("retains manually attached extras without including the whole workspace", () => {
    expect(selectAIContext(files, "src/payment.ts", ["src/other.ts"]).map((f) => f.path)).toEqual([
      "src/payment.ts", "tests/payment.test.ts", "tests/retries.test.ts", "src/other.ts",
    ]);
  });
  it("never includes hidden tests, even if manually attached", () => {
    expect(selectAIContext(files, "src/payment.ts", ["tests/payment.hidden.ts"]).some((f) => f.hidden)).toBe(false);
  });
  it("updates automatic context when switching the active file", () => {
    expect(selectAIContext(files, "src/other.ts", []).map((f) => f.path)).toEqual(["src/other.ts", "tests/other.test.ts"]);
  });
  it("attaches an active test file once", () => {
    expect(selectAIContext(files, "tests/payment.test.ts", ["tests/payment.test.ts"]).map((f) => f.path)).toEqual(["tests/payment.test.ts"]);
  });
  it("supports colocated spec files and avoids unrelated same-named modules", () => {
    const workspace = [
      { path: "src/a/item.ts", content: "" },
      { path: "src/a/item.spec.ts", content: "" },
      { path: "src/b/item.test.ts", content: "" },
    ];
    expect(selectAIContext(workspace, "src/a/item.ts", []).map((f) => f.path)).toEqual(["src/a/item.ts", "src/a/item.spec.ts"]);
  });
});

it("uses Luna for chat", () => expect(CHAT_MODEL).toBe("openai/gpt-6-luna"));
it("uses Luna for judging", () => expect(JUDGE_MODEL).toBe("openai/gpt-6-luna"));