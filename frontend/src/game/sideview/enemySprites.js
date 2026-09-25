import manifest from "./manifest.json";
import { SIDEVIEW_ARCHETYPES } from "./config";

const imageCache = new Map();

function loadImage(file) {
  if (imageCache.has(file)) return imageCache.get(file);
  if (typeof Image === "undefined") return null;
  const image = new Image();
  image.src = `/${file}`;
  imageCache.set(file, image);
  return image;
}

export function getEnemySpriteLookup(archetype, variant) {
  const atlas = manifest.enemy_atlases[archetype];
  if (!atlas) return null;
  const column = atlas.variantColumns.indexOf(variant);
  return column < 0 ? null : { file: atlas.file, cellWidth: atlas.cellWidth, cellHeight: atlas.cellHeight, column };
}

export function getBossSpriteLookup() {
  return manifest.bosses.demon_lord;
}

export function getSquadSpriteLookup(role) {
  const column = manifest.squad.columns.indexOf(role);
  return column < 0 ? null : { file: manifest.squad.file, cellWidth: manifest.squad.cellWidth, cellHeight: manifest.squad.cellHeight, column };
}

export function getTurretSpriteLookup(type) {
  const turretId = { archer: "archer_tower", frost: "frost_tower", inferno: "fire_tower", tesla: "lightning_tower" }[type] || type;
  const column = manifest.turrets.columns.indexOf(turretId);
  return column < 0 ? null : { file: manifest.turrets.file, cellWidth: manifest.turrets.cellWidth, cellHeight: manifest.turrets.cellHeight, column };
}

function drawAtlasCell(ctx, lookup, x, y, width, height) {
  const image = loadImage(lookup.file);
  if (!image || !image.complete || image.naturalWidth === 0) return false;
  ctx.drawImage(image, lookup.column * lookup.cellWidth, 0, lookup.cellWidth, lookup.cellHeight, x - width / 2, y - height, width, height);
  return true;
}

function drawStandalone(ctx, lookup, x, y, width, height) {
  const image = loadImage(lookup.file);
  if (!image || !image.complete || image.naturalWidth === 0) return false;
  ctx.drawImage(image, x - width / 2, y - height, width, height);
  return true;
}

export function drawNeonEnemy(ctx, enemy, x, y, scale = 1) {
  const lookup = enemy.boss ? getBossSpriteLookup() : getEnemySpriteLookup(enemy.archetype, enemy.variant);
  const width = (enemy.boss ? 92 : enemy.radius * 2.8) * scale;
  const height = (enemy.boss ? 126 : enemy.radius * 2.8) * scale;
  if (lookup && (enemy.boss ? drawStandalone(ctx, lookup, x, y + enemy.radius, width, height) : drawAtlasCell(ctx, lookup, x, y + enemy.radius, width, height))) return;
  drawProceduralEnemy(ctx, enemy, x, y, scale);
}

export function drawTowerSprite(ctx, tower, x, y, width = 58, height = 58) {
  const lookup = getTurretSpriteLookup(tower.type);
  return Boolean(lookup && drawAtlasCell(ctx, lookup, x, y + height / 2, width, height));
}

export function drawSquadSprite(ctx, role, x, y, width = 54, height = 54) {
  const lookup = getSquadSpriteLookup(role);
  return Boolean(lookup && drawAtlasCell(ctx, lookup, x, y + height / 2, width, height));
}

export function drawProceduralEnemy(ctx, enemy, x, y, scale = 1) {
  const color = enemy.color;
  const radius = enemy.radius * scale;
  ctx.save(); ctx.translate(x, y); ctx.shadowColor = color; ctx.shadowBlur = enemy.boss ? 24 : 12; ctx.strokeStyle = color; ctx.fillStyle = `${color}33`; ctx.lineWidth = Math.max(2, 3 * scale); ctx.beginPath();
  if (enemy.archetype === "ghost") {
    ctx.moveTo(-radius, radius * 0.8); ctx.lineTo(-radius, -radius * 0.35); ctx.quadraticCurveTo(0, -radius * 1.35, radius, -radius * 0.35); ctx.lineTo(radius, radius * 0.8); ctx.lineTo(radius * 0.45, radius * 0.4); ctx.lineTo(0, radius * 0.85); ctx.lineTo(-radius * 0.45, radius * 0.4);
  } else if (enemy.archetype === "goblin") {
    ctx.moveTo(-radius, radius); ctx.lineTo(-radius * 0.8, -radius * 0.65); ctx.lineTo(-radius * 0.25, -radius * 0.25); ctx.lineTo(0, -radius * 1.2); ctx.lineTo(radius * 0.25, -radius * 0.25); ctx.lineTo(radius * 0.8, -radius * 0.65); ctx.lineTo(radius, radius); ctx.closePath();
  } else if (enemy.archetype === "gnome") {
    ctx.moveTo(-radius, radius); ctx.lineTo(-radius * 0.8, -radius * 0.25); ctx.lineTo(0, -radius * 1.35); ctx.lineTo(radius * 0.8, -radius * 0.25); ctx.lineTo(radius, radius); ctx.closePath();
  } else {
    ctx.roundRect(-radius, -radius * 0.85, radius * 2, radius * 1.85, radius * 0.3); ctx.moveTo(-radius * 0.65, -radius * 0.9); ctx.lineTo(-radius * 0.35, -radius * 1.35); ctx.moveTo(radius * 0.45, -radius * 0.9); ctx.lineTo(radius * 0.7, -radius * 1.3);
  }
  ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(-radius * 0.35, -radius * 0.2, Math.max(2, scale * 2), 0, Math.PI * 2); ctx.arc(radius * 0.35, -radius * 0.2, Math.max(2, scale * 2), 0, Math.PI * 2); ctx.fill();
  if (enemy.boss) { ctx.strokeStyle = "#fff"; ctx.globalAlpha = 0.7; ctx.strokeRect(-radius * 1.35, -radius * 1.55, radius * 2.7, radius * 3); } ctx.restore();
}

export function enemyLabel(enemy) {
  return `${enemy.variant} ${SIDEVIEW_ARCHETYPES[enemy.archetype]?.name || enemy.archetype}`;
}
