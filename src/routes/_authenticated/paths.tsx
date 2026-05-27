import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/paths")({
  beforeLoad: () => { throw redirect({ to: "/courses" }); },
});
