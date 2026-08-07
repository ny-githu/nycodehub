import { t } from "@/lib/i18n";
import { InstallAppButton } from "./InstallAppButton";

export function Footer() {
  return (
    <footer className="border-t border-border mt-12">
      <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
        <span className="font-mono font-semibold text-foreground">NYCODEHUB<span className="text-primary-glow caret-blink">_</span></span>
        <InstallAppButton />
        <span>© {new Date().getFullYear()} · {t.footer_rights}</span>
      </div>
    </footer>
  );
}
