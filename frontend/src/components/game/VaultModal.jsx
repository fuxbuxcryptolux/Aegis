import { useEffect, useRef, useState } from "react";
import { X, Gem, Sparkles, Activity, Store, Play, ArrowRight, Zap, ShieldCheck } from "lucide-react";
import LucideIcon from "./LucideIcon";
import { AFFILIATE_OFFERS } from "@/game/config";

function StatusPill({ status }) {
  const map = {
    live: { c: "#10b981", t: "SDK: Tracking Active Session" },
    mock: { c: "#f59e0b", t: "SDK: Fallback Mock Mode" },
    connecting: { c: "#06b6d4", t: "SDK: Connecting..." },
  };
  const s = map[status] || map.connecting;
  return (
    <div
      data-testid="spawntap-status-pill"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border"
      style={{ borderColor: `${s.c}55`, background: `${s.c}12` }}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: s.c }} />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: s.c }} />
      </span>
      <span className="text-xs font-mono uppercase tracking-wider" style={{ color: s.c }}>
        SpawnTap {s.t}
      </span>
    </div>
  );
}

export default function VaultModal({ status, playtimeSeconds, onClose, onClaimOffer, onPremiumPurchase, onOpenGemStore, onPrestige, prestige, state }) {
  const [tab, setTab] = useState("offers");
  const iframeRef = useRef(null);
  const mins = Math.floor(playtimeSeconds / 60);
  const secs = playtimeSeconds % 60;
  const nextBonusIn = 300 - (playtimeSeconds % 300);

  useEffect(() => {
    // Attempt to mount SpawnTap offerwall into container; fallback rendered in JSX below.
    if (tab === "spawntap" && iframeRef.current && window.SpawnTapBridge) {
      window.SpawnTapBridge.openOfferwall("offerwall-container-div");
    }
  }, [tab]);

  const tabs = [
    { id: "offers", label: "Affiliate Vault", icon: Store },
    { id: "spawntap", label: "SpawnTap SDK", icon: Activity },
    { id: "prestige", label: "Prestige Forge", icon: Sparkles },
  ];

  const premiumBundle = [
    { label: 'Frost Nova Grand Mage branch', reward: '1,000 Gems', color: '#38bdf8' },
    { label: 'Siege Catapult artillery', reward: '2,500 Gems', color: '#f59e0b' },
    { label: 'Royal Keep skin', reward: '5,000 Gems', color: '#a855f7' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md" data-testid="offerwall-vault-modal">
      <div className="w-full max-w-3xl max-h-[90vh] rounded-2xl border border-amber-500/30 bg-[#0f172a] flex flex-col rise-in overflow-hidden" style={{ boxShadow: "0 0 60px rgba(0,0,0,0.6)" }}>
        {/* header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Gem className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-black text-lg sm:text-2xl uppercase tracking-tight text-white leading-none truncate">Free Gem & Tower Vault</h2>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Sponsored Airdrop</p>
            </div>
          </div>
          <button onClick={onClose} data-testid="vault-close-btn" className="p-2 rounded-lg bg-slate-800 text-zinc-400 hover:text-white transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* tabs */}
        <div className="flex gap-1 px-3 sm:px-4 pt-3 shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              data-testid={`vault-tab-${t.id}`}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs sm:text-sm font-semibold transition-colors ${
                tab === t.id ? "bg-slate-800 text-cyan-300 border-b-2 border-cyan-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <t.icon className="w-4 h-4" /> <span className="hidden xs:inline sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-5">
          {tab === "offers" && (
            <div>
              <p className="text-sm text-zinc-400 mb-4">Complete a sponsored offer to instantly claim free Gems and unlock legendary towers.</p>
              <button onClick={onOpenGemStore} data-testid="open-gem-store-btn" className="mb-4 w-full flex items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-cyan-200 hover:bg-cyan-400/20">
                <Gem className="w-4 h-4" /> Spend Gems on Permanent Upgrades
              </button>
              <div className="mb-5 rounded-xl border border-cyan-500/30 bg-slate-900/70 p-3">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300">Premium asset alignment</p>
                    <p className="text-sm text-zinc-200">Stripe checkout-ready bundle mapping</p>
                  </div>
                  <button onClick={onPremiumPurchase} className="px-3 py-1.5 rounded-lg bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wide">Stripe Checkout</button>
                </div>
                <div className="space-y-2">
                  {premiumBundle.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2">
                      <span className="text-sm text-zinc-200">{item.label}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: item.color }}>{item.reward}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="offerwall-grid">
                {AFFILIATE_OFFERS.map((o) => (
                  <div
                    key={o.id}
                    data-testid={`offer-${o.id}`}
                    className="rounded-xl border border-white/8 bg-slate-900/70 p-3 flex flex-col"
                    style={{ boxShadow: `inset 0 0 0 1px ${o.color}22` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${o.color}1a`, border: `1px solid ${o.color}55` }}>
                        <LucideIcon name={o.icon} className="w-4 h-4" style={{ color: o.color }} />
                      </div>
                      <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/10 text-zinc-500">{o.tag}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-100 leading-tight">{o.title}</p>
                    <p className="text-xs font-bold mt-1 flex items-center gap-1" style={{ color: o.color }}>
                      <Gem className="w-3 h-3" /> {o.reward}
                    </p>
                    <button
                      onClick={() => onClaimOffer(o)}
                      data-testid={`offer-cta-${o.id}`}
                      className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-slate-950 transition-opacity hover:opacity-90"
                      style={{ background: o.color }}
                    >
                      {o.cta} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "spawntap" && (
            <div>
              <div className="flex flex-col items-center gap-3 mb-5">
                <StatusPill status={status} />
                <div className="text-center">
                  <p className="font-mono text-4xl font-bold text-cyan-300 text-glow-cyan">
                    {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                  </p>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono mt-1">Active Playtime</p>
                </div>
                <div className="w-full max-w-sm">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1">
                    <span>Next +100 Gem bonus</span>
                    <span>{nextBonusIn}s</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-white/10">
                    <div className="h-full bg-cyan-400 transition-all" style={{ width: `${((300 - nextBonusIn) / 300) * 100}%` }} />
                  </div>
                </div>
              </div>
              {/* Offerwall iframe container (SDK mounts here; fallback shown if blocked) */}
              <div
                id="offerwall-container-div"
                ref={iframeRef}
                data-testid="spawntap-offerwall-container"
                className="rounded-xl border border-white/10 bg-slate-950 p-6 text-center"
              >
                <ShieldCheck className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-100 mb-1">SpawnTap Playtime SDK Bridge Active</p>
                <p className="text-sm text-zinc-500">
                  Playtime milestones auto-reward Gems every 5 minutes. Offerwall inventory renders here when the SDK connects. Fallback mock mode keeps rewards flowing offline.
                </p>
                <div className="flex items-center justify-center gap-2 mt-3 text-[11px] font-mono text-zinc-600">
                  <Zap className="w-3 h-3" /> Milestone events dispatched to game state bus
                </div>
              </div>
            </div>
          )}

          {tab === "prestige" && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center mb-3">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-purple-300">Soul Gem Prestige Forge</h3>
              <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto">
                Sacrifice this run to bank <span className="text-purple-300 font-bold">Soul Gems</span>. Each prestige grants +100 starting gold permanently across all future runs.
              </p>
              <div className="flex justify-center gap-4 mt-5">
                <div className="px-4 py-3 rounded-xl bg-slate-900/60 border border-purple-500/20">
                  <p className="text-[10px] font-mono uppercase text-zinc-500">Banked Souls</p>
                  <p className="font-mono font-bold text-xl text-purple-300">{state.soulGems}</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-slate-900/60 border border-purple-500/20">
                  <p className="text-[10px] font-mono uppercase text-zinc-500">Prestige Lv</p>
                  <p className="font-mono font-bold text-xl text-purple-300">{state.prestigeLevel}</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-slate-900/60 border border-amber-500/20">
                  <p className="text-[10px] font-mono uppercase text-zinc-500">Est. Reward</p>
                  <p className="font-mono font-bold text-xl text-amber-300">+{Math.max(1, state.wave) + Math.floor(state.gems / 100)}</p>
                </div>
              </div>
              <button
                onClick={onPrestige}
                data-testid="prestige-btn"
                className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500 text-white font-bold transition-all"
                style={{ boxShadow: "0 0 24px rgba(168,85,247,0.4)" }}
              >
                Prestige & Restart Run
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
