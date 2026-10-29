import { describe, expect, it } from "vitest";
import { creditCost, engineerRating, jobAccess, jobMatch, levelFor, levelFromReports, practiceStreak, combineScores } from "./scoring";

describe("credits", () => {
  it("charges 1 credit per 500 chars, minimum 1", () => {
    expect(creditCost(10)).toBe(1);
    expect(creditCost(1200)).toBe(3);
  });
});

describe("levels", () => {
  const top = { verification: 95, economy: 95, steering: 95, correctness: 95 };
  const all = { rating: 100, distinct: 30, hard: 10, avg: top };
  it("needs rating 50 and 3 challenges for L2", () => {
    expect(levelFor({ ...all, rating: 49 }).level).toBe(1);
    expect(levelFor({ ...all, distinct: 2 }).level).toBe(1);
    expect(levelFor({ ...all, rating: 50, distinct: 3, hard: 0, avg: null }).level).toBe(2);
  });
  it("needs 2 Hard challenges for Senior", () => {
    expect(levelFor({ ...all, hard: 1 }).level).toBe(2);
    expect(levelFor({ ...all, rating: 65, distinct: 8, hard: 2, avg: null }).level).toBe(3);
  });
  it("needs every skill 65+ for Staff and 75+ for Principal", () => {
    expect(levelFor({ ...all, avg: { ...top, steering: 64 } }).level).toBe(3);
    expect(levelFor({ ...all, avg: { ...top, steering: 74 } }).level).toBe(4);
    expect(levelFor(all).level).toBe(5);
  });
  it("needs 25 challenges for Principal", () => {
    expect(levelFor({ ...all, distinct: 24 }).level).toBe(4);
  });
  it("counts only your best attempt per challenge", () => {
    const r = Array.from({ length: 10 }, (_, i) => ({ overall: 60, difficulty: "Medium", slug: `c${i}` }));
    expect(engineerRating([{ overall: 40, difficulty: "Medium", slug: "c0" }, ...r])).toBe(60);
  });
  it("pulls the rating toward 50 under 10 distinct challenges", () => {
    expect(engineerRating(Array.from({ length: 5 }, (_, i) => ({ overall: 90, difficulty: "Medium", slug: `c${i}` })))).toBe(70);
  });
  it("11 exercises with high scores is not Principal", () => {
    const reps = Array.from({ length: 11 }, (_, i) => ({ overall: 98, difficulty: "Hard", slug: `c${i}`, scores: top }));
    expect(levelFromReports(reps).level.level).toBeLessThan(5);
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
