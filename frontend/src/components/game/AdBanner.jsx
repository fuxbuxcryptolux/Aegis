import { useEffect, useState } from "react";
import { Megaphone, ExternalLink } from "lucide-react";

const TOP_ADS = [
  { label: "SPONSORED", text: "⚔️ Raid Shadow Legends — Download & get 50k Silver", cta: "Install" },
  { label: "AD", text: "💎 Coin Master — Free Spins Daily. Play Now!", cta: "Play" },
  { label: "PARTNER", text: "🎮 GameFuel Energy — 20% off with code AEGIS", cta: "Shop" },
];
const BOTTOM_ADS = [
  { label: "AD", text: "🚀 Best VPN 2026 — 3 months free, protect your play", cta: "Get" },
  { label: "SPONSORED", text: "🏆 Join the Aegis Discord Tournament — $500 pool", cta: "Join" },
  { label: "AD", text: "📱 Merge Kingdoms — the #1 idle builder this week", cta: "Open" },
];

/**
 * Responsive sticky ad banner slot with graceful placeholder fallback.
 * Real AdSense/AdMob <ins> tags can be dropped in; this renders a house ad if none load.
 */
export function AdBanner({ position = "top", onImpression }) {
  const ads = position === "top" ? TOP_ADS : BOTTOM_ADS;
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % ads.length), 6000);
    return () => clearInterval(id);
  }, [ads.length]);

  useEffect(() => {
    onImpression?.(position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const ad = ads[i];
  const testId = position === "top" ? "ad-banner-top" : "ad-banner-bottom";
  const border = position === "top" ? "border-b" : "border-t";

  return (
    <div
      id={position === "top" ? "ad-banner-top" : "ad-banner-bottom"}
      data-testid={testId}
      className={`h-9 sm:h-10 w-full bg-zinc-950/90 ${border} border-white/5 flex items-center justify-between px-3 sm:px-4 z-40 shrink-0 overflow-hidden`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 border border-zinc-700 rounded px-1 py-0.5 shrink-0">
          {ad.label}
        </span>
        <Megaphone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        <span className="text-[11px] sm:text-xs text-zinc-400 truncate">{ad.text}</span>
      </div>
      <button
        className="text-[10px] sm:text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 shrink-0 transition-colors"
        data-testid={`${testId}-cta`}
      >
        {ad.cta} <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}
