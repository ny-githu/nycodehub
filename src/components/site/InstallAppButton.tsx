import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * The browser fires beforeinstallprompt very early, so we capture it at module
 * load. Without this the event is lost and the install button can't install.
 */
let captured: InstallPrompt | null = null;
const listeners = new Set<(prompt: InstallPrompt | null) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    captured = event as InstallPrompt;
    listeners.forEach((listener) => listener(captured));
  });
}

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setPrompt(captured);
    const listener = (next: InstallPrompt | null) => setPrompt(next);
    listeners.add(listener);
    const complete = () => setInstalled(true);
    window.addEventListener("appinstalled", complete);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (prompt) {
      setBusy(true);
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") {
          captured = null;
          setPrompt(null);
          toast.success("NYCODEHUB irimo kwishyirwa kuri device yawe…");
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    toast.info(
      ios
        ? "Kanda Share muri Safari, uhitemo ‘Add to Home Screen’."
        : "Muri browser menu hitamo ‘Install NYCODEHUB’ cyangwa ‘Add to Home screen’.",
      { duration: 7000 },
    );
  }

  return (
    <button
      type="button"
      onClick={() => void install()}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-md border border-primary/50 px-3 py-2 font-mono text-xs text-primary-glow transition hover:bg-primary/10 disabled:opacity-60"
    >
      <Download className="size-4" />
      {t.install_app}
    </button>
  );
}
