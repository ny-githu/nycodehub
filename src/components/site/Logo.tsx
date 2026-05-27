import { Link } from "@tanstack/react-router";
import { Terminal } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text = "NYCODEHUB";
  const dim = size === "sm" ? "text-base" : size === "lg" ? "text-3xl" : "text-lg";
  const badge = size === "lg" ? "size-11" : size === "sm" ? "size-7" : "size-8";
  const icon = size === "lg" ? "size-5" : "size-4";

  return (
    <Link to="/" className="group inline-flex items-center gap-2.5 font-mono font-bold text-foreground select-none">
      <span className={`relative grid place-items-center ${badge} rounded-md bg-gradient-primary shadow-glow overflow-hidden`}>
        <Terminal className={`${icon} text-primary-foreground relative z-10`} />
        <span className="absolute inset-0 bg-gradient-to-tr from-primary-glow/0 via-primary-glow/40 to-primary-glow/0 logo-shimmer" />
      </span>
      <span className={`${dim} tracking-tight flex`}>
        {text.split("").map((c, i) => (
          <span
            key={i}
            className="logo-letter inline-block"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            {c}
          </span>
        ))}
        <span className="text-primary-glow caret-blink ml-0.5">_</span>
      </span>
    </Link>
  );
}
