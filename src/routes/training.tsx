import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { TrainingDirectory } from "@/components/TrainingDirectory";
import { trainingProviders } from "@/lib/training-providers";

export const Route = createFileRoute("/training")({
  head: () => ({
    meta: [
      { title: "Detroit bootcamps & training — Steer" },
      { name: "description", content: "Find real Detroit-area coding bootcamps, technology career training, college programs, and online options with official provider links." },
      { property: "og:title", content: "Detroit bootcamps & training — Steer" },
      { property: "og:description", content: "Explore verified official sources for Detroit technology training and online coding bootcamps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrainingPage,
});

function TrainingPage() {
  return <div className="min-h-screen"><AppHeader /><TrainingDirectory providers={trainingProviders} /></div>;
}