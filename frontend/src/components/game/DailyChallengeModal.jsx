import { Check, Gift, Sparkles, X } from "lucide-react";

export default function DailyChallengeModal({ daily, dailyProgress, onClose, onClaimQuest, onClaimChallenge }) {
  if (!daily) return null;

  const questRows = daily.quests.map((quest) => {
    const entry = dailyProgress?.quests?.[quest.id] || { progress: 0, claimed: false };
    const progress = Math.min(entry.progress || 0, quest.target);
    const pct = Math.min(100, (progress / quest.target) * 100);
    return { ...quest, progress, pct, claimed: !!entry.claimed };
  });

  const challengeReady = !dailyProgress?.challengeClaimed && (Math.min(3, Math.max(0, dailyProgress?.challengeProgress || 0)) >= 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" data-testid="daily-challenge-modal">
      <div className="w-full max-w-2xl rounded-3xl border border-amber-500/30 bg-[#121b2e] shadow-[0_0_40px_rgba(245,158,11,0.18)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-300">Daily challenge</p>
              <h2 className="font-display font-black text-2xl uppercase tracking-tight text-white">{daily.challenge.name}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-slate-800/80 text-zinc-300 hover:text-white transition-colors" aria-label="Close daily challenge">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-cyan-300">Current modifier</p>
            <p className="mt-2 text-sm text-zinc-200">{daily.challenge.desc}</p>
            {challengeReady ? (
              <button
                onClick={onClaimChallenge}
                className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs hover:from-amber-400 hover:to-amber-500"
              >
                <Gift className="w-4 h-4" /> Claim +150 gold +60 gems
              </button>
            ) : (
              <p className="mt-3 text-[11px] text-zinc-400">Clear 3 waves to claim the daily challenge reward.</p>
            )}
          </div>

          <div className="space-y-3">
            {questRows.map((quest) => {
              const ready = quest.progress >= quest.target && !quest.claimed;
              return (
                <div key={quest.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display font-bold text-lg uppercase tracking-tight text-white">{quest.title}</p>
                      <p className="text-xs text-zinc-400">{quest.desc}</p>
                    </div>
                    {quest.claimed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300">
                        <Check className="w-3 h-3" /> Claimed
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">{quest.progress}/{quest.target}</span>
                    )}
                  </div>

                  <div className="mt-3 h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all" style={{ width: `${quest.pct}%` }} />
                  </div>

                  {ready && (
                    <button
                      onClick={() => onClaimQuest(quest.id)}
                      className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 font-bold text-[10px] uppercase tracking-[0.22em]"
                    >
                      <Gift className="w-3.5 h-3.5" /> Claim {quest.reward.gems || 0} gems{quest.reward.gold ? ` / ${quest.reward.gold} gold` : ""}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
