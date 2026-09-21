const DAILY_CHALLENGES = [
  { id: "iron-tide", name: "Iron Tide", desc: "Raiders have 20% more health, but grant 30% more gold.", hpMul: 1.2, goldMul: 1.3 },
  { id: "swift-march", name: "Swift March", desc: "Raiders move 25% faster. Survive for bonus gems.", speedMul: 1.25, gemReward: 5 },
  { id: "scarce-supplies", name: "Scarce Supplies", desc: "Begin with 100 less gold. Every cleared wave grants 40 gold.", startingGold: -100, waveGold: 40 },
  { id: "arcane-storm", name: "Arcane Storm", desc: "Tower damage is reduced by 12%, but ability cooldowns recover faster.", damageMul: 0.88, cooldownMul: 0.75 },
];

const DAILY_QUESTS = [
  { id: "wave-three", title: "Hold the Line", desc: "Clear 3 waves", target: 3, stat: "wavesCleared", reward: { gems: 40 } },
  { id: "raider-hunt", title: "Raider Hunt", desc: "Defeat 30 raiders", target: 30, stat: "kills", reward: { gems: 50 } },
  { id: "build-five", title: "Raise the Walls", desc: "Place 5 towers", target: 5, stat: "towersPlaced", reward: { gold: 150 } },
];

export const WEEKLY_EVENTS = [
  { id: "overclocked", name: "Overclocked", desc: "All towers attack 10% faster.", fireRateMul: 0.9 },
  { id: "bounty-hunt", name: "Bounty Hunt", desc: "Raiders drop 25% more gold.", goldMul: 1.25 },
  { id: "glass-keep", name: "Glass Keep", desc: "Keep Health is reduced, but gems drop more often.", nexusMul: 0.8, gemChance: 0.12 },
  { id: "blackout", name: "Blackout Protocol", desc: "Hero cooldowns recover 20% faster.", cooldownMul: 0.8 },
];

export const ACHIEVEMENTS = [
  { id: "first-blood", title: "First Blood", desc: "Defeat 1 raider", stat: "kills", target: 1, reward: { gems: 25 } },
  { id: "hold-fast", title: "Hold Fast", desc: "Clear 10 waves", stat: "wavesCleared", target: 10, reward: { gems: 75 } },
  { id: "arsenal", title: "Build the Arsenal", desc: "Place 25 towers", stat: "towersPlaced", target: 25, reward: { soulGems: 1 } },
  { id: "boss-breaker", title: "Boss Breaker", desc: "Win a run", stat: "victories", target: 1, reward: { gems: 150 } },
];

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function hashDay(value) {
  return value.split("").reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7);
}

export function getDailyEngagement(date = new Date()) {
  const key = dayKey(date);
  const challenge = DAILY_CHALLENGES[hashDay(key) % DAILY_CHALLENGES.length];
  const offset = hashDay(`${key}:quests`) % DAILY_QUESTS.length;
  const quests = DAILY_QUESTS.map((quest, index) => DAILY_QUESTS[(offset + index) % DAILY_QUESTS.length]);
  const weekKey = `${date.getUTCFullYear()}-${Math.floor((date - new Date(Date.UTC(date.getUTCFullYear(), 0, 1))) / 604800000)}`;
  const weekly = WEEKLY_EVENTS[hashDay(weekKey) % WEEKLY_EVENTS.length];
  return { key, challenge, quests, weekly };
}

export function emptyDailyProgress(daily = getDailyEngagement()) {
  return {
    key: daily.key,
    challengeId: daily.challenge.id,
    challengeClaimed: false,
    challengeProgress: 0,
    quests: daily.quests.reduce((result, quest) => ({ ...result, [quest.id]: { progress: 0, claimed: false } }), {}),
  };
}

export function emptyAchievementProgress() {
  return {
    stats: { kills: 0, wavesCleared: 0, towersPlaced: 0, victories: 0 },
    claimed: {},
    streak: 0,
    lastRunDate: null,
  };
}

export function normalizeAchievementProgress(progress) {
  const empty = emptyAchievementProgress();
  return {
    ...empty,
    ...(progress || {}),
    stats: { ...empty.stats, ...(progress?.stats || {}) },
    claimed: { ...empty.claimed, ...(progress?.claimed || {}) },
  };
}

export function normalizeDailyProgress(progress, daily = getDailyEngagement()) {
  if (!progress || progress.key !== daily.key) return emptyDailyProgress(daily);
  return {
    ...emptyDailyProgress(daily),
    ...progress,
    quests: { ...emptyDailyProgress(daily).quests, ...(progress.quests || {}) },
  };
}
