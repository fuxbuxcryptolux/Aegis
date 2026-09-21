// Static game configuration: world, path, towers, heroes, creeps, perks.

export const WORLD_W = 960;
export const WORLD_H = 560;
export const GRID = 40;

// Each level uses a different route through the same illustrated world.
const LEVEL_PATHS = [
  [
    [-40, 100], [180, 100], [180, 250], [390, 250], [390, 430],
    [610, 430], [610, 160], [820, 160], [820, 360], [1010, 360],
  ],
  [
    [-40, 80], [170, 80], [170, 460], [370, 460], [370, 100],
    [570, 100], [570, 460], [780, 460], [780, 260], [1010, 260],
  ],
  [
    [-40, 80], [120, 80], [120, 480], [840, 480], [840, 80], [1010, 80],
  ],
  [
    [-40, 280], [120, 280], [120, 100], [840, 100], [840, 460],
    [260, 460], [260, 200], [700, 200], [700, 360], [420, 360],
    [420, 280], [1010, 280],
  ],
];

export function generateLevelPath(level, canvasWidth = WORLD_W, canvasHeight = WORLD_H) {
  const preset = LEVEL_PATHS[(Math.max(1, level) - 1) % LEVEL_PATHS.length];
  const scaleX = canvasWidth / WORLD_W;
  const scaleY = canvasHeight / WORLD_H;
  return preset.map(([x, y]) => ({ x: x * scaleX, y: y * scaleY }));
}

// Backward-compatible level-one route for callers that only need a default map.
export const PATH = generateLevelPath(1, WORLD_W, WORLD_H);

export const TOWERS = {
  archer: {
    id: "archer",
    name: "Balista Archer",
    cost: 90,
    range: 140,
    damage: 24,
    fireRate: 0.35,
    projSpeed: 11,
    color: "#06b6d4",
    icon: "Crosshair",
    kind: "single",
    desc: "Rapid single-target bolts. Cheap and reliable.",
  },
  frost: {
    id: "frost",
    name: "Frost Nova",
    cost: 140,
    range: 120,
    damage: 10,
    fireRate: 0.95,
    projSpeed: 0,
    color: "#38bdf8",
    icon: "Snowflake",
    kind: "frost",
    slowMul: 0.5,
    slowDur: 2.4,
    desc: "AoE cold pulse. Slows enemies by 50%.",
  },
  inferno: {
    id: "inferno",
    name: "Inferno Cannon",
    cost: 210,
    range: 155,
    damage: 46,
    fireRate: 1.1,
    projSpeed: 7,
    splash: 60,
    burnDps: 14,
    burnDur: 3,
    color: "#f97316",
    icon: "Flame",
    kind: "splash",
    desc: "Explosive splash + lingering burn damage.",
  },
  tesla: {
    id: "tesla",
    name: "Storm Spire",
    cost: 290,
    range: 128,
    damage: 28,
    fireRate: 0.75,
    projSpeed: 0,
    chain: 4,
    color: "#a855f7",
    icon: "Zap",
    kind: "chain",
    desc: "Storm arcs leap between up to 4 raiders.",
  },
};

export const TOWER_ORDER = ["archer", "frost", "inferno", "tesla"];

export const TOWER_SPECIALIZATIONS = {
  archer: [
    { id: "longbow", name: "Longbow", desc: "+22% range", rangeMul: 1.22 },
    { id: "quickdraw", name: "Quickdraw", desc: "+18% attack speed", fireRateMul: 0.82 },
  ],
  frost: [
    { id: "deepfreeze", name: "Deepfreeze", desc: "+35% slow duration", slowDurMul: 1.35 },
    { id: "glacier", name: "Glacier", desc: "+25% damage", damageMul: 1.25 },
  ],
  inferno: [
    { id: "dragonfire", name: "Dragonfire", desc: "+30% damage", damageMul: 1.3 },
    { id: "wideburst", name: "Wideburst", desc: "+35% splash radius", splashMul: 1.35 },
  ],
  tesla: [
    { id: "stormchain", name: "Stormchain", desc: "+2 chain targets", chainBonus: 2 },
    { id: "thunderhead", name: "Thunderhead", desc: "+24% damage", damageMul: 1.24 },
  ],
};

export const HERO_ABILITIES = {
  nuke: {
    id: "nuke",
    name: "Meteor Hammer",
    cooldown: 24,
    icon: "Bomb",
    color: "#ef4444",
    desc: "A falling star deals 260 damage to every raider.",
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
    name: "Herbal Remedy",
    cooldown: 28,
    icon: "HeartPulse",
    color: "#10b981",
    desc: "Restores 35 Keep Health instantly.",
  },
};

export const HERO_ORDER = ["nuke", "freeze", "heal"];

// Creep archetypes
export const CREEPS = {
  scout: { key: "scout", name: "Scout Swarm", speed: 66, hp: 46, reward: 8, leak: 4, radius: 11, color: "#94a3b8" },
  walker: { key: "walker", name: "Lurching Walker", speed: 52, hp: 70, reward: 12, leak: 5, radius: 12, color: "#84cc16" },
  brute: { key: "brute", name: "Armored Brute", speed: 34, hp: 190, reward: 22, leak: 10, radius: 15, color: "#eab308" },
  spewer: { key: "spewer", name: "Spewer Bile", speed: 48, hp: 116, reward: 20, leak: 7, radius: 13, color: "#22c55e" },
  phantom: { key: "phantom", name: "Void Phantom", speed: 54, hp: 95, reward: 15, leak: 6, radius: 12, color: "#c084fc" },
  mutant: { key: "mutant", name: "Mutant Runner", speed: 72, hp: 140, reward: 28, leak: 9, radius: 14, color: "#f97316" },
  boss: { key: "boss", name: "GOLIATH TITAN", speed: 22, hp: 1500, reward: 200, leak: 40, radius: 26, color: "#f43f5e", boss: true },
  zombie_king: { key: "zombie_king", name: "ZOMBIE KING", speed: 26, hp: 2200, reward: 360, leak: 48, radius: 30, color: "#f59e0b", boss: true },
  graverobber: { key: "graverobber", name: "Plague Graverobber", speed: 50, hp: 110, reward: 18, leak: 6, radius: 12, color: "#facc15" },
  overcharger: { key: "overcharger", name: "Galvanized Ghoul", speed: 72, hp: 130, reward: 24, leak: 8, radius: 13, color: "#a5f3fc" },
  necroparasite: { key: "necroparasite", name: "Necro-Parasite", speed: 62, hp: 170, reward: 32, leak: 9, radius: 11, color: "#d946ef" },
};

export const MAX_WAVE = 20;

// Build a wave's spawn list. Boss every 5 waves.
export function buildWave(wave) {
  const isBoss = wave % 5 === 0;
  const spawns = [];
  const hpMul = 1 + (wave - 1) * 0.14;
  const rewardMul = 1 + (wave - 1) * 0.04;
  const push = (key, n) => {
    for (let i = 0; i < n; i++) spawns.push(key);
  };
  push("scout", 4 + Math.max(0, wave - 1));
  if (wave >= 2) push("walker", Math.floor(wave * 0.9));
  if (wave >= 3) push("phantom", Math.floor(wave * 0.9));
  if (wave >= 4) push("brute", Math.floor(wave * 0.55));
  if (wave >= 6) push("spewer", Math.floor(wave * 0.52));
  if (wave >= 8) push("mutant", Math.floor(wave * 0.48));
  for (let i = spawns.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [spawns[i], spawns[j]] = [spawns[j], spawns[i]];
  }
  if (isBoss) spawns.push(wave >= 10 ? "zombie_king" : "boss");
  return { spawns, isBoss, hpMul, rewardMul, interval: Math.max(0.36, 0.92 - wave * 0.02) };
}

// Roguelike perk pool
export const PERKS = [
  { id: "range", title: "Eagle Optics", desc: "+18% tower range", icon: "Radar", color: "#06b6d4", rarity: "Common", apply: (m) => (m.rangeMul *= 1.18) },
  { id: "damage", title: "Runic Ammunition", desc: "+18% tower damage", icon: "Swords", color: "#f59e0b", rarity: "Common", apply: (m) => (m.damageMul *= 1.18) },
  { id: "firerate", title: "Wind Runner's Haste", desc: "+14% attack speed", icon: "Gauge", color: "#06b6d4", rarity: "Common", apply: (m) => (m.fireRateMul *= 0.86) },
  { id: "gold", title: "Bounty Charter", desc: "+25% gold income", icon: "Coins", color: "#f59e0b", rarity: "Uncommon", apply: (m) => (m.goldMul *= 1.25) },
  { id: "burn", title: "Incendiary Coating", desc: "All towers apply Burn on hit", icon: "Flame", color: "#f97316", rarity: "Rare", apply: (m) => (m.burnOnHit = true) },
  { id: "crit", title: "Sure-Handed Aim", desc: "+12% critical chance (2x dmg)", icon: "Target", color: "#ef4444", rarity: "Uncommon", apply: (m) => (m.critChance += 0.12) },
  { id: "slot", title: "Extra Battlements", desc: "+2 tower build slots", icon: "LayoutGrid", color: "#8b5cf6", rarity: "Rare", apply: (m) => (m.extraSlots += 2) },
  { id: "hp", title: "Fortified Keep", desc: "+30 max Keep Health (healed)", icon: "ShieldPlus", color: "#10b981", rarity: "Uncommon", apply: (m, gs) => { gs.maxNexusHP += 30; gs.nexusHP += 30; } },
  { id: "repair", title: "Mason's Fortification", desc: "Restore 45 Keep Health now", icon: "Wrench", color: "#10b981", rarity: "Common", apply: (m, gs) => { gs.nexusHP = Math.min(gs.maxNexusHP, gs.nexusHP + 45); } },
  { id: "gem", title: "Gem Prospector", desc: "+8% chance to drop a Gem", icon: "Gem", color: "#06b6d4", rarity: "Uncommon", apply: (m) => (m.gemChance += 0.08) },
  { id: "slow", title: "Winter's Patience", desc: "Slows last 40% longer", icon: "Snowflake", color: "#38bdf8", rarity: "Common", apply: (m) => (m.slowDurMul *= 1.4) },
  { id: "splash", title: "Broadside Powder", desc: "+30% splash radius", icon: "CircleDot", color: "#f97316", rarity: "Uncommon", apply: (m) => (m.splashMul *= 1.3) },
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
