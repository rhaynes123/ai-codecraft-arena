export type TrainingKind = "Bootcamp" | "Career training" | "College training";
export type TrainingArea = "Detroit area" | "Online";

export type TrainingProvider = {
  id: string;
  name: string;
  kind: TrainingKind;
  areas: TrainingArea[];
  location: string;
  summary: string;
  subjects: string[];
  costNote: string;
  url: string;
  verifiedOn: string;
};

export function filterTraining(
  providers: TrainingProvider[],
  filters: { area: "All" | TrainingArea; kind: "All" | TrainingKind; search: string },
) {
  const query = filters.search.trim().toLowerCase();
  return providers.filter((provider) =>
    (filters.area === "All" || provider.areas.includes(filters.area)) &&
    (filters.kind === "All" || provider.kind === filters.kind) &&
    (!query || [provider.name, provider.summary, provider.location, ...provider.subjects]
      .join(" ").toLowerCase().includes(query)),
  );
}