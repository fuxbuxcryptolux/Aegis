import { Crosshair, Snowflake, Flame, Zap, Bomb, HeartPulse, Coins, ArrowUpCircle, Trash2, Swords, Play, X } from "lucide-react";
import { TOWERS, TOWER_ORDER, HERO_ABILITIES, HERO_ORDER } from "@/game/config";

const TOWER_ICONS = { archer: Crosshair, frost: Snowflake, inferno: Flame, tesla: Zap };
const HERO_ICONS = { nuke: Bomb, freeze: Snowflake, heal: HeartPulse };

function TowerCard({ id, selected, affordable, onSelect }) {
  const def = TOWERS[id];
  const Icon = TOWER_ICONS[id];
  return (
    <button
      onClick={() => onSelect(id)}
      data-testid={`tower-card-${id}`}
      className={`relative shrink-0 w-[76px] sm:w-24 h-full rounded-xl border p-1.5 flex flex-col items-center justify-between transition-all ${
        selected ? "scale-[1.03]" : "hover:-translate-y-0.5"
      } ${affordable ? "opacity-100" : "opacity-50"}`}
      style={{
        background: selected ? `${def.color}22` : "rgba(15,23,42,0.7)",
        borderColor: selected ? def.color : "rgba(255,255,255,0.08)",
        boxShadow: selected ? `0 0 18px ${def.color}55` : "none",
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
        style={{ background: `${def.color}22`, border: `1px solid ${def.color}55` }}
      >
        <Icon className="w-4 h-4" style={{ color: def.color }} />
      </div>
      <span className="font-condensed font-bold text-[10px] sm:text-xs uppercase leading-tight text-center text-slate-200">
        {def.name}
      </span>
      <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400">
        <Coins className="w-3 h-3" /> {def.cost}
      </span>
    </button>
  );
}

function HeroButton({ id, cooldown, onCast }) {
  const ab = HERO_ABILITIES[id];
  const Icon = HERO_ICONS[id];
  const ready = cooldown <= 0;
  const pct = ready ? 0 : (cooldown / ab.cooldown) * 100;
  return (
    <button
      onClick={() => onCast(id)}
      disabled={!ready}
      data-testid={`hero-skill-${id}`}
      title={`${ab.name} — ${ab.desc}`}
      className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border flex flex-col items-center justify-center overflow-hidden transition-all disabled:cursor-not-allowed"
      style={{
        background: "rgba(15,23,42,0.8)",
        borderColor: ready ? ab.color : "rgba(255,255,255,0.1)",
        boxShadow: ready ? `0 0 14px ${ab.color}55` : "none",
      }}
    >
      <Icon className="w-5 h-5 z-10" style={{ color: ready ? ab.color : "#64748b" }} />
      {!ready && (
        <>
          <div className="absolute inset-0 bg-slate-950/70" style={{ clipPath: `inset(0 0 ${100 - pct}% 0)` }} />
          <span className="absolute bottom-1 text-[9px] font-mono font-bold text-white z-10">{Math.ceil(cooldown)}s</span>
        </>
      )}
    </button>
  );
}

export default function TowerDrawer({ state, onSelectTower, onCastAbility, onStartWave, onUpgrade, onSell, onDeselect }) {
  const placed = state.selectedPlaced;
  const canStart = state.waveStatus === "idle" || state.waveStatus === "cleared";

  return (
    <footer className="min-h-24 sm:h-32 bg-[#0f172a]/95 backdrop-blur-2xl border-t border-cyan-500/20 px-2 sm:px-4 py-2 z-30 shadow-[0_-8px_32px_rgba(0,0,0,0.7)] shrink-0 flex items-stretch justify-between gap-2 sm:gap-3">
      {/* Towers */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin flex-1 min-w-0" data-testid="tower-drawer">
        {placed ? (
          <div className="flex items-center gap-2 w-full rise-in" data-testid="tower-upgrade-panel">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${TOWERS[placed.id].color}22`, border: `1px solid ${TOWERS[placed.id].color}` }}
            >
              {(() => {
                const Icon = TOWER_ICONS[placed.id];
                return <Icon className="w-5 h-5" style={{ color: TOWERS[placed.id].color }} />;
              })()}
            </div>
            <div className="min-w-0">
              <p className="font-condensed font-bold uppercase text-sm text-slate-100 leading-tight">
                {TOWERS[placed.id].name} <span className="text-cyan-400">Lv.{placed.level}</span>
              </p>
              <p className="text-[10px] text-zinc-400 truncate max-w-[160px]">{TOWERS[placed.id].desc}</p>
            </div>
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              <button
                onClick={onUpgrade}
                data-testid="tower-upgrade-btn"
                disabled={state.gold < placed.upgradeCost}
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 font-bold text-xs disabled:opacity-40 transition-colors"
              >
                <ArrowUpCircle className="w-4 h-4" /> {placed.upgradeCost}
              </button>
              <button
                onClick={onSell}
                data-testid="tower-sell-btn"
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-300 font-bold text-xs transition-colors"
              >
                <Trash2 className="w-4 h-4" /> {placed.sellRefund}
              </button>
              <button onClick={onDeselect} className="p-2 rounded-lg bg-slate-800 text-zinc-400 hover:text-white transition-colors" data-testid="tower-deselect-btn">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          TOWER_ORDER.map((id) => (
            <TowerCard key={id} id={id} selected={state.selectedTower === id} affordable={state.gold >= TOWERS[id].cost} onSelect={onSelectTower} />
          ))
        )}
      </div>

      {/* Hero abilities + start wave */}
      <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-white/10 shrink-0">
        <div className="hidden sm:flex flex-col items-center">
          <Swords className="w-4 h-4 text-amber-400 mb-0.5" />
          <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">Hero</span>
        </div>
        <div className="flex items-center gap-1.5" data-testid="hero-dock">
          {HERO_ORDER.map((id) => (
            <HeroButton key={id} id={id} cooldown={state.heroCooldowns[id]} onCast={onCastAbility} />
          ))}
        </div>
        {canStart && (
          <button
            onClick={onStartWave}
            data-testid="start-wave-btn"
            className="flex flex-col items-center justify-center gap-0.5 px-3 sm:px-5 h-14 sm:h-16 rounded-xl bg-gradient-to-b from-cyan-400 to-cyan-600 text-slate-950 font-display font-black uppercase tracking-tight hover:from-cyan-300 hover:to-cyan-500 transition-all neon-cyan animate-pulse"
          >
            <Play className="w-5 h-5" fill="currentColor" />
            <span className="text-[10px] sm:text-xs">{state.wave === 0 ? "Deploy" : "Next Wave"}</span>
          </button>
        )}
      </div>
    </footer>
  );
}
