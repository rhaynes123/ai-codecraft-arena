import { describe, expect, it } from "vitest";
import { filterTraining, type TrainingProvider } from "./training";

const providers: TrainingProvider[] = [
  { id: "local", name: "Local provider", kind: "Career training", areas: ["Detroit area"], location: "Detroit", summary: "IT training", subjects: ["IT support"], costNote: "See provider", url: "https://local.test", verifiedOn: "2026-10-24" },
  { id: "online", name: "Online provider", kind: "Bootcamp", areas: ["Online"], location: "Online", summary: "Software development", subjects: ["JavaScript"], costNote: "See provider", url: "https://online.test", verifiedOn: "2026-10-24" },
];

describe("Training directory filters", () => {
  it("shows Detroit-area training without unrelated online-only programs", () => {
    expect(filterTraining(providers, { area: "Detroit area", kind: "All", search: "" }).map(p => p.id)).toEqual(["local"]);
  });
  it("keeps online training available to engineers elsewhere", () => {
    expect(filterTraining(providers, { area: "Online", kind: "All", search: "" }).map(p => p.id)).toEqual(["online"]);
  });
  it("combines program type and subject search", () => {
    expect(filterTraining(providers, { area: "All", kind: "Bootcamp", search: " JAVASCRIPT " }).map(p => p.id)).toEqual(["online"]);
    expect(filterTraining(providers, { area: "All", kind: "Career training", search: "JavaScript" })).toEqual([]);
  });
});