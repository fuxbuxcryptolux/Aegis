// Aegis Rogue - 60fps HTML5 Canvas tower defense engine (framework agnostic).
import { WORLD_W, WORLD_H, GRID, generateLevelPath, TOWERS, HERO_ABILITIES, CREEPS, MAX_WAVE, buildWave, TOWER_SPECIALIZATIONS } from "./config";
import { getDailyEngagement } from "./engagement";
import audio from "./audio";

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// distance from point to segment
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return dist(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, ax + t * dx, ay + t * dy);
}

class KingdomDefender {
  constructor(def, spot, totalMaxSlots = 6) {
    this.id = def.id;
    this.x = spot.x;
    this.y = spot.y;
    this.spotKey = spot.key;
    this.level = 1;
    this.cd = 0;
    this.invested = def.cost;
    this.angle = 0;
    this.specialization = null;
    this.maxHp = def.maxHp || 100;
    this.hp = this.maxHp;
    this.totalMaxSlots = totalMaxSlots;
    this.dead = false;
    this.cleaningUntil = 0;
    this.towerColor = def.color || '#00f0ff';
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.dead = true;
      this.cleaningUntil = performance.now() + 10000;
    }
  }
}

export default class GameEngine {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.hooks = hooks; // onState, onWaveCleared, onDefeat, onVictory, onToast
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.scale = 1;
    this.offX = 0;
    this.offY = 0;

    this.reset();

    this._raf = null;
    this._last = 0;
    this._stateAccum = 0;
    this._hover = null;
    this.running = false;
  }

  // ---------- setup ----------
  _setActivePath(level) {
    this.activePath = generateLevelPath(level, WORLD_W, WORLD_H);
    this._precomputePath();
    this._precomputeSpots();
    if (this.gs) this.gs.activePath = this.activePath.map((point) => ({ ...point }));
  }

  _precomputePath() {
    this.pathLen = 0;
    this.segs = [];
    for (let i = 0; i < this.activePath.length - 1; i++) {
      const a = this.activePath[i];
      const b = this.activePath[i + 1];
      const len = dist(a.x, a.y, b.x, b.y);
      this.segs.push({ a, b, len, start: this.pathLen });
      this.pathLen += len;
    }
    this.base = this.activePath[this.activePath.length - 1];
  }

  pointAt(d) {
    for (const s of this.segs) {
      if (d <= s.start + s.len) {
        const t = (d - s.start) / s.len;
        return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
      }
    }
    return { x: this.base.x, y: this.base.y };
  }

  _precomputeSpots() {
    this.spots = [];
    for (let gx = GRID / 2; gx < WORLD_W; gx += GRID) {
      for (let gy = GRID / 2; gy < WORLD_H; gy += GRID) {
        let minD = Infinity;
        for (const s of this.segs) {
          const d = distToSeg(gx, gy, s.a.x, s.a.y, s.b.x, s.b.y);
          if (d < minD) minD = d;
        }
        // buildable near path but not on it
        if (minD > 30 && minD < 90) {
          this.spots.push({ x: gx, y: gy, key: `${gx},${gy}` });
        }
      }
    }
  }

  reset(meta = { soulGems: 0, prestigeLevel: 0 }) {
    const bonusGold = 300 + (meta.prestigeLevel || 0) * 100;
    this.engagement = getDailyEngagement();
    this.gs = {
      nexusHP: 100,
      maxNexusHP: 100,
      gold: bonusGold,
      gems: 0,
      soulGems: meta.soulGems || 0,
      prestigeLevel: meta.prestigeLevel || 0,
      wave: 0,
      maxWave: MAX_WAVE,
      waveStatus: "idle", // idle | active | cleared | defeat | victory
      isBoss: false,
      gameSpeed: 1,
      paused: false,
      perks: [],
      activePath: [],
    };
    this._setActivePath(1);
    this.mods = {
      rangeMul: 1,
      damageMul: 1,
      fireRateMul: 1,
      goldMul: 1,
      burnOnHit: false,
      critChance: 0.05,
      critMul: 2,
      extraSlots: 0,
      gemChance: 0.06,
      slowDurMul: 1,
      splashMul: 1,
    };
    this.mods.fireRateMul *= this.engagement.weekly.fireRateMul || 1;
    this.mods.goldMul *= this.engagement.weekly.goldMul || 1;
    this.mods.gemChance += this.engagement.weekly.gemChance || 0;
    this.gs.maxNexusHP = Math.max(1, Math.round(this.gs.maxNexusHP * (this.engagement.weekly.nexusMul || 1)));
    this.gs.nexusHP = this.gs.maxNexusHP;
    this.baseMaxTowers = 6;
    this.creeps = [];
    this.towers = [];
    this.defenders = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.arcs = [];
    this.hiddenLocks = {
      graverobber: false,
      overcharger: false,
      necroparasite: false,
      energyUses: 0,
      goldHoard: 0,
    };
    this.hero = { x: this.base.x - 120, y: this.base.y - 60, target: null, cooldowns: { nuke: 0, freeze: 0, heal: 0 }, atkCd: 0 };
    this.selectedTower = null; // tower id to place
    this.selectedPlaced = null; // placed tower ref
    this._spawnQueue = [];
    this._spawnTimer = 0;
    this._waveConf = null;
    this._lastWaveLoot = { gold: 0, gems: 0 };
    this._pendingLoot = { gold: 0, gems: 0 };
    this.freezeTimer = 0;
    this._secretSpawnTimer = 0;
    this._secretSpawned = { graverobber: false, overcharger: false, necroparasite: false };
    this._zeroHourStarted = false;
    this._hordePulseTimer = 0;
    this._specialWaveBurst = 0;
    this.bannerText = "";
    this.bannerTTL = 0;
    this.energyUseCount = 0;
    this.hordeImpactAt = Date.now() + 24 * 60 * 60 * 1000;
    this.hordeImpactActive = false;
  }

  get maxTowers() {
    return this.baseMaxTowers + this.mods.extraSlots;
  }

  // ---------- lifecycle ----------
  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    const sx = w / WORLD_W;
    const sy = h / WORLD_H;
    this.scale = Math.min(sx, sy);
    this.offX = (w - WORLD_W * this.scale) / 2;
    this.offY = (h - WORLD_H * this.scale) / 2;
  }

  toWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    return { x: (cx - this.offX) / this.scale, y: (cy - this.offY) / this.scale };
  }

  // ---------- input ----------
  selectTowerType(id) {
    this.selectedTower = id;
    this.selectedPlaced = null;
    this._emitState(true);
  }

  cancelSelect() {
    this.selectedTower = null;
    this.selectedPlaced = null;
    this._emitState(true);
  }

  pointerHover(clientX, clientY) {
    const p = this.toWorld(clientX, clientY);
    this._hover = p;
  }

  _nearestSpot(x, y) {
    let best = null;
    let bd = Infinity;
    for (const s of this.spots) {
      const d = dist(x, y, s.x, s.y);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return bd < GRID ? best : null;
  }

  _towerAt(x, y) {
    for (const t of this.towers) {
      if (t.defender && t.defender.dead) continue;
      if (dist(x, y, t.x, t.y) < 20) return t;
    }
    return null;
  }

  pointerDown(clientX, clientY) {
    const p = this.toWorld(clientX, clientY);
    audio.resume();
    if (this.selectedTower) {
      const occupied = this._towerAt(p.x, p.y);
      if (occupied && occupied.id === this.selectedTower) {
        const merged = occupied.level + 1;
        occupied.level = merged;
        occupied.invested += TOWERS[this.selectedTower].cost;
        occupied.defender = occupied.defender || { hp: 1, maxHp: 1, dead: false };
        occupied.defender.maxHp = Math.max(occupied.defender.maxHp, 100 + merged * 20);
        occupied.defender.hp = occupied.defender.maxHp;
        this.hooks.onToast?.(`${TOWERS[this.selectedTower].name} merged to rank ${merged}.`);
        this._emitState(true);
        return;
      }
      this._tryPlace(p.x, p.y);
      return;
    }
    const t = this._towerAt(p.x, p.y);
    if (t) {
      this.selectedPlaced = t;
      this._emitState(true);
      return;
    }
    // move hero
    this.selectedPlaced = null;
    this.hero.moveTo = { x: Math.max(20, Math.min(WORLD_W - 20, p.x)), y: Math.max(20, Math.min(WORLD_H - 20, p.y)) };
    this._emitState(true);
  }

  _tryPlace(x, y) {
    const spot = this._nearestSpot(x, y);
    if (!spot) {
      this.hooks.onToast?.("Can't build there - place beside the path.");
      return;
    }
    if (this.towers.some((t) => t.spotKey === spot.key)) {
      this.hooks.onToast?.("Slot occupied.");
      return;
    }
    if (this.towers.length >= this.maxTowers) {
      this.hooks.onToast?.("Max tower slots reached. Watch an ad for an emergency slot or sell one.");
      this.hooks.onSlotBlocked?.({ kind: "max-slots" });
      return;
    }
    const def = TOWERS[this.selectedTower];
    if (this.gs.gold < def.cost) {
      this.hooks.onToast?.("Not enough gold.");
      return;
    }
    this.gs.gold -= def.cost;
    const defender = new KingdomDefender(def, spot, this.maxTowers);
    this.defenders.push(defender);
    this.towers.push({
      id: def.id,
      x: spot.x,
      y: spot.y,
      spotKey: spot.key,
      level: 1,
      cd: 0,
      invested: def.cost,
      angle: 0,
      specialization: null,
      defender,
    });
    this.hooks.onDailyProgress?.("towersPlaced", 1);
    audio.play("place");
    this._spawnParticles(spot.x, spot.y, def.color, 10);
    this._emitState(true);
  }

  applyTowerSpecialization(id) {
    const t = this.selectedPlaced;
    if (!t) return false;
    if (t.specialization) {
      this.hooks.onToast?.("This tower already has a specialization.");
      return false;
    }
    const specs = TOWER_SPECIALIZATIONS[t.id] || [];
    const spec = specs.find((item) => item.id === id);
    if (!spec) return false;
    t.specialization = id;
    this.hooks.onToast?.(`${spec.name} specialization installed.`);
    this._emitState(true);
    return true;
  }

  upgradeSelected() {
    const t = this.selectedPlaced;
    if (!t) return;
    const cost = this._upgradeCost(t);
    if (this.gs.gold < cost) {
      this.hooks.onToast?.("Not enough gold to upgrade.");
      return;
    }
    this.gs.gold -= cost;
    t.level += 1;
    t.invested += cost;
    audio.play("place");
    this._spawnParticles(t.x, t.y, TOWERS[t.id].color, 12);
    this._emitState(true);
  }

  sellSelected() {
    const t = this.selectedPlaced;
    if (!t) return;
    const refund = Math.floor(t.invested * 0.6);
    this.gs.gold += refund;
    this.towers = this.towers.filter((x) => x !== t);
    if (t.defender) {
      this.defenders = this.defenders.filter((d) => d !== t.defender);
    }
    this.selectedPlaced = null;
    this.hooks.onToast?.(`Sold tower for ${refund} gold.`);
    this._emitState(true);
  }

  _cleanupDeadDefenders() {
    const now = performance.now();
    const survivors = [];
    for (const t of this.towers) {
      const d = t.defender;
      if (!d || !d.dead) {
        survivors.push(t);
        continue;
      }
      if (now >= (d.cleaningUntil || 0)) {
        this._spawnParticles(t.x, t.y, "#00f0ff", 16);
        this.hooks.onToast?.(`${TOWERS[t.id].name} collapsed into wisps and the slot reopened.`);
        continue;
      }
      survivors.push(t);
    }
    this.towers = survivors;
    this.defenders = this.defenders.filter((d) => !d.dead);
    if (this.selectedPlaced && !this.towers.includes(this.selectedPlaced)) {
      this.selectedPlaced = null;
    }
  }

  _upgradeCost(t) {
    return Math.floor(TOWERS[t.id].cost * 0.7 * t.level);
  }

  towerStats(t) {
    const def = TOWERS[t.id];
    const lvlMul = 1 + (t.level - 1) * 0.35;
    const spec = (TOWER_SPECIALIZATIONS[def.id] || []).find((item) => item.id === t.specialization) || {};
    const rangeMul = spec.rangeMul || 1;
    const damageMul = spec.damageMul || 1;
    const fireRateMul = spec.fireRateMul || 1;
    const slowDurMul = spec.slowDurMul || 1;
    const splashMul = spec.splashMul || 1;
    const chainBonus = spec.chainBonus || 0;
    return {
      def,
      range: def.range * this.mods.rangeMul * rangeMul * (1 + (t.level - 1) * 0.06),
      damage: def.damage * lvlMul * this.mods.damageMul * damageMul,
      fireRate: def.fireRate * this.mods.fireRateMul * fireRateMul,
      slowDur: def.slowDur ? def.slowDur * this.mods.slowDurMul * slowDurMul : undefined,
      splash: def.splash ? def.splash * this.mods.splashMul * splashMul : 0,
      chain: def.chain ? def.chain + chainBonus : undefined,
    };
  }

  // ---------- waves ----------
  startWave() {
    if (this.gs.waveStatus === "active" || this.gs.waveStatus === "defeat" || this.gs.waveStatus === "victory") return;
    this.selectedTower = null;
    this.selectedPlaced = null;
    this.gs.wave += 1;
    this.bannerText = "";
    this.bannerTTL = 0;
    this._setActivePath(this.gs.wave);
    this.creeps = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.arcs = [];
    const conf = buildWave(this.gs.wave);
    this._waveConf = conf;
    this._spawnQueue = [...conf.spawns];
    this._spawnTimer = 0;
    this.gs.isBoss = conf.isBoss;
    this.gs.waveStatus = "active";
    this._pendingLoot = { gold: 0, gems: 0 };
    if (conf.isBoss) {
      audio.play("boss");
      this.bannerText = conf.isBoss ? `WAVE ${this.gs.wave} // BOSS` : `WAVE ${this.gs.wave}`;
      this.bannerTTL = 1.5;
      this.hooks.onToast?.(`WAVE ${this.gs.wave} - MEGA BOSS INCOMING!`);
    }
    this._emitState(true);
  }

  _spawnCreep(key) {
    const c = CREEPS[key];
    const conf = this._waveConf;
    const hp = Math.round(c.hp * conf.hpMul);
    this.creeps.push({
      key,
      x: this.pointAt(0).x,
      y: this.pointAt(0).y,
      d: -Math.random() * 30,
      hp,
      maxHp: hp,
      speed: c.speed,
      reward: Math.round(c.reward * conf.rewardMul),
      leak: c.leak,
      radius: c.radius,
      color: c.color,
      boss: !!c.boss,
      slowT: 0,
      slowMul: 1,
      burnT: 0,
      burnDps: 0,
      name: c.name,
      kind: c.key,
      special: c.key,
    });
  }

  _spawnHiddenCreep(kind) {
    const effectiveKind = kind === 'galvanized' ? 'overcharger' : kind === 'parasite' ? 'necroparasite' : kind;
    const spawn = this.pointAt(Math.min(this.pathLen * 0.3, this.pathLen - 12));
    const base = {
      x: spawn.x,
      y: spawn.y,
      d: this.pathLen * 0.3,
      hp: 150,
      maxHp: 150,
      speed: 70,
      reward: 70,
      leak: 8,
      radius: 13,
      color: '#facc15',
      boss: false,
      slowT: 0,
      slowMul: 1,
      burnT: 0,
      burnDps: 0,
      name: effectiveKind,
      kind: effectiveKind,
      key: effectiveKind,
    };
    if (effectiveKind === 'graverobber') {
      base.color = '#facc15';
      base.hp = 180; base.maxHp = 180; base.speed = 62; base.reward = 90; base.leak = 10; base.radius = 12;
    } else if (effectiveKind === 'overcharger') {
      base.color = '#60a5fa';
      base.hp = 200; base.maxHp = 200; base.speed = 92; base.reward = 95; base.leak = 9; base.radius = 12;
    } else if (effectiveKind === 'necroparasite') {
      base.color = '#a855f7';
      base.hp = 240; base.maxHp = 240; base.speed = 78; base.reward = 120; base.leak = 12; base.radius = 14;
    }
    this.creeps.push(base);
    this._spawnParticles(base.x, base.y, base.color, 18);
  }

  _maybeTriggerSecretSpawns() {
    if (this.gs.waveStatus !== 'active') return;
    if (this.creeps.length >= 22 && this._specialWaveBurst === 0) {
      this._specialWaveBurst = 1;
      this._spawnHiddenCreep('graverobber');
      this.hooks.onToast?.('A grave thief has found the line.');
    }
    if (this.gs.wave >= 8 && this.hiddenLocks.energyUses >= 4 && !this.hiddenLocks.overcharger) {
      this.hiddenLocks.overcharger = true;
      this._spawnHiddenCreep('overcharger');
      this.hooks.onToast?.('The Galvanized Ghoul is charging the lanes.');
    }
    if (this.gs.wave >= 12 && !this.hiddenLocks.necroparasite) {
      this.hiddenLocks.necroparasite = true;
      this._spawnHiddenCreep('necroparasite');
      this.hooks.onToast?.('The Necro-Parasite splits the path in two.');
    }
  }

  _evaluateHiddenUnlocks() {
    if (!this.hiddenLocks.graverobber && this.gs.gold > 2500) {
      this.hiddenLocks.graverobber = true;
      this._spawnHiddenCreep('graverobber');
      this.hooks.onToast?.('The Plague Graverobber has entered the map.');
    }
    if (!this.hiddenLocks.overcharger && this.hiddenLocks.energyUses >= 15) {
      this.hiddenLocks.overcharger = true;
      this._spawnHiddenCreep('overcharger');
      this.hooks.onToast?.('The Galvanized Ghoul is charging the lanes.');
    }
    if (!this.hiddenLocks.necroparasite && this.gs.wave >= 12) {
      this.hiddenLocks.necroparasite = true;
      this._spawnHiddenCreep('necroparasite');
      this.hooks.onToast?.('The Necro-Parasite splits the path in two.');
    }
    this._maybeTriggerSecretSpawns();
  }

  // ---------- abilities ----------
  castAbility(id) {
    const ab = HERO_ABILITIES[id];
    if (this.gs.waveStatus !== "active" && id !== "heal") {
      // allow heal anytime, others need active field
    }
    if (this.hero.cooldowns[id] > 0) return false;
    this.hiddenLocks.energyUses += 1;
    if (id === "nuke") {
      this.energyUseCount += 1;
      audio.play("nuke");
      this.creeps.forEach((c) => this._damage(c, c.boss ? 260 : 260, "#ef4444", false));
      this._spawnParticles(this.base.x - 200, WORLD_H / 2, "#ef4444", 40);
      this.hooks.onToast?.("METEOR HAMMER CALLED!");
    } else if (id === "freeze") {
      this.energyUseCount += 1;
      audio.play("frost");
      this.freezeTimer = 3.5;
      this.creeps.forEach((c) => {
        c.slowT = Math.max(c.slowT, 3.5);
        c.slowMul = 0;
      });
      this.hooks.onToast?.("POLAR WAVE - enemies frozen!");
    } else if (id === "heal") {
      audio.play("reward");
      this.gs.nexusHP = Math.min(this.gs.maxNexusHP, this.gs.nexusHP + 35);
      this._addFloater(this.base.x - 30, this.base.y - 30, "+35 HP", "#10b981");
      this.hooks.onToast?.("Keep restored +35 HP.");
    }
    this.hero.cooldowns[id] = ab.cooldown;
    this._emitState(true);
    return true;
  }

  // ---------- monetization hooks ----------
  applyPerk(perk) {
    perk.apply(this.mods, this.gs);
    this.gs.perks.push(perk.id);
    audio.play("perk");
    this.hooks.onToast?.(`Perk drafted: ${perk.title}`);
    this._emitState(true);
  }

  reviveBase() {
    this.gs.nexusHP = Math.floor(this.gs.maxNexusHP * 0.5);
    this.gs.waveStatus = "active";
    // clear field as a "nuke the screen" bonus
    this.creeps.forEach((c) => this._damage(c, 99999, "#ef4444", false));
    audio.play("reward");
    this.hooks.onToast?.("SECOND CHANCE! Base revived at 50% + screen cleared.");
    this._emitState(true);
  }

  doubleLastLoot() {
    const g = this._lastWaveLoot.gold;
    const gm = this._lastWaveLoot.gems;
    this.gs.gold += g;
    this.gs.gems += gm;
    audio.play("reward");
    this._addFloater(this.base.x - 40, this.base.y, `+${g}g +${gm}gem`, "#f59e0b");
    this.hooks.onToast?.(`2X LOOT! +${g} gold, +${gm} gems.`);
    this._emitState(true);
  }

  grantGems(n) {
    this.gs.gems += n;
    audio.play("reward");
    this._emitState(true);
  }

  grantOfferReward(offer) {
    // parse simple reward
    let gems = 0;
    const m = /([\d,]+)\s*Gems/i.exec(offer.reward);
    if (m) gems = parseInt(m[1].replace(/,/g, ""), 10);
    if (gems) this.gs.gems += gems;
    if (/Dragon Tower/i.test(offer.reward)) {
      this.mods.damageMul *= 1.25;
      this.mods.rangeMul *= 1.1;
    }
    audio.play("reward");
    this._emitState(true);
    return gems;
  }

  prestige() {
    // convert current run progress into soul gems, reset run
    const earned = Math.max(1, this.gs.wave) + Math.floor(this.gs.gems / 100);
    const newSoul = this.gs.soulGems + earned;
    const newLevel = this.gs.prestigeLevel + 1;
    this.reset({ soulGems: newSoul, prestigeLevel: newLevel });
    this._emitState(true);
    return { earned, soulGems: newSoul, prestigeLevel: newLevel };
  }

  setSpeed(n) {
    this.gs.gameSpeed = n;
    this._emitState(true);
  }

  setPaused(p) {
    this.gs.paused = p;
    this._emitState(true);
  }

  grantEmergencySlot() {
    this.baseMaxTowers += 1;
    this.hooks.onToast?.("Emergency slot granted for this wave.");
    this._emitState(true);
    return this.maxTowers;
  }

  // ---------- combat helpers ----------
  _damage(c, amount, color, allowCrit = true) {
    const isParasite = c.key === "parasite" || c.key === "necroparasite" || c.kind === "necroparasite" || c.kind === "parasite";
    if (isParasite && !c.split && c.hp > 0 && c.hp - amount <= c.maxHp * 0.5) {
      c.split = true;
      const cloneA = { ...c, x: c.x + 8, y: c.y + 8, hp: Math.max(30, c.hp * 0.5), maxHp: Math.max(30, c.hp * 0.5), split: true, special: "parasite", key: "necroparasite", kind: "necroparasite" };
      const cloneB = { ...c, x: c.x - 8, y: c.y - 8, hp: Math.max(30, c.hp * 0.5), maxHp: Math.max(30, c.hp * 0.5), split: true, special: "parasite", key: "necroparasite", kind: "necroparasite" };
      this.creeps.push(cloneA, cloneB);
      c.hp = 0;
      this._addFloater(c.x, c.y, "SPLIT!", "#d946ef");
      return;
    }
    let dmg = amount;
    let crit = false;
    if (allowCrit && Math.random() < this.mods.critChance) {
      dmg *= this.mods.critMul;
      crit = true;
    }
    dmg = Math.round(dmg);
    c.hp -= dmg;
    this._addFloater(c.x, c.y - c.radius - 4, (crit ? "CRIT " : "") + dmg, crit ? "#ef4444" : color);
  }

  _killCreep(c) {
    let gold = c.reward;
    gold = Math.round(gold * this.mods.goldMul);
    this.gs.gold += gold;
    this._pendingLoot.gold += gold;
    this.hooks.onDailyProgress?.("kills", 1);
    this._addFloater(c.x, c.y, `+${gold}`, "#f59e0b");
    if (Math.random() < this.mods.gemChance || c.boss) {
      const gems = c.boss ? 15 : 1;
      this.gs.gems += gems;
      this._pendingLoot.gems += gems;
      this._addFloater(c.x + 10, c.y - 12, `+${gems}gem`, "#06b6d4");
    }
    this._spawnParticles(c.x, c.y, c.color, c.boss ? 30 : 8);
    audio.play("death");
  }

  _addFloater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 0.9, vy: -28 });
    if (this.floaters.length > 60) this.floaters.shift();
  }

  _spawnParticles(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 30 + Math.random() * 120;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.4, color, r: 1 + Math.random() * 2.5 });
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  // ---------- update ----------
  _loop(now) {
    if (!this.running) return;
    let dt = (now - this._last) / 1000;
    this._last = now;
    if (dt > 0.05) dt = 0.05; // clamp big frame gaps
    if (!this.gs.paused && this.gs.waveStatus !== "defeat" && this.gs.waveStatus !== "victory") {
      const steps = this.gs.gameSpeed;
      for (let i = 0; i < steps; i++) this._update(dt);
    } else {
      this._updateVisualsOnly(dt);
    }
    this._render();
    this._stateAccum += dt;
    if (this._stateAccum > 0.12) {
      this._stateAccum = 0;
      this._emitState(false);
    }
    this._raf = requestAnimationFrame(this._loop);
  }

  _updateVisualsOnly(dt) {
    this._updateParticles(dt);
  }

  _update(dt) {
    // cooldowns
    for (const k of Object.keys(this.hero.cooldowns)) {
      if (this.hero.cooldowns[k] > 0) this.hero.cooldowns[k] = Math.max(0, this.hero.cooldowns[k] - dt);
    }
    if (this.freezeTimer > 0) this.freezeTimer -= dt;

    // hero movement
    if (this.hero.moveTo) {
      const d = dist(this.hero.x, this.hero.y, this.hero.moveTo.x, this.hero.moveTo.y);
      if (d < 4) this.hero.moveTo = null;
      else {
        const sp = 200 * dt;
        this.hero.x += ((this.hero.moveTo.x - this.hero.x) / d) * Math.min(sp, d);
        this.hero.y += ((this.hero.moveTo.y - this.hero.y) / d) * Math.min(sp, d);
      }
    }
    // hero auto attack
    this.hero.atkCd -= dt;
    if (this.hero.atkCd <= 0) {
      const tgt = this._firstInRange(this.hero.x, this.hero.y, 120);
      if (tgt) {
        this._damage(tgt, 12, "#e2e8f0");
        this.arcs.push({ x1: this.hero.x, y1: this.hero.y, x2: tgt.x, y2: tgt.y, life: 0.1, color: "#e2e8f0" });
        this.hero.atkCd = 0.5;
      }
    }

    // spawns
    if (this._spawnQueue.length) {
      this._spawnTimer -= dt;
      if (this._spawnTimer <= 0) {
        this._spawnCreep(this._spawnQueue.shift());
        this._spawnTimer = this._waveConf.interval;
      }
    }

    this._evaluateHiddenUnlocks();

    const hordeActive = Date.now() >= this.hordeImpactAt;
    this.hordeImpactActive = hordeActive;
    if (hordeActive) {
      if (!this._zeroHourStarted) {
        this._zeroHourStarted = true;
        this._spawnParticles(this.base.x, this.base.y, '#ff0055', 28);
        this.bannerText = 'ZERO HOUR';
        this.bannerTTL = 2.25;
        this.hooks.onToast?.('ZERO HOUR // the horde has broken through.');
      }
      this._hordePulseTimer += dt;
      if (this._hordePulseTimer >= 6 && this.gs.waveStatus === 'active') {
        this._hordePulseTimer = 0;
        const burst = ['graverobber', 'overcharger', 'necroparasite', 'mutant', 'spewer'];
        const kind = burst[Math.floor(Math.random() * burst.length)];
        this._spawnHiddenCreep(kind);
      }
    }

    // creeps
    for (const c of this.creeps) {
      if (c.slowT > 0) {
        c.slowT -= dt;
        if (c.slowT <= 0) c.slowMul = 1;
      }
      if (c.burnT > 0) {
        c.burnT -= dt;
        c.hp -= c.burnDps * dt;
      }
      const effSpeed = c.speed * c.slowMul;
      c.d += effSpeed * dt;
      const p = this.pointAt(c.d);
      c.x = p.x;
      c.y = p.y;
      if (c.d >= this.pathLen) {
        this.gs.nexusHP -= c.leak;
        c.hp = 0;
        c.leaked = true;
        audio.play("leak");
        this._spawnParticles(this.base.x, this.base.y, "#ef4444", 12);
      }
    }

    this._cleanupDeadDefenders();
    for (const t of this.towers) {
      t.cd -= dt;
      const st = this.towerStats(t);
      const target = this._firstInRange(t.x, t.y, st.range);
      if (target) {
        const ang = Math.atan2(target.y - t.y, target.x - t.x);
        t.angle = ang;
      }
      if (t.cd <= 0 && target) {
        t.cd = st.fireRate;
        this._fire(t, st, target);
      }
    }

    // projectiles
    for (const pr of this.projectiles) {
      if (pr.dead) continue;
      const tx = pr.target && pr.target.hp > 0 ? pr.target.x : pr.tx;
      const ty = pr.target && pr.target.hp > 0 ? pr.target.y : pr.ty;
      pr.tx = tx;
      pr.ty = ty;
      const d = dist(pr.x, pr.y, tx, ty);
      const step = pr.speed * 60 * dt;
      if (d <= step || d < 6) {
        this._projectileHit(pr);
        pr.dead = true;
      } else {
        pr.x += ((tx - pr.x) / d) * step;
        pr.y += ((ty - pr.y) / d) * step;
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    // remove dead creeps
    const alive = [];
    for (const c of this.creeps) {
      if (c.hp <= 0) {
        if (!c.leaked) this._killCreep(c);
      } else alive.push(c);
    }
    this.creeps = alive;

    this._updateParticles(dt);
    if (this.bannerTTL > 0) {
      this.bannerTTL = Math.max(0, this.bannerTTL - dt);
      if (this.bannerTTL === 0) this.bannerText = "";
    }

    // wave end / defeat / victory checks
    if (this.gs.nexusHP <= 0 && this.gs.waveStatus === "active") {
      this.gs.nexusHP = 0;
      this.gs.waveStatus = "defeat";
      audio.play("defeat");
      this.hooks.onDefeat?.();
      this._emitState(true);
      return;
    }
    if (this.gs.waveStatus === "active" && this._spawnQueue.length === 0 && this.creeps.length === 0) {
      this._lastWaveLoot = { ...this._pendingLoot };
      this.hooks.onDailyProgress?.("wavesCleared", 1);
      if (this.gs.wave >= this.gs.maxWave) {
        this.gs.waveStatus = "victory";
        audio.play("victory");
        this.hooks.onVictory?.();
      } else {
        this.gs.waveStatus = "cleared";
        audio.play("perk");
        this.hooks.onWaveCleared?.();
      }
      this._emitState(true);
    }
  }

  _updateParticles(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.y += f.vy * dt;
      f.life -= dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    for (const a of this.arcs) a.life -= dt;
    this.arcs = this.arcs.filter((a) => a.life > 0);
  }

  _firstInRange(x, y, range) {
    // target furthest along path within range
    let best = null;
    let bestD = -1;
    for (const c of this.creeps) {
      if (c.hp <= 0) continue;
      if (dist(x, y, c.x, c.y) <= range && c.d > bestD) {
        bestD = c.d;
        best = c;
      }
    }
    return best;
  }

  _fire(t, st, target) {
    const def = st.def;
    if (def.kind === "frost") {
      audio.play("frost");
      const slowDur = st.slowDur || def.slowDur * this.mods.slowDurMul;
      for (const c of this.creeps) {
        if (dist(t.x, t.y, c.x, c.y) <= st.range) {
          this._damage(c, st.damage, def.color);
          c.slowMul = def.slowMul;
          c.slowT = slowDur;
        }
      }
      this.arcs.push({ ring: true, x1: t.x, y1: t.y, r: st.range, life: 0.3, color: def.color });
      return;
    }
    if (def.kind === "chain") {
      audio.play("tesla");
      let cur = target;
      const hit = new Set();
      let prev = { x: t.x, y: t.y };
      for (let i = 0; i < (st.chain ?? def.chain) && cur; i++) {
        this._damage(cur, st.damage * (1 - i * 0.12), def.color);
        if (this.mods.burnOnHit) this._applyBurn(cur);
        this.arcs.push({ x1: prev.x, y1: prev.y, x2: cur.x, y2: cur.y, life: 0.12, color: def.color });
        hit.add(cur);
        prev = { x: cur.x, y: cur.y };
        let next = null;
        let nd = 90;
        for (const c of this.creeps) {
          if (c.hp <= 0 || hit.has(c)) continue;
          const d = dist(prev.x, prev.y, c.x, c.y);
          if (d < nd) {
            nd = d;
            next = c;
          }
        }
        cur = next;
      }
      return;
    }
    audio.play(def.id === "inferno" ? "inferno" : "archer");
    this.projectiles.push({
      x: t.x,
      y: t.y,
      tx: target.x,
      ty: target.y,
      target,
      speed: def.projSpeed,
      damage: st.damage,
      kind: def.kind,
      color: def.color,
      splash: def.splash ? st.splash ?? def.splash * this.mods.splashMul : 0,
      burn: def.burnDps ? { dps: def.burnDps, dur: def.burnDur } : null,
      r: def.kind === "splash" ? 5 : 3,
    });
  }

  _applyBurn(c, dps = 8, dur = 2.5) {
    c.burnDps = Math.max(c.burnDps, dps);
    c.burnT = Math.max(c.burnT, dur);
  }

  _projectileHit(pr) {
    if (pr.splash) {
      audio.play("inferno");
      for (const c of this.creeps) {
        if (dist(pr.x, pr.y, c.x, c.y) <= pr.splash) {
          this._damage(c, pr.damage, pr.color);
          if (pr.burn) this._applyBurn(c, pr.burn.dps, pr.burn.dur);
          else if (this.mods.burnOnHit) this._applyBurn(c);
        }
      }
      this._spawnParticles(pr.x, pr.y, pr.color, 14);
      this.arcs.push({ ring: true, x1: pr.x, y1: pr.y, r: pr.splash, life: 0.25, color: pr.color });
    } else {
      if (pr.target && pr.target.hp > 0) {
        this._damage(pr.target, pr.damage, pr.color);
        if (this.mods.burnOnHit) this._applyBurn(pr.target);
      }
      this._spawnParticles(pr.x, pr.y, pr.color, 4);
    }
  }

  // ---------- render ----------
  _render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    ctx.clearRect(0, 0, w, h);
    const hordeActive = Date.now() >= this.hordeImpactAt;
    this.hordeImpactActive = hordeActive;
    ctx.fillStyle = hordeActive ? "#050005" : "#0a0017";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.offX, this.offY);
    ctx.scale(this.scale, this.scale);

    this._drawGrid(ctx);
    this._drawPhaseBanner(ctx);
    this._drawSpots(ctx);
    this._drawPath(ctx);
    this._drawBase(ctx);
    this._drawTowers(ctx);
    this._drawHero(ctx);
    this._drawCreeps(ctx);
    this._drawProjectiles(ctx);
    this._drawArcs(ctx);
    this._drawParticles(ctx);
    this._drawFloaters(ctx);
    this._drawPlacementPreview(ctx);

    ctx.restore();
  }

  _drawPhaseBanner(ctx) {
    if (!this.bannerText) return;
    const alpha = Math.min(1, Math.max(0, this.bannerTTL / 1.5));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 28px "Segoe UI", sans-serif';
    ctx.fillStyle = this.bannerText.includes('ZERO') ? '#ff0055' : '#fbbf24';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.strokeText(this.bannerText, WORLD_W / 2, 58);
    ctx.fillText(this.bannerText, WORLD_W / 2, 58);
    ctx.restore();
  }

  _drawGrid(ctx) {
    ctx.strokeStyle = "#2a085c";
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD_W; x += GRID) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_H);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD_H; y += GRID) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_W, y);
      ctx.stroke();
    }
  }

  _drawSpots(ctx) {
    for (const s of this.spots) {
      const occupied = this.towers.some((t) => t.spotKey === s.key);
      if (occupied) continue;
      if (this.selectedTower) {
        ctx.fillStyle = "rgba(0,240,255,0.08)";
        ctx.strokeStyle = "rgba(0,240,255,0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  _drawPath(ctx) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const isImpact = this.hordeImpactActive;
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = isImpact ? "#ff0055" : "#ff007f";
    ctx.strokeStyle = isImpact ? "#ff0055" : "#ff007f";
    ctx.lineWidth = 10;
    this._pathStroke(ctx);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isImpact ? "#ff3366" : "#ff66b3";
    ctx.lineWidth = 3;
    this._pathStroke(ctx);
    ctx.restore();
  }

  _pathStroke(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.activePath[0].x, this.activePath[0].y);
    for (let i = 1; i < this.activePath.length; i++) ctx.lineTo(this.activePath[i].x, this.activePath[i].y);
    ctx.stroke();
  }

  _drawBase(ctx) {
    const b = this.base;
    const pulse = 0.5 + Math.sin(performance.now() / 300) * 0.2;
    ctx.save();
    ctx.shadowColor = "#ff007f";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#1f003b";
    ctx.strokeStyle = "#ff007f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255,230,0,${pulse})`;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawTowers(ctx) {
    for (const t of this.towers) {
      const st = this.towerStats(t);
      const selected = this.selectedPlaced === t;
      if (selected) {
        ctx.strokeStyle = "#00f0ff";
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 12;
        ctx.globalAlpha = 0.75;
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, st.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      const defender = t.defender || { hp: 1, maxHp: 1, dead: false };
      const healthRatio = Math.max(0, defender.hp / defender.maxHp);
      ctx.save();
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#1f003b";
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#1f003b";
      ctx.strokeStyle = "#ffea00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#00f0ff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 10.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#00f0ff";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t.id === 'archer' ? '🏹' : t.id === 'frost' ? '❄️' : t.id === 'inferno' ? '🔥' : '⚡', t.x, t.y + 1);
      ctx.restore();

      const barX = t.x - 18;
      const barY = t.y - 28;
      ctx.fillStyle = '#120021';
      ctx.fillRect(barX, barY, 36, 5);
      const healthColor = healthRatio > 0.65 ? '#39FF14' : healthRatio > 0.3 ? '#FFB000' : '#FF3366';
      ctx.fillStyle = healthColor;
      ctx.fillRect(barX, barY, 36 * healthRatio, 5);
      ctx.strokeStyle = '#dfe7ff';
      ctx.strokeRect(barX, barY, 36, 5);

      ctx.fillStyle = '#ffea00';
      for (let i = 0; i < t.level; i++) {
        ctx.beginPath();
        ctx.arc(t.x - 8 + i * 6, t.y + 20, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawHero(ctx) {
    const hx = this.hero.x;
    const hy = this.hero.y;
    ctx.save();
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#00f0ff";
    ctx.strokeStyle = "#eaffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx, hy - 14);
    ctx.lineTo(hx + 12, hy);
    ctx.lineTo(hx, hy + 14);
    ctx.lineTo(hx - 12, hy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hx, hy, 20 + Math.sin(performance.now() / 160) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx - 22, hy);
    ctx.lineTo(hx - 14, hy);
    ctx.moveTo(hx + 14, hy);
    ctx.lineTo(hx + 22, hy);
    ctx.moveTo(hx, hy - 22);
    ctx.lineTo(hx, hy - 14);
    ctx.moveTo(hx, hy + 14);
    ctx.lineTo(hx, hy + 22);
    ctx.stroke();
    ctx.restore();
    // move indicator
    if (this.hero.moveTo) {
      ctx.strokeStyle = "rgba(0,240,255,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.hero.moveTo.x, this.hero.moveTo.y, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawCreeps(ctx) {
    for (const c of this.creeps) {
      const isBossType = c.boss || c.key === 'zombie_king';
      const isMutant = c.kind === 'mutant' || c.key === 'mutant';
      const isSpewer = c.kind === 'spewer' || c.key === 'spewer';
      const isWalker = c.kind === 'walker' || c.key === 'walker';
      const creepColor = isBossType ? '#ffe600' : c.key === 'brute' ? '#ff0055' : c.kind === 'graverobber' ? '#facc15' : c.kind === 'overcharger' ? '#60a5fa' : c.kind === 'necroparasite' || c.key === 'necroparasite' ? '#a855f7' : isMutant ? '#f97316' : isSpewer ? '#22c55e' : isWalker ? '#84cc16' : '#39ff14';
      ctx.save();
      ctx.shadowColor = creepColor;
      ctx.shadowBlur = 12;
      ctx.fillStyle = isBossType ? '#ffe600' : c.key === 'brute' ? '#ff7f50' : c.kind === 'graverobber' ? '#facc15' : c.kind === 'overcharger' ? '#60a5fa' : c.kind === 'necroparasite' || c.key === 'necroparasite' ? '#a855f7' : isMutant ? '#f97316' : isSpewer ? '#22c55e' : isWalker ? '#84cc16' : '#39ff14';
      ctx.strokeStyle = creepColor;
      ctx.lineWidth = c.boss ? 3 : 2.5;
      ctx.beginPath();
      if (isBossType) {
        ctx.moveTo(c.x - 18, c.y + 16);
        ctx.lineTo(c.x - 10, c.y - 18);
        ctx.lineTo(c.x, c.y - 28);
        ctx.lineTo(c.x + 10, c.y - 18);
        ctx.lineTo(c.x + 18, c.y + 16);
        ctx.closePath();
      } else {
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (isMutant) {
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(c.x - 10, c.y - 2, 20, 4);
      } else if (isSpewer) {
        ctx.fillStyle = '#bbf7d0';
        ctx.fillRect(c.x - 8, c.y - 3, 16, 6);
      } else {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(c.x - 8, c.y - 4, 5, 5);
        ctx.fillRect(c.x + 3, c.y - 4, 5, 5);
      }

      ctx.fillStyle = '#050505';
      ctx.fillRect(c.x - 8, c.y + 5, 16, 6);
      if (isBossType) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(c.x - 12, c.y - 18, 24, 4);
      }
      ctx.restore();

      if (c.boss || c.kind === 'overcharger' || c.kind === 'necroparasite' || c.key === 'necroparasite' || isMutant || isSpewer) {
        ctx.save();
        const eyeColor = c.kind === 'necroparasite' || c.key === 'necroparasite' ? '#f5d0fe' : isMutant ? '#fef3c7' : isSpewer ? '#dcfce7' : '#00d9ff';
        ctx.fillStyle = eyeColor;
        ctx.shadowColor = eyeColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(c.x - 7, c.y - 8, 2, 0, Math.PI * 2);
        ctx.arc(c.x + 7, c.y - 8, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (c.burnT > 0) {
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(c.x + c.radius * 0.5, c.y - c.radius * 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      const bw = c.radius * 2.2;
      const hpPct = Math.max(0, c.hp / c.maxHp);
      ctx.fillStyle = '#120021';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1;
      ctx.fillRect(c.x - bw / 2, c.y - c.radius - 9, bw, 4);
      ctx.strokeRect(c.x - bw / 2, c.y - c.radius - 9, bw, 4);
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(c.x - bw / 2, c.y - c.radius - 9, bw * hpPct, 4);
    }
  }

  _drawProjectiles(ctx) {
    for (const pr of this.projectiles) {
      ctx.save();
      const boltColor = pr.kind === "splash" ? "#ffea00" : "#00f0ff";
      ctx.shadowColor = boltColor;
      ctx.shadowBlur = 20;
      ctx.fillStyle = boltColor;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  _drawArcs(ctx) {
    for (const a of this.arcs) {
      const alpha = Math.max(0, a.life / 0.12);
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.strokeStyle = a.color;
      ctx.shadowColor = a.color;
      ctx.shadowBlur = 12;
      if (a.ring) {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(a.x1, a.y1, a.r * (1 - a.life), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(a.x1, a.y1);
        ctx.lineTo(a.x2, a.y2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawFloaters(ctx) {
    ctx.textAlign = "center";
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / 0.9);
      ctx.fillStyle = f.color;
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 3;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  _drawPlacementPreview(ctx) {
    if (!this.selectedTower || !this._hover) return;
    const spot = this._nearestSpot(this._hover.x, this._hover.y);
    const def = TOWERS[this.selectedTower];
    const occupied = spot && this.towers.some((t) => t.spotKey === spot.key);
    const valid = spot && !occupied && this.towers.length < this.maxTowers && this.gs.gold >= def.cost;
    const cx = spot ? spot.x : this._hover.x;
    const cy = spot ? spot.y : this._hover.y;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = valid ? "#00f0ff" : "#ff0055";
    ctx.fillStyle = valid ? "rgba(0,240,255,0.08)" : "rgba(255,0,85,0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, def.range * this.mods.rangeMul, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- state / save ----------
  _emitState(force) {
    const t = this.selectedPlaced;
    this.hooks.onState?.({
      nexusHP: Math.max(0, Math.round(this.gs.nexusHP)),
      maxNexusHP: this.gs.maxNexusHP,
      gold: Math.floor(this.gs.gold),
      gems: this.gs.gems,
      soulGems: this.gs.soulGems,
      prestigeLevel: this.gs.prestigeLevel,
      wave: this.gs.wave,
      maxWave: this.gs.maxWave,
      waveStatus: this.gs.waveStatus,
      isBoss: this.gs.isBoss,
      nextBoss: this.gs.wave === 0 ? 5 : this.gs.wave % 5 === 0 ? 0 : 5 - (this.gs.wave % 5),
      gameSpeed: this.gs.gameSpeed,
      paused: this.gs.paused,
      selectedTower: this.selectedTower,
      enemiesRemaining: this.creeps.length + this._spawnQueue.length,
      towersPlaced: this.towers.length,
      maxTowers: this.maxTowers,
      perks: [...this.gs.perks],
      activePath: this.activePath.map((point) => ({ ...point })),
      heroCooldowns: { ...this.hero.cooldowns },
      weeklyEvent: this.engagement,
      lastWaveLoot: { ...this._lastWaveLoot },
      selectedPlaced: t
        ? {
            id: t.id,
            level: t.level,
            specialization: t.specialization || null,
            upgradeCost: this._upgradeCost(t),
            sellRefund: Math.floor(t.invested * 0.6),
            specializations: (TOWER_SPECIALIZATIONS[t.id] || []).map((spec) => ({ ...spec, active: t.specialization === spec.id })),
          }
        : null,
    });
  }

  getSaveState() {
    return {
      gs: {
        nexusHP: this.gs.nexusHP,
        maxNexusHP: this.gs.maxNexusHP,
        gold: this.gs.gold,
        gems: this.gs.gems,
        soulGems: this.gs.soulGems,
        prestigeLevel: this.gs.prestigeLevel,
        wave: this.gs.wave,
        waveStatus: this.gs.waveStatus === "active" ? "cleared" : this.gs.waveStatus,
        perks: this.gs.perks,
      },
      mods: this.mods,
      towers: this.towers.map((t) => ({ id: t.id, spotKey: t.spotKey, x: t.x, y: t.y, level: t.level, invested: t.invested, specialization: t.specialization || null })),
      hero: { x: this.hero.x, y: this.hero.y },
    };
  }

  loadSaveState(s) {
    if (!s || !s.gs) return false;
    try {
      Object.assign(this.gs, s.gs);
      this._setActivePath(this.gs.wave || 1);
      if (this.gs.waveStatus === "active") this.gs.waveStatus = "cleared";
      if (this.gs.waveStatus === "defeat" || this.gs.waveStatus === "victory") this.gs.waveStatus = "idle";
      Object.assign(this.mods, s.mods || {});
      this.towers = (s.towers || []).map((t) => {
        const def = TOWERS[t.id];
        const tower = {
          ...t,
          cd: 0,
          angle: 0,
          defender: new KingdomDefender(def, { x: t.x, y: t.y, key: t.spotKey || `${t.x},${t.y}` }, this.maxTowers),
        };
          tower.defender.hp = tower.defender.maxHp;
          tower.specialization = t.specialization || null;
        return tower;
      });
      this.defenders = this.towers
        .map((t) => t.defender)
        .filter(Boolean);
      if (s.hero) {
        this.hero.x = s.hero.x;
        this.hero.y = s.hero.y;
      }
      this._emitState(true);
      return true;
    } catch {
      return false;
    }
  }
}
