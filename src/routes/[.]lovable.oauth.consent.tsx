import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/site/Layout";
import { Loader2, ShieldCheck } from "lucide-react";

type AuthDetails = {
  client?: { name?: string; client_uri?: string } | null;
  redirect_uri?: string;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthClient = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};

function oauthClient(): OAuthClient {
  return (supabase.auth as unknown as { oauth: OAuthClient }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/login", search: { redirect: next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthClient().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <Layout>
      <main className="container mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold mb-2">Ntibyakunze</h1>
        <p className="text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </main>
    </Layout>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as AuthDetails | null;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const client = oauthClient();
    const { data, error } = approve
      ? await client.approveAuthorization(authorization_id)
      : await client.denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "Ikoreshwa";
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <Layout>
      <main className="container mx-auto max-w-md px-4 py-16 animate-fade-in">
        <div className="rounded-xl border border-border bg-gradient-card p-6 shadow-elevated">
          <div className="flex items-center gap-3 mb-4">
            <span className="grid place-items-center size-10 rounded-md bg-gradient-primary shadow-glow">
              <ShieldCheck className="size-5 text-primary-foreground" />
            </span>
            <div>
              <h1 className="text-lg font-bold">Emeza guhuza</h1>
              <p className="text-xs text-muted-foreground font-mono">NYCODEHUB · OAuth</p>
            </div>
          </div>

          <p className="text-sm mb-3">
            <span className="font-semibold">{clientName}</span> irasaba kwinjira muri NYCODEHUB nka wowe.
          </p>
          <ul className="text-sm space-y-1 mb-4 text-muted-foreground">
            <li>• Izajya ikoresha ibikoresho bya NYCODEHUB nk'aho ari wowe.</li>
            <li>• Uburenganzira bwawe n'amabwiriza y'urubuga biracyakomeza gukurikizwa.</li>
            {scopes.length > 0 && (
              <li>• Uburenganzira busabwa: <span className="font-mono text-xs">{scopes.join(" ")}</span></li>
            )}
          </ul>

          {error && <p role="alert" className="text-sm text-red-500 mb-3">{error}</p>}

          <div className="flex gap-2">
            <button
              disabled={busy !== null}
              onClick={() => decide(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60 hover-scale"
            >
              {busy === "approve" && <Loader2 className="size-4 animate-spin" />}
              Emera
            </button>
            <button
              disabled={busy !== null}
              onClick={() => decide(false)}
              className="flex-1 px-4 py-2.5 rounded-md bg-surface border border-border text-sm disabled:opacity-60 hover-scale"
            >
              {busy === "deny" && <Loader2 className="size-4 animate-spin inline mr-2" />}
              Hakana
            </button>
          </div>
        </div>
      </main>
    </Layout>
  );
}
