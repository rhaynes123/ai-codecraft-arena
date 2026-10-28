import { describe, expect, it } from "vitest";
import { ATTEMPT_CREDIT_CAP, DAILY_CREDIT_CAP, capBlocking, capFromError } from "./credit-caps";
import { computeMetrics, creditEconomyAdjustment } from "./scoring";

describe("practice credit caps", () => {
  it("caps each attempt at 20 credits", () => {
    expect(ATTEMPT_CREDIT_CAP).toBe(20);
    expect(capBlocking(2, 18, 0)).toBeNull();
    expect(capBlocking(3, 18, 0)).toBe("attempt");
  });
  it("caps each day at 40 credits across attempts", () => {
    expect(DAILY_CREDIT_CAP).toBe(40);
    expect(capBlocking(5, 0, 35)).toBeNull();
    expect(capBlocking(6, 0, 35)).toBe("daily");
  });
  it("recognises cap errors from the database", () => {
    expect(capFromError("ATTEMPT_CAP: budget")).toBe("attempt");
    expect(capFromError("DAILY_CAP: limit")).toBe("daily");
    expect(capFromError("Not enough credits")).toBeNull();
  });
  it("rewards economy for spending fewer credits", () => {
    expect(creditEconomyAdjustment(0)).toBe(5);
    expect(creditEconomyAdjustment(20)).toBe(-5);
    const prompt = [{ type: "prompt", payload: { chars: 200, contextChars: 1000 } }];
    expect(computeMetrics(prompt, 1, 2).scores.economy).toBeGreaterThan(computeMetrics(prompt, 1, 20).scores.economy);
  });
});
