import { useEffect, useRef, useState } from "react";
import { LogOut, Pause, Play, RotateCcw, Shield, Swords, Zap } from "lucide-react";
import { NEON_VARIANTS, SIDEVIEW_TOWER_SPOTS, SIDEVIEW_TOWER_TYPES, SIDEVIEW_WORLD, SQUAD_ROSTER } from "@/game/sideview/config";
import { advanceLaneEnemy, buildSideViewWave, deriveEnemyVariant } from "@/game/sideview/rules";
import { createSquadState, issueSquadCommand, tickSquad } from "@/game/sideview/squad";
import { drawNeonEnemy } from "@/game/sideview/enemySprites";

const INITIAL_GOLD = 300;

function createModel() {
  return {
    running: false, paused: false, wave: 0, waveActive: false, wavePlan: null, spawnIndex: 0, spawnTimer: 0,
    enemies: [], towers: [], gold: INITIAL_GOLD, baseHp: 100, maxBaseHp: 100, lastWave: "Deploy a wave to begin",
    squad: createSquadState(), tacticalTimer: 8, squadPulse: "Awaiting command", time: 0,
  };
}

function paintBackground(ctx, width, height, scale, offsetX, offsetY, model) {
  ctx.fillStyle = "#08111f"; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.translate(offsetX, offsetY); ctx.scale(scale, scale);
  ctx.fillStyle = "#0d1b2a"; ctx.fillRect(0, 0, SIDEVIEW_WORLD.width, SIDEVIEW_WORLD.height);
  ctx.strokeStyle = "rgba(72, 211, 255, 0.08)"; ctx.lineWidth = 1;
  for (let x = 0; x < SIDEVIEW_WORLD.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SIDEVIEW_WORLD.height); ctx.stroke(); }
  for (let y = 0; y < SIDEVIEW_WORLD.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SIDEVIEW_WORLD.width, y); ctx.stroke(); }
  ctx.fillStyle = "#143247"; ctx.fillRect(0, 86, SIDEVIEW_WORLD.width, 6); ctx.fillRect(0, 206, SIDEVIEW_WORLD.width, 6); ctx.fillRect(0, 326, SIDEVIEW_WORLD.width, 6);
  ctx.fillStyle = "#f43f5e"; ctx.shadowColor = "#f43f5e"; ctx.shadowBlur = 18; ctx.fillRect(SIDEVIEW_WORLD.baseX - 16, 70, 10, 350); ctx.shadowBlur = 0;
  ctx.fillStyle = "#fb7185"; ctx.font = "700 14px sans-serif"; ctx.fillText("KEEP", 18, 48);
  for (const laneY of SIDEVIEW_WORLD.laneYs) { ctx.fillStyle = "rgba(34, 211, 238, 0.12)"; ctx.fillRect(0, laneY - 28, SIDEVIEW_WORLD.width, 56); }
  for (const spot of SIDEVIEW_TOWER_SPOTS) {
    const tower = model.towers.find((entry) => entry.spotId === spot.id);
    ctx.strokeStyle = tower ? tower.color : "rgba(103, 232, 249, 0.45)"; ctx.lineWidth = tower ? 3 : 1;
    ctx.beginPath(); ctx.arc(spot.x, SIDEVIEW_WORLD.laneYs[spot.lane] - 44, 18, 0, Math.PI * 2); ctx.stroke();
    if (!tower) { ctx.fillStyle = "rgba(103, 232, 249, 0.08)"; ctx.fill(); }
  }
  for (const enemy of model.enemies) {
    drawNeonEnemy(ctx, enemy, enemy.x, SIDEVIEW_WORLD.laneYs[enemy.lane], enemy.boss ? 1.18 : 1);
    ctx.fillStyle = "#08111f"; ctx.fillRect(enemy.x - enemy.radius, SIDEVIEW_WORLD.laneYs[enemy.lane] - enemy.radius - 12, enemy.radius * 2, 4);
    ctx.fillStyle = enemy.color; ctx.fillRect(enemy.x - enemy.radius, SIDEVIEW_WORLD.laneYs[enemy.lane] - enemy.radius - 12, enemy.radius * 2 * Math.max(0, enemy.hp / enemy.maxHp), 4);
  }
  for (const tower of model.towers) {
    const y = SIDEVIEW_WORLD.laneYs[tower.lane] - 44;
    ctx.save(); ctx.translate(tower.x, y); ctx.shadowColor = tower.color; ctx.shadowBlur = 16; ctx.fillStyle = `${tower.color}44`; ctx.strokeStyle = tower.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-15, 14); ctx.lineTo(0, -17); ctx.lineTo(15, 14); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  if (model.waveActive) { ctx.fillStyle = "#94a3b8"; ctx.font = "600 12px sans-serif"; ctx.fillText(`WAVE ${model.wave}`, 820, 38); }
  ctx.restore();
}

export default function SideViewGame({ user, onLogout }) {
  const canvasRef = useRef(null); const wrapRef = useRef(null); const modelRef = useRef(createModel()); const frameRef = useRef(null); const lastRef = useRef(0);
  const [view, setView] = useState(() => ({ ...modelRef.current }));
  const [selectedTower, setSelectedTower] = useState(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current; const wrap = wrapRef.current; if (!canvas || !wrap) return undefined;
    const model = modelRef.current; model.running = true;
    const resize = () => { const rect = wrap.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; };
    const hit = (enemy, damage, slow = 0) => { enemy.hp -= damage; enemy.slow = Math.max(enemy.slow, slow); };
    const tick = (now) => {
      const delta = Math.min(0.05, (now - (lastRef.current || now)) / 1000); lastRef.current = now;
      if (model.running && !model.paused && started) {
        model.time += delta; model.tacticalTimer = Math.max(0, model.tacticalTimer - delta); model.squad = tickSquad(model.squad, delta);
        if (model.waveActive) {
          const plan = model.wavePlan;
          model.spawnTimer -= delta;
          if (model.spawnIndex < plan.enemies.length && model.spawnTimer <= 0) {
            const entry = plan.enemies[model.spawnIndex]; const enemy = deriveEnemyVariant(entry.archetype, entry.variant, model.wave, entry.lane, entry.boss);
            enemy.x = SIDEVIEW_WORLD.spawnX; enemy.color = NEON_VARIANTS[entry.variant].color;
            model.enemies.push(enemy); model.spawnIndex += 1; model.spawnTimer = plan.interval;
          }
          model.enemies = model.enemies.map((enemy) => advanceLaneEnemy(enemy, delta)).filter((enemy) => {
            if (enemy.x <= SIDEVIEW_WORLD.baseX) { model.baseHp = Math.max(0, model.baseHp - enemy.leak); model.lastWave = `${enemy.name} breached the keep (-${enemy.leak})`; return false; }
            return enemy.hp > 0;
          });
          for (const tower of model.towers) {
            tower.cooldown -= delta; if (tower.cooldown > 0) continue;
            const target = model.enemies.filter((enemy) => enemy.lane === tower.lane && Math.abs(enemy.x - tower.x) <= tower.range).sort((a, b) => a.x - b.x)[0];
            if (!target) continue;
            const towerType = SIDEVIEW_TOWER_TYPES.find((entry) => entry.id === tower.type);
            tower.cooldown = towerType.fireRate;
            if (tower.type === "frost") model.enemies.filter((enemy) => enemy.lane === tower.lane && Math.abs(enemy.x - tower.x) <= tower.range).forEach((enemy) => hit(enemy, towerType.damage, 2.2));
            else if (tower.type === "inferno") model.enemies.filter((enemy) => enemy.lane === tower.lane && Math.abs(enemy.x - target.x) < 58).forEach((enemy) => hit(enemy, towerType.damage));
            else hit(target, towerType.damage);
          }
          if (model.enemies.length === 0 && model.spawnIndex >= plan.enemies.length) { model.waveActive = false; model.lastWave = `Wave ${model.wave} cleared`; model.gold += 55 + model.wave * 8; }
        }
        if (model.baseHp <= 0) { model.running = false; model.waveActive = false; model.lastWave = "Keep breached. Reset to try again."; }
        model.enemies = model.enemies.filter((enemy) => enemy.hp > 0);
      }
      const rect = wrap.getBoundingClientRect(); const width = rect.width; const height = rect.height; const scale = Math.min(width / SIDEVIEW_WORLD.width, height / SIDEVIEW_WORLD.height); const ox = (width - SIDEVIEW_WORLD.width * scale) / 2; const oy = (height - SIDEVIEW_WORLD.height * scale) / 2;
      const dpr = Math.min(window.devicePixelRatio || 1, 2); const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); paintBackground(ctx, width, height, scale, ox, oy, model);
      if (Math.floor(model.time * 10) % 2 === 0) setView({ ...model, squad: { ...model.squad }, enemies: model.enemies });
      frameRef.current = requestAnimationFrame(tick);
    };
    resize(); window.addEventListener("resize", resize); frameRef.current = requestAnimationFrame(tick);
    return () => { model.running = false; cancelAnimationFrame(frameRef.current); window.removeEventListener("resize", resize); };
  }, [started]);

  const startWave = () => { const model = modelRef.current; if (model.waveActive || model.wave >= 20 || model.baseHp <= 0) return; model.wave += 1; model.wavePlan = buildSideViewWave(model.wave); model.spawnIndex = 0; model.spawnTimer = 0; model.waveActive = true; model.lastWave = `Wave ${model.wave} incoming`; setView({ ...model }); };
  const reset = () => { modelRef.current = createModel(); setStarted(false); setSelectedTower(null); setView({ ...modelRef.current }); };
  const issueCommand = (role) => { const model = modelRef.current; const result = issueSquadCommand(model.squad, role); if (!result.accepted) return; model.squad = result.squad; model.squadPulse = `${role} command resolved while the Horde advances`; if (role === "engineer") model.baseHp = Math.min(model.maxBaseHp, model.baseHp + 22); if (role === "vanguard") model.enemies.filter((enemy) => enemy.x < 500).forEach((enemy) => { enemy.slow = Math.max(enemy.slow, 2); enemy.hp -= 30; }); if (role === "ranger") { const target = [...model.enemies].sort((a, b) => a.hp - b.hp)[0]; if (target) target.hp -= 90; } if (role === "arcanist") model.enemies.forEach((enemy) => { enemy.slow = Math.max(enemy.slow, 4); enemy.hp -= 18; }); setView({ ...model, squad: { ...model.squad } }); };
  const placeTower = (event) => { const canvas = canvasRef.current; const rect = canvas.getBoundingClientRect(); const width = rect.width; const height = rect.height; const scale = Math.min(width / SIDEVIEW_WORLD.width, height / SIDEVIEW_WORLD.height); const ox = (width - SIDEVIEW_WORLD.width * scale) / 2; const oy = (height - SIDEVIEW_WORLD.height * scale) / 2; const x = (event.clientX - rect.left - ox) / scale; const y = (event.clientY - rect.top - oy) / scale; const spot = SIDEVIEW_TOWER_SPOTS.find((entry) => Math.hypot(entry.x - x, SIDEVIEW_WORLD.laneYs[entry.lane] - 44 - y) < 28); const model = modelRef.current; const type = SIDEVIEW_TOWER_TYPES.find((entry) => entry.id === selectedTower); if (!spot || !type || model.towers.some((tower) => tower.spotId === spot.id) || model.gold < type.cost) return; model.gold -= type.cost; model.towers.push({ ...spot, type: type.id, range: type.range, color: type.color, cooldown: 0 }); setSelectedTower(null); setView({ ...model, towers: [...model.towers] }); };
  const togglePause = () => { modelRef.current.paused = !modelRef.current.paused; setView({ ...modelRef.current }); };

  return <div className="min-h-screen bg-[#07101c] text-slate-100" style={{ fontFamily: "IBM Plex Sans, sans-serif" }}>
    <header className="flex items-center justify-between border-b border-cyan-400/20 bg-[#0b1828] px-4 py-3 md:px-8"><div><p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300">AEGIS / EXPERIMENTAL MODE</p><h1 className="font-display text-xl font-black tracking-tight text-white md:text-2xl">Neon Lane Command</h1></div><div className="flex items-center gap-2"><span className="hidden text-xs text-slate-400 md:inline">{user?.email || "Prototype pilot"}</span><button className="p-2 text-slate-300 hover:text-white" title="Return to authentication" onClick={onLogout}><LogOut size={17} /></button></div></header>
    <main className="mx-auto flex max-w-[1320px] flex-col gap-3 p-3 md:p-5"><div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cyan-400/20 bg-[#0c1d2c] px-3 py-2"><div className="flex flex-wrap items-center gap-4 text-xs"><span className="text-rose-300"><Shield size={14} className="mr-1 inline" /> Keep {view.baseHp}/{view.maxBaseHp}</span><span className="text-amber-300">Gold {view.gold}</span><span className="text-cyan-300">Wave {view.wave}/20</span><span className="text-slate-400">{view.lastWave}</span></div><div className="flex gap-2"><button className="rounded-md bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40" onClick={startWave} disabled={!started || view.waveActive || view.baseHp <= 0}>Start wave</button><button className="rounded-md border border-slate-600 px-3 py-2 text-xs" onClick={togglePause} disabled={!started}>{view.paused ? <Play size={14} /> : <Pause size={14} />}</button><button className="rounded-md border border-slate-600 p-2" title="Reset prototype" onClick={reset}><RotateCcw size={14} /></button></div></div>
      <div ref={wrapRef} className="relative h-[52vh] min-h-[340px] overflow-hidden rounded-xl border border-cyan-400/25 bg-[#08111f] shadow-[0_0_30px_rgba(34,211,238,0.08)]"><canvas ref={canvasRef} onPointerDown={placeTower} className="block h-full w-full touch-none" />{!started && <div className="absolute inset-0 flex items-center justify-center bg-[#07101c]/80 p-5 text-center"><div><p className="mb-2 text-xs uppercase tracking-[0.3em] text-cyan-300">Vertical slice / no production save data</p><h2 className="mb-3 font-display text-3xl font-black">Hold the three lanes.</h2><p className="mx-auto mb-5 max-w-md text-sm text-slate-300">Place automated towers beside the lanes, then issue squad commands during live Horde pressure.</p><button className="rounded-md bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950" onClick={() => { setStarted(true); modelRef.current.running = true; }}>Deploy prototype</button></div></div>}</div>
      <section className="grid gap-3 lg:grid-cols-[1fr_1fr]"> <div className="rounded-lg border border-slate-700 bg-[#0b1828] p-3"><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold">Tower positions</h2><span className="text-[10px] uppercase tracking-widest text-slate-500">tap a ring to place</span></div><div className="flex flex-wrap gap-2">{SIDEVIEW_TOWER_TYPES.map((tower) => <button key={tower.id} onClick={() => setSelectedTower(selectedTower === tower.id ? null : tower.id)} className={`rounded-md border px-3 py-2 text-left text-xs ${selectedTower === tower.id ? "border-cyan-300 bg-cyan-300/15" : "border-slate-700"}`}><span className="font-bold" style={{ color: tower.color }}>{tower.name}</span><span className="ml-2 text-slate-400">{tower.cost}g</span></button>)}</div></div><div className="rounded-lg border border-slate-700 bg-[#0b1828] p-3"><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold">Aegis Squad</h2><span className="text-[10px] text-amber-300">Tactical window {Math.ceil(view.tacticalTimer)}s</span></div><div className="grid grid-cols-2 gap-2 md:grid-cols-4">{SQUAD_ROSTER.map((unit) => <button key={unit.id} onClick={() => issueCommand(unit.id)} disabled={!started || !view.squad[unit.id]?.ready} className="rounded-md border border-slate-700 p-2 text-left disabled:opacity-40"><span className="block text-xs font-bold" style={{ color: unit.color }}>{unit.name}</span><span className="block text-[10px] text-slate-400">{unit.role}</span><span className="mt-1 block text-[10px] text-slate-500">{view.squad[unit.id]?.ready ? "READY" : `${Math.ceil(view.squad[unit.id]?.cooldown || 0)}s`}</span></button>)}</div><p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500"><Zap size={12} /> {view.squadPulse} <Swords size={12} className="ml-auto" /> Real-time pressure continues</p></div></section>
    </main>
  </div>;
}
