import { X, Gem, Swords, Shield, HeartPulse, LayoutGrid, Sparkles } from "lucide-react";
import { GEM_UPGRADES, gemUpgradeCost } from "@/game/config";

const ICONS = { Swords, Shield, HeartPulse, LayoutGrid, Sparkles };

export default function GemStoreModal({ gems, upgrades, onBuy, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md" data-testid="gem-store-modal">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-cyan-500/30 bg-[#0f172a] flex flex-col rise-in overflow-hidden" style={{ boxShadow: "0 0 60px rgba(6,182,212,0.18)" }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display font-black text-xl sm:text-2xl uppercase tracking-tight text-white">Gem Store</h2>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Permanent upgrades survive prestige</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-mono font-bold text-cyan-300"><Gem className="w-4 h-4" /> {gems}</span>
            <button onClick={onClose} data-testid="gem-store-close-btn" className="p-2 rounded-lg bg-slate-800 text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6 space-y-3">
          {GEM_UPGRADES.map((upgrade) => {
            const Icon = ICONS[upgrade.icon];
            const level = upgrades[upgrade.id] || 0;
            const maxed = level >= upgrade.maxLevel;
            const cost = gemUpgradeCost(upgrade, level);
            const affordable = gems >= cost;
            return (
              <div key={upgrade.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-3 sm:p-4" data-testid={`gem-upgrade-${upgrade.id}`}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${upgrade.color}20`, border: `1px solid ${upgrade.color}66` }}>
                  <Icon className="w-5 h-5" style={{ color: upgrade.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm text-slate-100">{upgrade.name}</h3>
                    <span className="text-[10px] font-mono text-zinc-400">Lv {level}/{upgrade.maxLevel}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{upgrade.description}</p>
                  <div className="h-1.5 rounded-full bg-slate-950 mt-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(level / upgrade.maxLevel) * 100}%`, background: upgrade.color }} /></div>
                </div>
                <button
                  onClick={() => onBuy(upgrade)}
                  disabled={maxed || !affordable}
                  className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-cyan-400 text-slate-950 text-xs font-black disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  {maxed ? "MAX" : <><Gem className="w-3.5 h-3.5" /> {cost}</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
