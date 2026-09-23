export const SIDEVIEW_WORLD = { width: 960, height: 540, laneYs: [150, 270, 390], baseX: 62, spawnX: 918 };

export const NEON_VARIANTS = {
  pink: { id: "pink", name: "Pink", color: "#ff4fa3", speedMul: 1.16, hpMul: 0.84, rewardMul: 0.92 },
  cyan: { id: "cyan", name: "Cyan", color: "#31d7ff", speedMul: 0.92, hpMul: 1.10, rewardMul: 1.08 },
  green: { id: "green", name: "Green", color: "#55ef85", speedMul: 1.00, hpMul: 1.00, rewardMul: 1.00 },
  yellow: { id: "yellow", name: "Yellow", color: "#ffe45e", speedMul: 0.88, hpMul: 1.18, rewardMul: 1.16 },
  orange: { id: "orange", name: "Orange", color: "#ff9f43", speedMul: 1.08, hpMul: 1.06, rewardMul: 1.14 },
  red: { id: "red", name: "Red", color: "#ff5264", speedMul: 0.96, hpMul: 1.34, rewardMul: 1.30 },
  purple: { id: "purple", name: "Purple", color: "#c084fc", speedMul: 1.02, hpMul: 1.18, rewardMul: 1.42 },
};

export const SIDEVIEW_ARCHETYPES = {
  ghost: { id: "ghost", name: "Ghost", speed: 58, hp: 48, reward: 8, leak: 5, radius: 14 },
  goblin: { id: "goblin", name: "Goblin", speed: 48, hp: 78, reward: 11, leak: 6, radius: 15 },
  gnome: { id: "gnome", name: "Gnome", speed: 38, hp: 135, reward: 18, leak: 8, radius: 17 },
  troll: { id: "troll", name: "Troll", speed: 27, hp: 230, reward: 28, leak: 12, radius: 20 },
};

export const SQUAD_ROSTER = [
  { id: "vanguard", name: "Vanguard", role: "Frontline", color: "#fb7185", cooldown: 10, desc: "Intercepts the lead lane and holds pressure." },
  { id: "ranger", name: "Ranger", role: "Priority damage", color: "#67e8f9", cooldown: 8, desc: "Focuses the strongest enemy in range." },
  { id: "arcanist", name: "Arcanist", role: "AoE control", color: "#c084fc", cooldown: 12, desc: "Slows and damages a cluster." },
  { id: "engineer", name: "Engineer", role: "Repair support", color: "#fbbf24", cooldown: 14, desc: "Repairs the base and empowers towers." },
];

export const SIDEVIEW_TOWER_SPOTS = [
  { id: "a1", x: 210, lane: 0 }, { id: "a2", x: 350, lane: 0 }, { id: "b1", x: 280, lane: 1 },
  { id: "b2", x: 470, lane: 1 }, { id: "c1", x: 210, lane: 2 }, { id: "c2", x: 390, lane: 2 },
];

export const SIDEVIEW_TOWER_TYPES = [
  { id: "archer", name: "Archer", cost: 90, range: 175, damage: 25, fireRate: 0.45, color: "#22d3ee" },
  { id: "frost", name: "Frost", cost: 140, range: 145, damage: 12, fireRate: 1.05, color: "#7dd3fc" },
  { id: "inferno", name: "Inferno", cost: 210, range: 180, damage: 48, fireRate: 1.2, color: "#fb923c" },
  { id: "tesla", name: "Tesla", cost: 290, range: 155, damage: 31, fireRate: 0.82, color: "#c084fc" },
];

export const SIDEVIEW_MAX_WAVE = 20;
