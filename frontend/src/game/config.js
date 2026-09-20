// Static game configuration: world, path, towers, heroes, creeps, perks.

export const WORLD_W = 960;
export const WORLD_H = 560;
export const GRID = 40;

// Winding path waypoints (world coords). Enemies spawn off-screen left, reach Nexus at right.
export const PATH = [
  { x: -40, y: 110 },
  { x: 210, y: 110 },
  { x: 210, y: 300 },
  { x: 430, y: 300 },
  { x: 430, y: 120 },
  { x: 660, y: 120 },
  { x: 660, y: 440 },
  { x: 820, y: 440 },
  { x: 820, y: 270 },
  { x: 1010, y: 270 },
];

export const TOWERS = {
  archer: {
    id: "archer",
    name: "Balista Archer",
    cost: 100,
    range: 135,
    damage: 20,
    fireRate: 0.38, // seconds between shots
    projSpeed: 11,
    color: "#06b6d4",
    icon: "Crosshair",
    kind: "single",
    desc: "Rapid single-target bolts. Cheap and reliable.",
  },
  frost: {
    id: "frost",
    name: "Frost Nova",
    cost: 150,
    range: 115,
    damage: 8,
    fireRate: 1.05,
    projSpeed: 0,
    color: "#38bdf8",
    icon: "Snowflake",
    kind: "frost",
    slowMul: 0.5,
    slowDur: 2.2,
    desc: "AoE cold pulse. Slows enemies by 50%.",
  },
  inferno: {
    id: "inferno",
    name: "Inferno Cannon",
    cost: 220,
    range: 150,
    damage: 42,
    fireRate: 1.15,
    projSpeed: 7,
    splash: 58,
    burnDps: 14,
    burnDur: 3,
    color: "#f97316",
    icon: "Flame",
    kind: "splash",
    desc: "Explosive splash + lingering burn damage.",
  },
  tesla: {
    id: "tesla",
    name: "Tesla Coil",
    cost: 300,
    range: 125,
    damage: 26,
    fireRate: 0.8,
    projSpeed: 0,
    chain: 4,
    color: "#a855f7",
    icon: "Zap",
    kind: "chain",
    desc: "Chain lightning arcs to up to 4 targets.",
  },
};

export const TOWER_ORDER = ["archer", "frost", "inferno", "tesla"];

export const HERO_ABILITIES = {
  nuke: {
    id: "nuke",
    name: "Orbital Nuke",
    cooldown: 24,
    icon: "Bomb",
    color: "#ef4444",
    desc: "Catastrophic strike: 260 dmg to every enemy on field.",
  },
  freeze: {
    id: "freeze",
    name: "Polar Wave",
    cooldown: 18,
    icon: "Snowflake",
    color: "#38bdf8",
    desc: "Freezes all enemies solid for 3.5 seconds.",
  },
  heal: {
    id: "heal",
    name: "Nanite Repair",
    cooldown: 28,
    icon: "HeartPulse",
    color: "#10b981",
    desc: "Restores 35 Nexus Base HP instantly.",
  },
};

export const HERO_ORDER = ["nuke", "freeze", "heal"];

// Creep archetypes
export const CREEPS = {
  scout: { key: "scout", name: "Scout Swarm", speed: 66, hp: 46, reward: 8, leak: 4, radius: 11, color: "#94a3b8" },
  brute: { key: "brute", name: "Armored Brute", speed: 34, hp: 190, reward: 22, leak: 10, radius: 15, color: "#eab308" },
  phantom: { key: "phantom", name: "Void Phantom", speed: 54, hp: 95, reward: 15, leak: 6, radius: 12, color: "#c084fc" },
  boss: { key: "boss", name: "GOLIATH TITAN", speed: 22, hp: 1500, reward: 200, leak: 40, radius: 26, color: "#f43f5e", boss: true },
};

export const MAX_WAVE = 20;

// Build a wave's spawn list. Boss every 5 waves.
export function buildWave(wave) {
  const isBoss = wave % 5 === 0;
  const spawns = [];
  const hpMul = 1 + (wave - 1) * 0.2;
  const rewardMul = 1 + (wave - 1) * 0.04;
  const push = (key, n) => {
    for (let i = 0; i < n; i++) spawns.push(key);
  };
  push("scout", 6 + wave * 2);
  if (wave >= 3) push("phantom", Math.floor(wave * 1.2));
  if (wave >= 4) push("brute", Math.floor(wave * 0.8));
  // shuffle a bit
  for (let i = spawns.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [spawns[i], spawns[j]] = [spawns[j], spawns[i]];
  }
  if (isBoss) spawns.push("boss");
  return { spawns, isBoss, hpMul, rewardMul, interval: Math.max(0.35, 0.9 - wave * 0.02) };
}

// Roguelike perk pool
export const PERKS = [
  { id: "range", title: "Eagle Optics", desc: "+18% tower range", icon: "Radar", color: "#06b6d4", rarity: "Common", apply: (m) => (m.rangeMul *= 1.18) },
  { id: "damage", title: "Overcharged Rounds", desc: "+18% tower damage", icon: "Swords", color: "#f59e0b", rarity: "Common", apply: (m) => (m.damageMul *= 1.18) },
  { id: "firerate", title: "Rapid Servos", desc: "+14% attack speed", icon: "Gauge", color: "#06b6d4", rarity: "Common", apply: (m) => (m.fireRateMul *= 0.86) },
  { id: "gold", title: "Bounty Protocol", desc: "+25% gold income", icon: "Coins", color: "#f59e0b", rarity: "Uncommon", apply: (m) => (m.goldMul *= 1.25) },
  { id: "burn", title: "Incendiary Coating", desc: "All towers apply Burn on hit", icon: "Flame", color: "#f97316", rarity: "Rare", apply: (m) => (m.burnOnHit = true) },
  { id: "crit", title: "Precision Targeting", desc: "+12% critical chance (2x dmg)", icon: "Target", color: "#ef4444", rarity: "Uncommon", apply: (m) => (m.critChance += 0.12) },
  { id: "slot", title: "Extra Emplacements", desc: "+2 tower build slots", icon: "LayoutGrid", color: "#8b5cf6", rarity: "Rare", apply: (m) => (m.extraSlots += 2) },
  { id: "hp", title: "Reinforced Nexus", desc: "+30 max Base HP (healed)", icon: "ShieldPlus", color: "#10b981", rarity: "Uncommon", apply: (m, gs) => { gs.maxNexusHP += 30; gs.nexusHP += 30; } },
  { id: "repair", title: "Emergency Repair", desc: "Restore 45 Base HP now", icon: "Wrench", color: "#10b981", rarity: "Common", apply: (m, gs) => { gs.nexusHP = Math.min(gs.maxNexusHP, gs.nexusHP + 45); } },
  { id: "gem", title: "Gem Prospector", desc: "+8% chance to drop a Gem", icon: "Gem", color: "#06b6d4", rarity: "Uncommon", apply: (m) => (m.gemChance += 0.08) },
  { id: "slow", title: "Cryo Amplifier", desc: "Slows last 40% longer", icon: "Snowflake", color: "#38bdf8", rarity: "Common", apply: (m) => (m.slowDurMul *= 1.4) },
  { id: "splash", title: "Wide Payload", desc: "+30% splash radius", icon: "CircleDot", color: "#f97316", rarity: "Uncommon", apply: (m) => (m.splashMul *= 1.3) },
];

export function drawPerks(count = 3, exclude = []) {
  const pool = PERKS.filter((p) => !exclude.includes(p.id));
  const chosen = [];
  const copy = [...pool];
  while (chosen.length < count && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    chosen.push(copy.splice(i, 1)[0]);
  }
  return chosen;
}

export const AFFILIATE_OFFERS = [
  { id: "off1", title: "Install Coin Master", reward: "1,000 Gems", tag: "CPI Offer", cta: "Install & Open", color: "#f59e0b", icon: "Gem" },
  { id: "off2", title: "Complete a 2-min Survey", reward: "600 Gems", tag: "Survey", cta: "Start Survey", color: "#06b6d4", icon: "ClipboardList" },
  { id: "off3", title: "Sign up: Crypto Wallet", reward: "Legendary Dragon Tower", tag: "Signup", cta: "Claim Reward", color: "#a855f7", icon: "Sparkles" },
  { id: "off4", title: "Try Raid Legends (Lvl 10)", reward: "2,500 Gems", tag: "Progression", cta: "Play Now", color: "#10b981", icon: "Swords" },
  { id: "off5", title: "Free Trial: VPN Shield", reward: "800 Gems", tag: "Trial", cta: "Start Trial", color: "#38bdf8", icon: "ShieldPlus" },
  { id: "off6", title: "Watch 3 Rewarded Videos", reward: "300 Gems", tag: "Video", cta: "Watch Now", color: "#ef4444", icon: "Play" },
];
