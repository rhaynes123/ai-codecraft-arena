import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, FileCode } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/hooks/use-session";

export const Route = createFileRoute("/challenges/$slug")({
  head: () => ({
    meta: [
      { title: "Challenge brief — Steer" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Read the brief and acceptance criteria, then start the challenge in the AI-paired IDE." },
      { property: "og:title", content: "Challenge brief — Steer" },
      { property: "og:description", content: "A real-world repo challenge for AI-assisted engineers." },
    ],
  }),
  component: Brief,
});

function Brief() {
  const { slug } = Route.useParams();
  const { user } = useSessionUser();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const { data: c, isLoading } = useQuery({
    queryKey: ["challenge", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("challenges").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function start() {
    if (!c) return;
    if (!user) return navigate({ to: "/auth", search: { redirect: `/challenges/${slug}` } });
    setStarting(true);
    const { data: existing } = await supabase
      .from("attempts").select("id").eq("challenge_id", c.id).eq("status", "in_progress")
      .order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (existing) return navigate({ to: "/workspace/$attemptId", params: { attemptId: existing.id } });
    const files = [...(c.starter_files as any[]), ...(c.visible_tests as any[])];
    const { data, error } = await supabase.from("attempts").insert({ user_id: user.id, challenge_id: c.id, files }).select("id").single();
    setStarting(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/workspace/$attemptId", params: { attemptId: data.id } });
  }

  if (isLoading) return <div className="min-h-screen"><AppHeader /></div>;
  if (!c) return <div className="min-h-screen"><AppHeader /><p className="p-10 text-center text-muted-foreground">Challenge not found.</p></div>;
  const files = [...(c.starter_files as any[]), ...(c.visible_tests as any[])];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
        <div>
          <Link to="/challenges" className="font-mono text-xs text-muted-foreground hover:text-foreground">← all challenges</Link>
          <p className="mt-4 font-mono text-xs text-primary">{c.category} · {c.difficulty}</p>
          <h1 className="mt-2 text-3xl font-bold">{c.title}</h1>
          <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">{c.description}</p>
          <h2 className="mt-8 font-mono text-sm uppercase tracking-widest text-muted-foreground">Acceptance criteria</h2>
          <ul className="mt-3 space-y-2">
            {c.acceptance.map((a) => <li key={a} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{a}</li>)}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">Visible tests are included in the repo. Hidden tests run when you submit.</p>
        </div>
        <aside className="h-fit rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />~{c.est_minutes} minutes</div>
          <h3 className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">Repo</h3>
          <ul className="mt-2 space-y-1">{files.map((f) => <li key={f.path} className="flex items-center gap-2 font-mono text-xs"><FileCode className="h-3.5 w-3.5 text-muted-foreground" />{f.path}</li>)}</ul>
          <Button className="mt-6 w-full" onClick={start} disabled={starting}>{user ? "Open in IDE" : "Sign in to start"}</Button>
          <p className="mt-3 text-xs text-muted-foreground">AI messages cost credits based on prompt + attached file size.</p>
        </aside>
      </main>
    </div>
  );
}
