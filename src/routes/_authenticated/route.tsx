import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isAdmin = roles?.some((r) => r.role === "admin") ?? false;
    return { user: data.user, isAdmin };
  },
  component: Layout,
});

function Layout() {
  const { user, isAdmin } = Route.useRouteContext();
  return (
    <AppShell user={user} isAdmin={isAdmin}>
      <Outlet />
    </AppShell>
  );
}
