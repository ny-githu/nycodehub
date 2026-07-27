import { t } from "@/lib/i18n";

export function Footer() {
  return (
    <footer className="border-t border-border mt-12">
      <div className="container mx-auto max-w-7xl px-6 py-6 text-xs text-muted-foreground flex items-center justify-between">
        <span className="font-mono font-semibold text-foreground">NYCODEHUB<span className="text-primary-glow caret-blink">_</span></span>
        <span>© {new Date().getFullYear()} · {t.footer_rights}</span>
      </div>
    </footer>
  );
}
