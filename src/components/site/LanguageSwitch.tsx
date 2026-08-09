import { Languages } from "lucide-react";
import { LOCALES, getLocale, setLocale, type Locale } from "@/lib/i18n";
import { useEffect, useState } from "react";

export function LanguageSwitch() {
  const [current, setCurrent] = useState<Locale>("rw");
  useEffect(() => setCurrent(getLocale()), []);

  return (
    <label className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground">
      <Languages className="size-3.5" />
      <select
        value={current}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="bg-transparent text-xs outline-none"
        aria-label="Ururimi / Language"
      >
        {LOCALES.map((locale) => (
          <option key={locale.code} value={locale.code} className="bg-background">
            {locale.label}
          </option>
        ))}
      </select>
    </label>
  );
}
