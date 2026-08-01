import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Server-side paywall. Every protected server function must call this —
 * the client route guard alone can be bypassed.
 */
export async function assertActiveAccount(userId: string) {
  const [{ data: role }, { data: profile }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
    supabaseAdmin.from("profiles").select("expires_at, disabled").eq("id", userId).maybeSingle(),
  ]);

  if (role) return { isAdmin: true as const };

  if (profile?.disabled) {
    throw new Error("Konti yawe yahagaritswe. Vugana n'umuyobozi.");
  }
  const expiresAt = profile?.expires_at as string | null;
  if (!expiresAt || new Date(expiresAt) <= new Date()) {
    throw new Error("Igihe cyawe cyarangiye. Ishyura kugira ngo ukomeze.");
  }
  return { isAdmin: false as const };
}

/** Extend a user's access by N days, starting from now or their current expiry. */
export async function extendAccess(userId: string, days: number) {
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("expires_at").eq("id", userId).maybeSingle();
  const current = profile?.expires_at ? new Date(profile.expires_at as string) : new Date();
  const base = current > new Date() ? current : new Date();
  base.setDate(base.getDate() + days);
  await supabaseAdmin
    .from("profiles")
    .update({ expires_at: base.toISOString(), disabled: false })
    .eq("id", userId);
  return base.toISOString();
}
