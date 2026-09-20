import { useEffect, useState } from "react";
import { X, Trophy, Crown, Medal } from "lucide-react";
import { fetchLeaderboard } from "@/lib/api";

export default function LeaderboardModal({ onClose }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    fetchLeaderboard(20).then(setRows);
  }, []);

  const rankColor = (i) => (i === 0 ? "#f59e0b" : i === 1 ? "#cbd5e1" : i === 2 ? "#d97706" : "#64748b");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md" data-testid="leaderboard-modal">
      <div className="w-full max-w-md max-h-[85vh] rounded-2xl border border-amber-500/30 bg-[#0f172a] flex flex-col rise-in overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-display font-black text-xl uppercase tracking-tight text-white">Hall of Legends</h2>
          </div>
          <button onClick={onClose} data-testid="leaderboard-close-btn" className="p-2 rounded-lg bg-slate-800 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {rows === null ? (
            <p className="text-center text-zinc-500 py-8 text-sm">Loading rankings...</p>
          ) : rows.length === 0 ? (
            <p className="text-center text-zinc-500 py-8 text-sm">No scores yet. Be the first legend to defend the Nexus!</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {rows.map((r, i) => (
                <div
                  key={r.id}
                  data-testid={`leaderboard-row-${i}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900/60 border border-white/5"
                >
                  <div className="w-7 flex justify-center shrink-0">
                    {i < 3 ? (
                      i === 0 ? <Crown className="w-5 h-5" style={{ color: rankColor(i) }} /> : <Medal className="w-5 h-5" style={{ color: rankColor(i) }} />
                    ) : (
                      <span className="font-mono font-bold text-sm" style={{ color: rankColor(i) }}>{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100 truncate flex items-center gap-1.5">
                      {r.name}
                      {r.victory && <span className="text-[9px] font-mono uppercase text-emerald-400 border border-emerald-500/40 rounded px-1">WIN</span>}
                    </p>
                    <p className="text-[11px] font-mono text-zinc-500">Wave {r.wave} · {r.gems} gems</p>
                  </div>
                  <span className="font-mono font-bold text-amber-400 shrink-0">{r.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
