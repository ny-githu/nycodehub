import { Link } from "@tanstack/react-router";
import { t } from "@/lib/i18n";

export function Footer() {
  return (
    <footer className="border-t border-border mt-32">
      <div className="container mx-auto max-w-7xl px-6 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="font-mono font-bold text-lg">NYCODEHUB<span className="text-primary-glow caret-blink">_</span></div>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">{t.footer_lead}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">{t.footer_h_learn}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/courses" className="hover:text-foreground story-link">{t.nav_courses}</Link></li>
            <li><Link to="/practice" className="hover:text-foreground story-link">{t.nav_practice}</Link></li>
            <li><Link to="/instructors" className="hover:text-foreground story-link">{t.nav_instructors}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">{t.footer_h_account}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/payment" className="hover:text-foreground story-link">{t.nav_payment}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">{t.footer_h_news}</h4>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="we@example.com"
              className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="px-3 py-2 text-sm rounded-md bg-gradient-primary text-primary-foreground hover-scale">{t.footer_news_btn}</button>
          </form>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container mx-auto max-w-7xl px-6 py-6 text-xs text-muted-foreground flex justify-between">
          <span>© {new Date().getFullYear()} NYCODEHUB. {t.footer_rights}</span>
          <span className="font-mono">$ exit 0</span>
        </div>
      </div>
    </footer>
  );
}
