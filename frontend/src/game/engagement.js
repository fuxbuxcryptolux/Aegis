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
  return { key, challenge, quests };
}

export function emptyDailyProgress(daily = getDailyEngagement()) {
  return {
    key: daily.key,
    challengeId: daily.challenge.id,
    challengeClaimed: false,
    quests: daily.quests.reduce((result, quest) => ({ ...result, [quest.id]: { progress: 0, claimed: false } }), {}),
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
