import type { TrainingProvider } from "./training";

export const trainingProviders: TrainingProvider[] = [
  {
    id: "per-scholas-detroit", name: "Per Scholas Detroit", kind: "Career training",
    areas: ["Detroit area", "Online"], location: "Detroit · remote and hybrid courses",
    summary: "Technology career training with Detroit programs in IT support and cybersecurity, including AI-enabled courses.",
    subjects: ["IT support", "Cybersecurity", "AI tools"],
    costNote: "No-cost training. Admissions, residency, income requirements, and prerequisites apply; check the individual course.",
    url: "https://perscholas.org/locations/detroit/", verifiedOn: "2026-10-24",
  },
  {
    id: "detroit-at-work", name: "Detroit at Work", kind: "Career training",
    areas: ["Detroit area"], location: "Detroit · provider-based training",
    summary: "Local workforce training directory and support connecting Detroiters with career programs, including information technology.",
    subjects: ["Information technology", "Career support"],
    costNote: "Free training opportunities for eligible Detroiters. Confirm funding, eligibility, and current IT program availability with Detroit at Work.",
    url: "https://detroitatwork.com/training", verifiedOn: "2026-10-24",
  },
  {
    id: "wcccd", name: "Wayne County Community College District", kind: "College training",
    areas: ["Detroit area", "Online"], location: "Wayne County · online learning options",
    summary: "The Connecting Minority Communities project lists IT certification, digital literacy, and short-term AI training opportunities.",
    subjects: ["IT certifications", "Digital literacy", "AI"],
    costNote: "The project lists free certification testing; course tuition and eligibility must be confirmed. This is not a claim that every course is free.",
    url: "https://www.wcccd.edu/connecting-minority-communities-project", verifiedOn: "2026-10-24",
  },
  {
    id: "nucamp", name: "Nucamp", kind: "Bootcamp",
    areas: ["Detroit area", "Online"], location: "Online · Detroit community",
    summary: "Part-time online coding bootcamps with a Detroit community page and web and software development pathways. Not a confirmed in-person Detroit cohort.",
    subjects: ["Web development", "Software development"],
    costNote: "Paid programs. Check current tuition, financing, schedules, and enrollment with Nucamp.",
    url: "https://www.nucamp.co/community/mi/detroit", verifiedOn: "2026-10-24",
  },
  {
    id: "umich-fullstack", name: "University of Michigan / Fullstack Academy", kind: "Bootcamp",
    areas: ["Online"], location: "Live online · Michigan-associated program",
    summary: "Online coding bootcamp offered through U-M Engineering Professional Education and delivered by Fullstack Academy. Non-credit; not a U-M degree or a course taught by U-M faculty.",
    subjects: ["Coding", "Web development"],
    costNote: "Check current tuition and admissions directly with the provider; no free funding is assumed.",
    url: "https://bootcamp.engin.umich.edu/", verifiedOn: "2026-10-24",
  },
];