import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/hooks/use-session";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-mono text-sm font-bold tracking-tight">
      <span className="grid h-6 w-6 place-items-center rounded-sm bg-primary text-primary-foreground">▲</span>
      steer<span className="text-primary">10x</span>
    </Link>
  );
}

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: ["profile"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function AppHeader() {
  const { user, ready } = useSessionUser();
  const profile = useProfile(!!user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkCls = "text-sm text-muted-foreground hover:text-foreground transition-colors";
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <Logo />
        <nav aria-label="Main navigation" className="order-3 flex w-full flex-wrap items-center gap-1 sm:order-none sm:w-auto">
          <Button asChild variant="ghost" size="sm"><Link to="/challenges" className={linkCls} activeProps={{ className: "text-foreground" }}>Challenges</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/training" className={linkCls} activeProps={{ className: "text-foreground" }}>Training</Link></Button>
          {user && <Button asChild variant="ghost" size="sm"><Link to="/dashboard" className={linkCls} activeProps={{ className: "text-foreground" }}>Dashboard</Link></Button>}
          {user && <Button asChild variant="ghost" size="sm"><Link to="/jobs" className={linkCls} activeProps={{ className: "text-foreground" }}>Jobs</Link></Button>}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {ready && user ? (
            <>
              <span className="flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-xs">
                <Coins className="h-3.5 w-3.5 text-warning" />
                {profile.data?.credits ?? "—"}
              </span>
              <span className="hidden text-sm text-muted-foreground sm:inline">{profile.data?.display_name}</span>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : ready ? (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
