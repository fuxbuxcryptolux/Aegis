import { useEffect, useState } from "react";
import { X, Play, Gift } from "lucide-react";

const LABELS = {
  REVIVE_BASE: "Restoring your Keep...",
  REROLL_CARDS: "Rerolling blessings...",
  DOUBLE_LOOT: "Doubling your loot...",
  VICTORY_2X: "Doubling your loot...",
  OFFER: "Loading sponsored offer...",
};

/**
 * Mock rewarded-video interstitial with real countdown + skip.
 * Resolves reward on completion; skipping cancels the reward (like a real SDK onClose).
 */
export default function AdInterstitial({ rewardType, duration = 5, onComplete, onSkip }) {
  const [left, setLeft] = useState(duration);

  useEffect(() => {
    setLeft(duration);
    const id = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(id);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rewardType, duration]);

  const canSkip = left <= 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" data-testid="ad-interstitial">
      <div className="w-full max-w-lg rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-900 rise-in">
        {/* fake video area */}
        <div className="relative aspect-video bg-gradient-to-br from-slate-800 via-slate-900 to-black flex items-center justify-center scanlines">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center mb-3">
              <Play className="w-7 h-7 text-cyan-400" fill="currentColor" />
            </div>
            <p className="font-display font-bold text-lg text-white uppercase tracking-tight">Rewarded Ad</p>
            <p className="text-xs text-zinc-400 mt-1">{LABELS[rewardType] || "Loading reward..."}</p>
          </div>
          <span className="absolute top-3 left-3 text-[10px] font-mono uppercase tracking-widest text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">
            Ad
          </span>
          {/* countdown / skip */}
          {canSkip ? (
            <button
              onClick={onSkip}
              data-testid="ad-interstitial-skip-btn"
              className="absolute top-3 right-3 flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-slate-950/70 rounded-full px-2.5 py-1 transition-colors"
            >
              Skip <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span
              data-testid="ad-interstitial-timer"
              className="absolute top-3 right-3 text-xs font-mono text-zinc-300 bg-slate-950/70 rounded-full w-7 h-7 flex items-center justify-center"
            >
              {left}
            </span>
          )}
        </div>
        {/* reward claim */}
        <div className="p-4 flex items-center justify-between gap-3 bg-slate-900">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Gift className="w-4 h-4 text-amber-400" />
            {canSkip ? "Reward unlocked!" : "Reward unlocks after the ad"}
          </div>
          <button
            onClick={onComplete}
            disabled={!canSkip}
            data-testid="ad-interstitial-claim-btn"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:from-emerald-400 hover:to-emerald-500 transition-colors"
          >
            Claim Reward
          </button>
        </div>
      </div>
    </div>
  );
}
