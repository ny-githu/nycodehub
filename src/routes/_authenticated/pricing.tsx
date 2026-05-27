import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pricing")({
  beforeLoad: () => { throw redirect({ to: "/payment" }); },
});
