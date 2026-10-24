import { describe, expect, it } from "vitest";
import {
  dedupeJobs,
  fixMojibake,
  inferLevel,
  inferRemote,
  inferRoleType,
  normalizeHn,
  normalizeRemoteok,
  normalizeRemotive,
  parseHnPosting,
  parseSalaryString,
  requiredForLevel,
} from "./job-feed";

describe("inferLevel", () => {
  it("maps posting-title keywords to engineer levels", () => {
    expect(inferLevel("Associate Frontend Engineer")).toBe(1);
    expect(inferLevel("Software Engineer II")).toBe(2);
    expect(inferLevel("Senior Backend Engineer")).toBe(3);
    expect(inferLevel("Staff Platform Engineer")).toBe(4);
    expect(inferLevel("Principal Architect")).toBe(5);
  });

  it("lifts a plainly titled role when the salary says senior", () => {
    expect(inferLevel("Software Engineer", 180000)).toBe(3);
    expect(inferLevel("Software Engineer", 260000)).toBe(5);
  });
});

describe("parseSalaryString", () => {
  it("reads dollar-k ranges from free text", () => {
    expect(parseSalaryString("$170k - $200k")).toEqual({ min: 170000, max: 200000 });
    expect(parseSalaryString("70K-80K")).toEqual({ min: 70000, max: 80000 });
    expect(parseSalaryString("$35,3k- $52k")).toEqual({ min: 35300, max: 52000 });
  });

  it("ignores hourly, per-task and missing salaries", () => {
    expect(parseSalaryString("$50-$75 /hour")).toEqual({ min: 0, max: 0 });
    expect(parseSalaryString("$1000 per task")).toEqual({ min: 0, max: 0 });
    expect(parseSalaryString("")).toEqual({ min: 0, max: 0 });
  });
});

describe("role and location inference", () => {
  it("classifies role types", () => {
    expect(inferRoleType("Senior React Full-stack Developer")).toBe("full-stack");
    expect(inferRoleType("Backend Engineer")).toBe("backend");
    expect(inferRoleType("Frontend Engineer")).toBe("frontend");
    expect(inferRoleType("Site Reliability Engineer")).toBe("platform");
  });

  it("detects remote from the posting text", () => {
    expect(inferRemote("Worldwide")).toBe(true);
    expect(inferRemote("Helsinki, Finland | ONSITE")).toBe(false);
    expect(inferRemote("USA, Canada", true)).toBe(true);
  });
});

describe("normalizeRemoteok", () => {
  it("keeps engineering roles with absolute links and real salaries", () => {
    const job = normalizeRemoteok({
      id: 1137562,
      position: "Senior Frontend Engineer",
      company: "B2spin",
      url: "/remote-jobs/remote-senior-frontend-engineer-b2spin-1137562",
      salary_min: 140000,
      salary_max: 0,
      tags: ["react", "typescript"],
      description: "<p>Build <b>UI</b> things</p>",
    });
    expect(job?.url).toBe("https://remoteok.com/remote-jobs/remote-senior-frontend-engineer-b2spin-1137562");
    expect(job?.level).toBe(3);
    expect(job?.role_type).toBe("frontend");
    expect(job?.salary_min).toBe(140000);
    expect(job?.salary_max).toBe(140000);
    expect(job?.description).toBe("Build UI things");
    expect(job?.source).toBe("Remote OK");
  });

  it("drops non-engineering postings", () => {
    expect(normalizeRemoteok({ position: "Sales Development Representative", company: "Huzzle", url: "https://x.com/a" })).toBeNull();
  });
});

describe("normalizeRemotive", () => {
  it("parses the salary string and treats the board as remote", () => {
    const job = normalizeRemotive({
      id: 2091161,
      title: "Tech Lead Full-Stack Rails Engineer",
      company_name: "Acme",
      url: "https://remotive.com/remote-jobs/software-dev/tech-lead-2091161",
      salary: "$170k - $200k",
      candidate_required_location: "USA, Canada",
      tags: ["rails"],
      description: "<p>We build things</p>",
    });
    expect(job?.level).toBe(3);
    expect(job?.salary_min).toBe(170000);
    expect(job?.salary_max).toBe(200000);
    expect(job?.remote).toBe(true);
    expect(job?.role_type).toBe("full-stack");
  });
});

describe("parseHnPosting", () => {
  const sample =
    'Treat Health | Full-stack Engineer (Elixir, Phoenix LiveView, React) | Helsinki, Finland | ONSITE | Full-time | We build healthcare<a href="https://treathealth.example/careers">careers</a>';

  it("reads the pipe-delimited hiring post", () => {
    const parsed = parseHnPosting(sample);
    expect(parsed?.company).toBe("Treat Health");
    expect(parsed?.title).toBe("Full-stack Engineer (Elixir, Phoenix LiveView, React)");
    expect(parsed?.location).toBe("Helsinki, Finland");
    expect(parsed?.remote).toBe(false);
    expect(parsed?.url).toBe("https://treathealth.example/careers");
  });

  it("returns null for posts without the hiring format", () => {
    expect(parseHnPosting("Would you be open for a full stack engineer? I am seeking an opportunity")).toBeNull();
  });

  it("keeps the level and source when normalized", () => {
    const job = normalizeHn({ objectID: "123", comment_text: sample });
    expect(job?.source).toBe("HN Who's Hiring");
    // The post names no seniority, so it lands at the default mid-level bar.
    expect(job?.level).toBe(2);
    expect(job?.salary_min).toBe(0);
  });
});

describe("dedupeJobs", () => {
  it("keeps one copy of a role posted on two boards", () => {
    const remotive = normalizeRemotive({
      title: "Senior Backend Engineer",
      company_name: "Globex",
      url: "https://remotive.com/remote-jobs/software-dev/senior-backend-engineer-globex-1",
    });
    const remoteok = normalizeRemoteok({
      position: "Senior Backend Engineer",
      company: "Globex",
      url: "https://remoteok.com/remote-jobs/senior-backend-engineer-globex-2",
    });
    expect(dedupeJobs([remotive!, remoteok!])).toHaveLength(1);
  });
});

describe("requiredForLevel", () => {
  it("sets dimension bars that rise with the level", () => {
    expect(requiredForLevel(3)).toEqual({ verification: 55, economy: 55, steering: 55, correctness: 65 });
    expect(requiredForLevel(5).verification).toBeGreaterThan(requiredForLevel(1).verification!);
  });
});

describe("fixMojibake", () => {
  it("repairs double-encoded characters from the feeds", () => {
    expect(fixMojibake("Sotheby\u00e2\u0080\u0099s")).toBe("Sotheby\u2019s");
    expect(fixMojibake("Sotheby's")).toBe("Sotheby's");
    expect(fixMojibake("Café")).toBe("Café");
  });

  it("keeps a real apostrophe in a company name", () => {
    const job = normalizeRemoteok({
      position: "Senior Software Engineer",
      company: "Sotheby\u00e2\u0080\u0099s",
      url: "https://remoteok.com/remote-jobs/remote-senior-software-engineer-sothebys-1137545",
    });
    expect(job?.company).toBe("Sotheby\u2019s");
  });
});

describe("parseHnPosting cleanup", () => {
  it("keeps the company site out of the company name and the blurb", () => {
    const parsed = parseHnPosting(
      "Sendery ( https://sendery.co) | iOS Engineer | Remote | Full-time | Build our app. More at https://sendery.co/careers",
    );
    expect(parsed?.company).toBe("Sendery");
    expect(parsed?.location).toBe("Remote");
    expect(parsed?.remote).toBe(true);
    expect(parsed?.description).not.toMatch(/https?:\/\//);
    expect(parsed?.url).toBe("https://sendery.co");
  });

  it("falls back when the location field holds a whole paragraph", () => {
    const parsed = parseHnPosting(
      "Oscilar.com | Sr/Staff Software Engineers, Data Scientist, FDE, PM | REMOTE (US/Canada/Brazil/Poland/UK/India) Full-time AI Risk Decisioning platform that helps organizations manage risk | Full-time | We build things https://oscilar.com/careers",
    );
    expect(parsed?.location).toBe("See posting");
    expect(parsed?.description).toBe("We build things");
    expect(parsed?.url).toBe("https://oscilar.com/careers");
  });
});

describe("parseHnPosting company cleanup", () => {
  it("drops a bracketed bare domain from the company name", () => {
    const parsed = parseHnPosting(
      "Chronograph (chronograph.pe) | Platform Engineer | Remote | Full-time | We build things https://chronograph.pe/jobs",
    );
    expect(parsed?.company).toBe("Chronograph");
    expect(parsed?.url).toBe("https://chronograph.pe/jobs");
  });
});
