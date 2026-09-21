import { Heart, Coins, Gem, Sparkles, Gauge, Pause, Play, Volume2, VolumeX, Store, Trophy, Zap, Target } from "lucide-react";

function Stat({ icon: Icon, value, color, testId, glow }) {
  return (
    <div
      data-testid={testId}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-white/5"
    >
      <Icon className="w-4 h-4" style={{ color }} />
      <span className={`font-mono font-bold text-sm sm:text-base ${glow}`} style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export default function HUD({
  state,
  daily,
  dailyProgress,
  onClaimDailyQuest,
  onClaimDailyChallenge,
  onSpeed,
  onPause,
  onToggleSound,
  soundOn,
  onVault,
  onLeaderboard,
  onDaily,
  impactCountdown,
}) {
  const hpPct = Math.max(0, (state.nexusHP / state.maxNexusHP) * 100);
  const hpColor = hpPct > 50 ? "#10b981" : hpPct > 25 ? "#f59e0b" : "#ef4444";
  const bossSoon = state.nextBoss === 1 && state.wave < state.maxWave;
  const questRows = daily?.quests?.map((quest) => {
    const entry = dailyProgress?.quests?.[quest.id] || { progress: 0, claimed: false };
    const pct = Math.min(100, (entry.progress / quest.target) * 100);
    return { ...quest, progress: entry.progress || 0, pct, claimed: entry.claimed || false };
  }) || [];
  const challengeReady = (Math.min(3, Math.max(0, state.wave || 0)) >= 3) && !dailyProgress?.challengeClaimed;
  const hours = String(Math.floor((impactCountdown?.totalSeconds || 0) / 3600)).padStart(2, '0');
  const minutes = String(Math.floor(((impactCountdown?.totalSeconds || 0) % 3600) / 60)).padStart(2, '0');
  const seconds = String((impactCountdown?.totalSeconds || 0) % 60).padStart(2, '0');

  return (
    <header className="h-auto min-h-16 px-2 sm:px-4 py-2 bg-[#0f172a]/90 backdrop-blur-xl border-b border-cyan-500/20 flex items-center justify-between gap-2 z-30 shadow-[0_4px_24px_rgba(0,0,0,0.6)] shrink-0 flex-wrap">
      <div className="w-full flex items-center justify-center gap-2 py-1.5 px-3 mb-1 border border-cyan-500/30 bg-slate-950/80 rounded-lg shadow-[0_0_18px_rgba(34,211,238,0.18)]">
        <span className="text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-[0.25em] text-cyan-300">Horde Impact</span>
        <span className="font-mono text-xs sm:text-sm font-bold text-cyan-200">{hours}:{minutes}:{seconds}</span>
      </div>
      {/* Left: Keep health */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 shrink-0" style={{ color: hpColor }} fill={hpColor} />
          <div className="flex flex-col gap-0.5" data-testid="nexus-base-hp-bar">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Keep Health</span>
              <span className="text-[11px] font-mono font-bold" style={{ color: hpColor }}>
                {state.nexusHP}/{state.maxNexusHP}
              </span>
            </div>
            <div className="w-28 sm:w-40 h-2.5 rounded-full bg-slate-950 overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${hpPct}%`, background: hpColor, boxShadow: `0 0 10px ${hpColor}` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Center: currencies + wave */}
      <div className="flex items-center gap-1.5 sm:gap-2 order-3 sm:order-2 w-full sm:w-auto justify-center flex-wrap">
        <Stat icon={Coins} value={state.gold} color="#f59e0b" testId="hud-gold-counter" glow="text-glow-amber" />
        <Stat icon={Gem} value={state.gems} color="#06b6d4" testId="hud-gems-counter" glow="text-glow-cyan" />
        <Stat icon={Sparkles} value={state.soulGems} color="#a855f7" testId="hud-soulgems-counter" glow="" />
        <div
          data-testid="hud-wave-indicator"
          className={`flex flex-col px-3 py-1 rounded-lg border ${
            bossSoon || state.isBoss ? "border-red-500/50 bg-red-500/10 pulse-danger" : "border-cyan-500/30 bg-slate-900/60"
          }`}
        >
          <span className="block font-display font-black text-sm sm:text-base leading-tight tracking-tight">
            WAVE {state.wave}/{state.maxWave}
          </span>
          <span className={`block text-[9px] font-mono uppercase tracking-wider leading-tight ${bossSoon || state.isBoss ? "text-red-400" : "text-zinc-500"}`}>
            {state.isBoss ? "BOSS ON FIELD" : bossSoon ? "Raiders approaching!" : state.waveStatus === "active" ? `${state.enemiesRemaining} raiders` : "Standing by"}
          </span>
        </div>
        {daily && (
          <div className="flex flex-col gap-1 px-2 py-1 rounded-lg border border-amber-500/30 bg-slate-900/60 min-w-[220px]">
            <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-amber-300">Daily</span>
            <span className="text-[10px] font-bold text-white">{daily.challenge.name}</span>
            {challengeReady && (
              <button
                onClick={onClaimDailyChallenge}
                className="w-full px-2 py-1 rounded-md bg-amber-500/20 border border-amber-400/40 text-[9px] font-bold uppercase tracking-wide text-amber-200"
              >
                Claim challenge +150 gold +60 gems
              </button>
            )}
            <div className="flex flex-col gap-1">
              {questRows.slice(0, 2).map((quest) => (
                <div key={quest.id} className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[8px] text-zinc-300 gap-2">
                    <span>{quest.title}</span>
                    <span>{Math.min(quest.progress, quest.target)}/{quest.target}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-400" style={{ width: `${quest.pct}%` }} />
                  </div>
                  {quest.progress >= quest.target && !quest.claimed && (
                    <button
                      onClick={() => onClaimDailyQuest?.(quest.id)}
                      className="text-[8px] uppercase tracking-widest text-cyan-300 hover:text-cyan-200 text-left"
                    >
                      Claim reward
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1.5 order-2 sm:order-3">
        <div className="flex items-center rounded-lg overflow-hidden border border-white/10" data-testid="hud-speed-toggle">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => onSpeed(s)}
              data-testid={`hud-speed-${s}x`}
              className={`px-2 py-1.5 text-xs font-mono font-bold transition-colors ${
                state.gameSpeed === s ? "bg-cyan-500 text-slate-950" : "bg-slate-900/60 text-zinc-400 hover:text-cyan-300"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
        <button
          onClick={onPause}
          data-testid="hud-pause-btn"
          className="p-2 rounded-lg bg-slate-900/60 border border-white/10 text-zinc-300 hover:text-cyan-300 transition-colors"
        >
          {state.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
        <button
          onClick={onToggleSound}
          data-testid="hud-sound-toggle"
          className="p-2 rounded-lg bg-slate-900/60 border border-white/10 text-zinc-300 hover:text-cyan-300 transition-colors"
        >
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <button
          onClick={onLeaderboard}
          data-testid="hud-leaderboard-btn"
          className="p-2 rounded-lg bg-slate-900/60 border border-white/10 text-zinc-300 hover:text-amber-300 transition-colors"
        >
          <Trophy className="w-4 h-4" />
        </button>
        <button
          onClick={onDaily}
          data-testid="hud-daily-btn"
          className="p-2 rounded-lg bg-slate-900/60 border border-white/10 text-zinc-300 hover:text-amber-300 transition-colors"
        >
          <Target className="w-4 h-4" />
        </button>
        <button
          onClick={onVault}
          data-testid="hud-vault-open-btn"
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs hover:from-amber-400 hover:to-amber-500 transition-colors neon-amber"
        >
          <Store className="w-4 h-4" /> <span className="hidden sm:inline">VAULT</span>
        </button>
      </div>
    </header>
  );
}
