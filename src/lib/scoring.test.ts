import { describe, expect, it } from "vitest";
import { creditCost, engineerRating, jobAccess, jobMatch, levelFor, practiceStreak, combineScores } from "./scoring";

describe("credits", () => {
  it("charges 1 credit per 500 chars, minimum 1", () => {
    expect(creditCost(10)).toBe(1);
    expect(creditCost(1200)).toBe(3);
  });
});

describe("levels", () => {
  it("maps ratings to L1-L5 thresholds", () => {
    expect(levelFor(39).level).toBe(1);
    expect(levelFor(40).level).toBe(2);
    expect(levelFor(55).level).toBe(3);
    expect(levelFor(70).level).toBe(4);
    expect(levelFor(85).level).toBe(5);
  });
  it("weights hard challenges above easy ones", () => {
    expect(engineerRating([{ overall: 60, difficulty: "Hard" }])).toBe(69);
    expect(engineerRating([{ overall: 60, difficulty: "Easy" }])).toBe(51);
  });
});

describe("jobs", () => {
  it("opens jobs at your level, stretches one up, locks beyond", () => {
    expect(jobAccess(2, 2)).toBe("open");
    expect(jobAccess(3, 2)).toBe("stretch");
    expect(jobAccess(4, 2)).toBe("locked");
  });
  it("computes match percentage from required strengths", () => {
    const mine = { verification: 35, economy: 80, steering: 70, correctness: 70 };
    expect(jobMatch({ verification: 70, correctness: 70 }, mine)).toBe(75);
  });
});

describe("scoring", () => {
  it("weights correctness 80% on pass rate", () => {
    const s = combineScores(
      { verification: 100, economy: 100, steering: 100, correctness: 100 },
      { verification: 0, economy: 0, steering: 0, correctness: 0 },
    );
    expect(s.correctness).toBe(80);
    expect(s.verification).toBe(60);
  });
  it("counts consecutive practice days", () => {
    const today = new Date("2026-10-24T12:00:00Z");
    expect(practiceStreak(["2026-10-24T01:00:00Z", "2026-10-23T05:00:00Z", "2026-10-21T05:00:00Z"], today)).toBe(2);
  });
});
