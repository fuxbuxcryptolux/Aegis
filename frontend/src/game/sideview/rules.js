import { NEON_VARIANTS, SIDEVIEW_ARCHETYPES, SIDEVIEW_MAX_WAVE } from "./config";

export function deriveEnemyVariant(archetypeId, variantId, wave = 1, lane = 0, boss = false) {
  const archetype = SIDEVIEW_ARCHETYPES[archetypeId];
  const variant = NEON_VARIANTS[variantId];
  if (!archetype || !variant) throw new Error(`Unknown side-view enemy: ${archetypeId}/${variantId}`);
  const waveMul = 1 + Math.max(0, wave - 1) * 0.12;
  const bossMul = boss ? 3.2 : 1;
  return {
    id: `${archetypeId}_${variantId}`,
    archetype: archetypeId,
    variant: variantId,
    name: `${variant.name} ${archetype.name}`,
    lane,
    boss,
    speed: archetype.speed * variant.speedMul,
    maxHp: Math.round(archetype.hp * waveMul * variant.hpMul * bossMul),
    hp: Math.round(archetype.hp * waveMul * variant.hpMul * bossMul),
    reward: Math.max(1, Math.round(archetype.reward * variant.rewardMul * (boss ? 5 : 1))),
    leak: Math.round(archetype.leak * (boss ? 2 : 1)),
    radius: archetype.radius * (boss ? 1.35 : 1),
    x: 0,
    slow: 0,
  };
}

export function buildSideViewWave(wave) {
  const safeWave = Math.max(1, Math.min(SIDEVIEW_MAX_WAVE, wave));
  const archetypes = safeWave < 3 ? ["ghost", "goblin"] : safeWave < 6 ? ["ghost", "goblin", "gnome"] : ["ghost", "goblin", "gnome", "zombie"];
  const variantCount = Math.min(7, 1 + Math.floor((safeWave - 1) / 2));
  const variantIds = Object.keys(NEON_VARIANTS).slice(0, variantCount);
  const enemies = [];
  const count = 5 + safeWave * 2;
  for (let index = 0; index < count; index += 1) {
    const archetype = archetypes[index % archetypes.length];
    const variant = variantIds[(index + safeWave) % variantIds.length];
    enemies.push({ archetype, variant, lane: index % 3, boss: false });
  }
  const isBoss = safeWave % 5 === 0;
  if (isBoss) enemies.push({ archetype: archetypes[safeWave % archetypes.length], variant: variantIds[variantIds.length - 1], lane: 1, boss: true });
  return { wave: safeWave, isBoss, interval: Math.max(0.35, 0.9 - safeWave * 0.018), enemies };
}

export function advanceLaneEnemy(enemy, delta, laneLength = 850) {
  const distance = enemy.speed * Math.max(0, delta) * (enemy.slow > 0 ? 0.5 : 1);
  return { ...enemy, x: enemy.x - distance, slow: Math.max(0, enemy.slow - delta) };
}

export function squadCommand(role, state) {
  const next = { ...state, commandLog: [...(state.commandLog || []), role] };
  if (role === "vanguard") next.hold = Math.min(4, (state.hold || 0) + 2);
  if (role === "ranger") next.rangerBurst = 90;
  if (role === "arcanist") next.control = 4;
  if (role === "engineer") next.repair = 22;
  return next;
}
