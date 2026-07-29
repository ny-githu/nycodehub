import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    const uid = data.session.user.id;
    const [{ data: adminRole }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
      supabase.from("profiles").select("expires_at, disabled").eq("id", uid).maybeSingle(),
    ]);
    const isAdmin = !!adminRole;
    const expiresAt = profile?.expires_at as string | null;
    const disabled = !!profile?.disabled;
    const active = isAdmin || (!disabled && !!expiresAt && new Date(expiresAt) > new Date());
    if (!active && !location.pathname.startsWith("/payment")) {
      throw redirect({ to: "/payment" });
    }
  },
  component: () => <Outlet />,
});
