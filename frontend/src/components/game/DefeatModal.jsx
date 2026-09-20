import { Skull, Heart, Play, Sparkles } from "lucide-react";

export default function DefeatModal({ state, onRevive, onForfeit, canRevive, soulGemsEarned }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md" data-testid="defeat-revive-modal">
      <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#131b2e] p-6 sm:p-8 text-center rise-in" style={{ boxShadow: "0 0 60px rgba(239,68,68,0.25)" }}>
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center mb-4 pulse-danger">
          <Skull className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="font-display font-black text-3xl uppercase tracking-tight text-red-400">Nexus Compromised</h2>
        <p className="text-sm text-zinc-400 mt-2">
          Your base fell on <span className="text-white font-bold">Wave {state.wave}</span>. Deploy a Second Chance to keep the run alive.
        </p>

        {canRevive && (
          <button
            onClick={onRevive}
            data-testid="defeat-revive-ad-btn"
            className="w-full mt-6 flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-base transition-all"
            style={{ boxShadow: "0 0 24px rgba(16,185,129,0.4)" }}
          >
            <Heart className="w-5 h-5" fill="currentColor" />
            Second Chance Revive
            <span className="flex items-center gap-1 text-xs bg-slate-950/25 px-2 py-0.5 rounded-full">
              <Play className="w-3 h-3" /> Watch Ad
            </span>
          </button>
        )}
        <p className="text-[11px] text-zinc-500 mt-2">Restores 50% Base HP + Nukes the screen{!canRevive && " (already used this run)"}</p>

        <button
          onClick={onForfeit}
          data-testid="defeat-forfeit-btn"
          className="w-full mt-4 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800/80 border border-white/10 hover:border-purple-500/50 text-zinc-300 hover:text-purple-300 font-semibold transition-all"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          End Run — Claim {soulGemsEarned} Soul Gems
        </button>
      </div>
    </div>
  );
}
