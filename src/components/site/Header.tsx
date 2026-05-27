import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "./Logo";

const links = [
  { to: "/courses", label: "Courses" },
  { to: "/practice", label: "Practice" },
  { to: "/instructors", label: "Instructors" },
  { to: "/payment", label: "Payment" },
] as const;

export function Header() {
  const { user, signOut, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="container mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md inline-flex items-center gap-1"
              activeProps={{ className: "px-3 py-2 text-sm text-foreground rounded-md bg-surface inline-flex items-center gap-1" }}
            >
              {l.label === "Payment" && <CreditCard className="size-3.5" />}
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="px-3 py-2 text-sm text-primary-glow hover:text-foreground transition-colors rounded-md inline-flex items-center gap-1"
              activeProps={{ className: "px-3 py-2 text-sm text-foreground rounded-md bg-surface inline-flex items-center gap-1" }}
            >
              <ShieldCheck className="size-3.5" /> Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <span className="hidden sm:inline text-xs font-mono text-muted-foreground truncate max-w-[180px]">
                {user.email}
              </span>
              <button
                onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md"
              >
                <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
              </button>
              <Link
                to="/practice"
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-gradient-primary text-primary-foreground shadow-glow hover:brightness-110 transition"
              >
                Open lab
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-gradient-primary text-primary-foreground shadow-glow hover:brightness-110 transition"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
