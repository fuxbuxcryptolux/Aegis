import { Trophy, Coins, Gem, Play, ArrowRight } from "lucide-react";

export default function VictoryModal({ state, onClaim, onClaimDouble, claimedDouble }) {
  const loot = state.lastWaveLoot || { gold: 0, gems: 0 };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md" data-testid="victory-double-modal">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#131b2e] p-6 sm:p-8 text-center rise-in" style={{ boxShadow: "0 0 60px rgba(245,158,11,0.25)" }}>
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="font-display font-black text-3xl uppercase tracking-tight text-amber-400 text-glow-amber">Sector Defended!</h2>
        <p className="text-sm text-zinc-400 mt-2">You survived all {state.maxWave} waves. The Nexus stands.</p>

        <div className="flex justify-center gap-4 mt-5">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 border border-amber-500/20">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="font-mono font-bold text-amber-400">{state.gold}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 border border-cyan-500/20">
            <Gem className="w-5 h-5 text-cyan-400" />
            <span className="font-mono font-bold text-cyan-400">{state.gems}</span>
          </div>
        </div>

        {!claimedDouble && (
          <button
            onClick={onClaimDouble}
            data-testid="victory-claim-2x-ad-btn"
            className="w-full mt-6 flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-base transition-all neon-amber"
          >
            Claim 2X Gold & Gems
            <span className="flex items-center gap-1 text-xs bg-slate-950/25 px-2 py-0.5 rounded-full">
              <Play className="w-3 h-3" /> Watch Ad
            </span>
          </button>
        )}
        <p className="text-[11px] text-zinc-500 mt-2">Doubles last wave loot: +{loot.gold} gold, +{loot.gems} gems</p>

        <button
          onClick={onClaim}
          data-testid="victory-claim-btn"
          className="w-full mt-4 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800/80 border border-white/10 hover:border-cyan-500/50 text-zinc-300 hover:text-cyan-300 font-semibold transition-all"
        >
          Continue — New Game+ <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
