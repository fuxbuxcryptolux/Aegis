import { getBossSpriteLookup, getEnemySpriteLookup, getSquadSpriteLookup, getTurretSpriteLookup } from "./enemySprites";

const variants = ["pink", "cyan", "green", "yellow", "orange", "red", "purple"];
const enemies = ["ghost", "goblin", "gnome", "troll"];
const squad = ["blacksmith", "arcanist", "ranger", "vanguard"];
const turrets = ["archer_tower", "mage_tower", "ballista_tower", "frost_tower", "poison_tower", "lightning_tower", "fire_tower", "heal_tower", "barrier_tower"];

describe("manifest-driven runtime sprite lookup", () => {
  test("resolves every supplied enemy variant column", () => {
    enemies.forEach((enemy) => variants.forEach((variant, column) => expect(getEnemySpriteLookup(enemy, variant)).toMatchObject({ column })));
    expect(getEnemySpriteLookup("missing", "pink")).toBeNull();
    expect(getEnemySpriteLookup("ghost", "missing")).toBeNull();
  });

  test("resolves Demon Lord and Castle Squad assets", () => {
    expect(getBossSpriteLookup()).toMatchObject({ file: "sprites/bosses/demon_lord.png", pose: expect.any(String) });
    squad.forEach((role, column) => expect(getSquadSpriteLookup(role)).toMatchObject({ column }));
    expect(getSquadSpriteLookup("missing")).toBeNull();
  });

  test("resolves all nine turret atlas assets", () => {
    turrets.forEach((turret, column) => expect(getTurretSpriteLookup(turret)).toMatchObject({ column }));
    expect(getTurretSpriteLookup("missing")).toBeNull();
  });
});