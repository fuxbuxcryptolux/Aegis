import { buildSideViewWave, deriveEnemyVariant, advanceLaneEnemy } from "./rules";
import { NEON_VARIANTS } from "./config";

describe("side-view enemy variants", () => {
  test("applies color gameplay modifiers to derived runtime stats", () => {
    const pink = deriveEnemyVariant("ghost", "pink", 1, 0);
    const cyan = deriveEnemyVariant("ghost", "cyan", 1, 0);
    expect(pink.speed).toBeCloseTo(58 * NEON_VARIANTS.pink.speedMul);
    expect(pink.maxHp).toBe(Math.round(48 * NEON_VARIANTS.pink.hpMul));
    expect(cyan.reward).toBe(Math.round(8 * NEON_VARIANTS.cyan.rewardMul));
    expect(pink.id).toBe("ghost_pink");
  });

  test("scales bosses while preserving archetype and variant identity", () => {
    const boss = deriveEnemyVariant("troll", "purple", 5, 1, true);
    expect(boss.boss).toBe(true);
    expect(boss.maxHp).toBeGreaterThan(1000);
    expect(boss.id).toBe("troll_purple");
  });
});

describe("side-view waves and lanes", () => {
  test("introduces archetypes and neon variants progressively", () => {
    const early = buildSideViewWave(1);
    const late = buildSideViewWave(8);
    expect(new Set(early.enemies.map((enemy) => enemy.archetype))).toEqual(new Set(["ghost", "goblin"]));
    expect(new Set(late.enemies.map((enemy) => enemy.archetype))).toEqual(new Set(["ghost", "goblin", "gnome", "troll"]));
    expect(new Set(early.enemies.map((enemy) => enemy.variant)).size).toBeGreaterThan(0);
    expect(new Set(late.enemies.map((enemy) => enemy.variant)).size).toBe(4);
  });

  test("creates a boss every fifth wave and advances enemies toward the keep", () => {
    const wave = buildSideViewWave(5);
    const boss = wave.enemies.find((enemy) => enemy.boss);
    const enemy = deriveEnemyVariant("goblin", "green", 1, 0);
    enemy.x = 500;
    expect(wave.isBoss).toBe(true);
    expect(boss).toBeDefined();
    expect(advanceLaneEnemy(enemy, 1).x).toBeLessThan(500);
  });
});
