import { Shield, Play, Crosshair, Sparkles, Zap } from "lucide-react";

export default function StartScreen({ name, setName, onStart, hasSave, bestWave }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/92 backdrop-blur-md" data-testid="start-screen">
      <div className="w-full max-w-lg text-center rise-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/40 mb-5 neon-cyan">
          <Shield className="w-10 h-10 text-cyan-400" />
        </div>
        <h1 className="font-display font-black text-4xl sm:text-6xl uppercase tracking-tight text-white leading-none">
          Aegis <span className="text-cyan-400 text-glow-cyan">Rogue</span>
        </h1>
        <p className="font-condensed uppercase tracking-[0.3em] text-amber-400 text-sm sm:text-base mt-2">Tower Defense RPG</p>
        <p className="text-sm text-zinc-400 mt-4 max-w-md mx-auto">
          Defend the Nexus across 20 escalating waves. Build towers, command your hero, and draft roguelike perks between rounds.
        </p>

        <div className="flex justify-center gap-3 my-6 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1"><Crosshair className="w-3.5 h-3.5 text-cyan-400" /> 4 Towers</span>
          <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-purple-400" /> Hero Skills</span>
          <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> Perk Draft</span>
        </div>

        <div className="max-w-xs mx-auto">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="Enter commander name"
            data-testid="commander-name-input"
            className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-center text-slate-100 font-semibold placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
          />
          <button
            onClick={onStart}
            data-testid="start-game-btn"
            className="w-full mt-3 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-300 hover:to-cyan-500 text-slate-950 font-display font-black uppercase tracking-tight text-lg transition-all neon-cyan"
          >
            <Play className="w-5 h-5" fill="currentColor" /> {hasSave ? "Resume Defense" : "Enter Command"}
          </button>
          {bestWave > 0 && <p className="text-[11px] font-mono text-zinc-500 mt-3">Best wave reached: {bestWave}</p>}
        </div>
      </div>
    </div>
  );
}
