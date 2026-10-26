import type { Dimension } from "./scoring";

export type Measure = {
  key: Dimension;
  title: string;
  tagline: string;
  why: string;
  signals: string[];
  strong: string[];
  weak: string[];
  tips: string[];
};

export const MEASURES: Record<Dimension, Measure> = {
  verification: {
    key: "verification",
    title: "Verification Rigor",
    tagline: "Trust, but run the tests.",
    why: "AI writes plausible code fast — and plausible is not the same as correct. Engineers who check AI output before moving on ship fewer bugs and catch the edge cases the model glossed over.",
    signals: [
      "Whether each AI change you apply is followed by a test run before the next change",
      "How often you run the tests during a session",
      "Whether you make your own manual edits rather than only pasting AI output",
    ],
    strong: ["Apply a diff, run tests, then decide the next step", "Read failures and fix them before asking for more code", "Tweak AI output by hand when it's almost right"],
    weak: ["Stacking several AI changes without running anything", "Submitting without a single test run", "Accepting every suggestion as-is"],
    tips: ["Make 'apply → run tests' a habit", "Ask the AI to explain an edge case, then write a check for it", "Treat a green run as evidence, not a formality"],
  },
  economy: {
    key: "economy",
    title: "Prompt & Context Economy",
    tagline: "Say what you need, send what matters.",
    why: "Clear, focused prompts get better answers and cost less. Dumping everything into the chat slows the model down and buries the real question.",
    signals: [
      "Prompt length — too short to be clear, or long and rambling",
      "How much file context is sent with each prompt",
      "How many prompts it takes to finish the challenge",
    ],
    strong: ["One specific ask per message", "Relying on the active file and its tests instead of attaching everything", "Reaching a solution in a handful of well-aimed prompts"],
    weak: ["One-word prompts like 'fix it'", "Attaching every file every time", "Dozens of near-identical retries"],
    tips: ["State the goal, the constraint and what 'done' means", "Quote the exact failing test instead of describing it", "Attach extra files only when they truly matter"],
  },
  steering: {
    key: "steering",
    title: "Steering & Iteration",
    tagline: "You're the driver; the AI is the engine.",
    why: "The AI will sometimes be confidently wrong. The skill is noticing, saying no, and redirecting quickly — that's what turns a 10x tool into 10x output.",
    signals: [
      "Rejecting AI diffs that don't fit",
      "Recovering from failing test runs to a passing one",
      "Correcting or redirecting the AI rather than blindly accepting",
    ],
    strong: ["Rejecting a diff that changes the wrong thing", "Turning red tests green after a correction", "Telling the AI precisely what it got wrong"],
    weak: ["Applying every diff regardless of quality", "Getting stuck on failing tests without changing approach", "Letting the AI wander off the brief"],
    tips: ["Review each diff before applying it", "When the AI loops, change the question, not just the wording", "Name the hallucination: 'that function doesn't exist — use X'"],
  },
  correctness: {
    key: "correctness",
    title: "Correctness & Quality",
    tagline: "Does it actually work — everywhere?",
    why: "In the end, the code has to be right and readable. Hidden tests check the cases you weren't shown, the same way production does.",
    signals: [
      "Pass rate on the visible tests",
      "Pass rate on the hidden tests that run only on submission",
      "Readability of the final code as judged by the scoring model",
    ],
    strong: ["All visible tests passing before you submit", "Handling edge cases beyond the visible tests", "Clean, readable final code"],
    weak: ["Submitting with failing visible tests", "Code that only works for the exact visible examples", "Leftover dead code or confusing names"],
    tips: ["Ask: what input would break this?", "Read the acceptance criteria once more before submitting", "Tidy up names and remove leftovers at the end"],
  },
};

export const MEASURE_KEYS = Object.keys(MEASURES) as Dimension[];
export const isMeasureKey = (k: string): k is Dimension => (MEASURE_KEYS as string[]).includes(k);
