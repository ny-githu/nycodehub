import { Link, useNavigate } from "@tanstack/react-router";
import { Terminal, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const links = [
  { to: "/courses", label: "Courses" },
  { to: "/paths", label: "Paths" },
  { to: "/practice", label: "Practice" },
  { to: "/instructors", label: "Instructors" },
  { to: "/pricing", label: "Pricing" },
] as const;

export function Header() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="container mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-mono font-bold text-foreground">
          <span className="grid place-items-center size-8 rounded-md bg-gradient-primary shadow-glow">
            <Terminal className="size-4 text-primary-foreground" />
          </span>
          <span>byteforge<span className="text-primary-glow">_</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md"
              activeProps={{ className: "px-3 py-2 text-sm text-foreground rounded-md bg-surface" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <span className="hidden sm:inline text-xs font-mono text-muted-foreground truncate max-w-[180px]">
                {user.email}
              </span>
              <button
                onClick={async () => { await signOut(); navigate({ to: "/" }); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md"
                aria-label="Sign out"
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
            <>
              <Link to="/login" className="hidden sm:inline-flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-gradient-primary text-primary-foreground shadow-glow hover:brightness-110 transition"
              >
                Start hacking
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
