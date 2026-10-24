import { useState } from "react";
import { ExternalLink, GraduationCap, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { filterTraining, type TrainingArea, type TrainingKind, type TrainingProvider } from "@/lib/training";

const areas: ("All" | TrainingArea)[] = ["All", "Detroit area", "Online"];
const kinds: ("All" | TrainingKind)[] = ["All", "Bootcamp", "Career training", "College training"];

export function TrainingDirectory({ providers }: { providers: TrainingProvider[] }) {
  const [area, setArea] = useState<"All" | TrainingArea>("Detroit area");
  const [kind, setKind] = useState<"All" | TrainingKind>("All");
  const [search, setSearch] = useState("");
  const shown = filterTraining(providers, { area, kind, search });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary"><GraduationCap className="h-4 w-4" /> Detroit & beyond</p>
      <h1 className="mt-3 text-3xl font-bold">Bootcamps & training</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Coding bootcamps, technology career programs, and college training in Detroit and Southeast Michigan, plus online options.</p>

      <div className="mt-8 flex flex-wrap items-center gap-4 border-y py-4">
        <div role="group" aria-label="Training location" className="flex flex-wrap gap-1">
          {areas.map((value) => <Button key={value} variant={area === value ? "default" : "ghost"} size="sm" aria-pressed={area === value} onClick={() => setArea(value)}>{value === "All" ? "All locations" : value}</Button>)}
        </div>
        <div className="relative w-full sm:ml-auto sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Search training" placeholder="Search programs or skills" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
        </div>
      </div>
      <div role="group" aria-label="Training type" className="mt-4 flex flex-wrap gap-2">
        {kinds.map((value) => <Button key={value} size="sm" variant={kind === value ? "secondary" : "ghost"} aria-pressed={kind === value} onClick={() => setKind(value)}>{value === "All" ? "All programs" : value}</Button>)}
      </div>
      <p role="status" className="my-5 font-mono text-xs text-muted-foreground">{shown.length} {shown.length === 1 ? "provider" : "providers"}</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((provider) => (
          <article key={provider.id} className="flex min-w-0 flex-col rounded-lg border bg-card p-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{provider.kind}</Badge>
              {provider.areas.includes("Detroit area") && <Badge variant="outline">Detroit area</Badge>}
            </div>
            <h2 className="mt-4 text-xl font-semibold">{provider.name}</h2>
            <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{provider.location}</p>
            <p className="mt-4 text-sm leading-relaxed">{provider.summary}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">{provider.subjects.map((subject) => <Badge key={subject} variant="outline" className="font-mono text-[10px]">{subject}</Badge>)}</div>
            <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">{provider.costNote}</p>
            <div className="mt-auto pt-5">
              <Button asChild variant="outline" className="w-full"><a href={provider.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${provider.name} official website`}>Visit provider <ExternalLink /></a></Button>
              <p className="mt-3 font-mono text-[10px] text-muted-foreground">Official source checked {provider.verifiedOn}</p>
            </div>
          </article>
        ))}
      </div>
      {!shown.length && <div className="border-y py-10 text-center"><h2 className="font-semibold">No training matches these filters</h2><Button variant="outline" className="mt-4" onClick={() => { setArea("All"); setKind("All"); setSearch(""); }}>Clear filters</Button></div>}
      <p className="mt-8 max-w-3xl border-t pt-5 text-xs leading-relaxed text-muted-foreground">Independent directory, not a partnership or endorsement. Program schedules, tuition, funding, eligibility, and enrollment change; confirm current details directly with the provider. Online availability does not remove residency requirements.</p>
    </main>
  );
}