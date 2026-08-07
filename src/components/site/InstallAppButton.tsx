import { useEffect, useState } from "react";
import { Download, MonitorDown, Smartphone } from "lucide-react";
import { toast } from "sonner";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setInstalled(standalone);
    const capture = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const complete = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setPrompt(null);
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
      className="inline-flex items-center gap-2 rounded-md border border-primary/50 px-3 py-2 font-mono text-xs text-primary-glow transition hover:bg-primary/10"
    >
      <Download className="size-4 md:hidden" />
      <Smartphone className="hidden size-4 sm:block md:hidden" />
      <MonitorDown className="hidden size-4 md:block" />
      Shyira kuri telefoni cyangwa PC
    </button>
  );
}