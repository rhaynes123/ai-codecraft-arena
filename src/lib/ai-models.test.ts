import { describe, expect, it } from "vitest";
import { CHAT_MODEL, JUDGE_MODEL, modelLabel } from "./ai-models";

describe("modelLabel", () => {
  it("shows the chat model as GPT-6 Luna", () => expect(modelLabel(CHAT_MODEL)).toBe("GPT-6 Luna"));
  it("shows the judge model as GPT-6 Sol", () => expect(modelLabel(JUDGE_MODEL)).toBe("GPT-6 Sol"));
});
