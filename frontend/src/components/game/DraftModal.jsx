import { RefreshCw, Play, Sparkles } from "lucide-react";
import LucideIcon from "./LucideIcon";

const RARITY_COLOR = {
  Common: "#94a3b8",
  Uncommon: "#38bdf8",
  Rare: "#a855f7",
};

export default function DraftModal({ cards, onPick, onReroll, rerollsUsed }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" data-testid="draft-modal">
      <div className="w-full max-w-4xl rise-in">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-3">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-cyan-400">Wave Cleared</span>
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-white text-glow-cyan">
            Select Tactical Protocol
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Draft one permanent upgrade for this run</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((c, idx) => {
            const rc = RARITY_COLOR[c.rarity] || "#94a3b8";
            return (
              <button
                key={c.id}
                onClick={() => onPick(c)}
                data-testid={`draft-card-${idx}`}
                className="group relative rounded-2xl border p-5 flex flex-col items-center text-center transition-all hover:-translate-y-1.5 rise-in"
                style={{ background: "rgba(19,27,46,0.95)", borderColor: `${c.color}55`, boxShadow: `0 8px 40px rgba(0,0,0,0.5)`, animationDelay: `${idx * 80}ms` }}
              >
                <span
                  className="absolute top-3 right-3 text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border"
                  style={{ color: rc, borderColor: `${rc}55` }}
                >
                  {c.rarity}
                </span>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mt-2 transition-transform group-hover:scale-110"
                  style={{ background: `${c.color}1a`, border: `1px solid ${c.color}` }}
                >
                  <LucideIcon name={c.icon} className="w-8 h-8" style={{ color: c.color }} />
                </div>
                <h3 className="font-display font-bold text-xl uppercase tracking-tight text-white mb-1">{c.title}</h3>
                <p className="text-sm text-zinc-400 leading-snug">{c.desc}</p>
                <span
                  className="mt-4 text-[11px] font-mono uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: c.color }}
                >
                  ▸ Draft This
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={onReroll}
            data-testid="draft-reroll-ad-btn"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold transition-all neon-amber"
          >
            <RefreshCw className="w-4 h-4" />
            Reroll Protocol
            <span className="flex items-center gap-1 text-xs bg-slate-950/30 px-2 py-0.5 rounded-full">
              <Play className="w-3 h-3" /> Watch Ad
            </span>
          </button>
        </div>
        {rerollsUsed > 0 && (
          <p className="text-center text-[11px] text-zinc-500 mt-2 font-mono">Rerolls this wave: {rerollsUsed}</p>
        )}
      </div>
    </div>
  );
}
