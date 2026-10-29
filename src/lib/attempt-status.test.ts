import { describe, expect, it } from "vitest";
import { attemptStatusByChallenge } from "./queries";

describe("attemptStatusByChallenge", () => {
  // Repeating a completed challenge leaves it completed, not "in progress" again.
  it("completed beats in progress when a challenge has both", () => {
    const map = attemptStatusByChallenge([
      { challenge_id: "a", status: "submitted" },
      { challenge_id: "a", status: "in_progress" },
    ]);
    expect(map.get("a")).toBe("completed");
  });

  it("marks open attempts as in progress", () => {
    const map = attemptStatusByChallenge([{ challenge_id: "b", status: "in_progress" }]);
    expect(map.get("b")).toBe("in_progress");
  });

  it("ignores unknown statuses", () => {
    const map = attemptStatusByChallenge([{ challenge_id: "c", status: "archived" }]);
    expect(map.has("c")).toBe(false);
  });
});
