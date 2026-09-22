import { SIDEVIEW_ARCHETYPES } from "./config";

export function drawNeonEnemy(ctx, enemy, x, y, scale = 1) {
  const color = enemy.color;
  const radius = enemy.radius * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = color;
  ctx.shadowBlur = enemy.boss ? 24 : 12;
  ctx.strokeStyle = color;
  ctx.fillStyle = `${color}33`;
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.beginPath();
  if (enemy.archetype === "ghost") {
    ctx.moveTo(-radius, radius * 0.8);
    ctx.lineTo(-radius, -radius * 0.35);
    ctx.quadraticCurveTo(0, -radius * 1.35, radius, -radius * 0.35);
    ctx.lineTo(radius, radius * 0.8);
    ctx.lineTo(radius * 0.45, radius * 0.4);
    ctx.lineTo(0, radius * 0.85);
    ctx.lineTo(-radius * 0.45, radius * 0.4);
  } else if (enemy.archetype === "goblin") {
    ctx.moveTo(-radius, radius); ctx.lineTo(-radius * 0.8, -radius * 0.65); ctx.lineTo(-radius * 0.25, -radius * 0.25);
    ctx.lineTo(0, -radius * 1.2); ctx.lineTo(radius * 0.25, -radius * 0.25); ctx.lineTo(radius * 0.8, -radius * 0.65); ctx.lineTo(radius, radius); ctx.closePath();
  } else if (enemy.archetype === "gnome") {
    ctx.moveTo(-radius, radius); ctx.lineTo(-radius * 0.8, -radius * 0.25); ctx.lineTo(0, -radius * 1.35); ctx.lineTo(radius * 0.8, -radius * 0.25); ctx.lineTo(radius, radius); ctx.closePath();
  } else {
    ctx.roundRect(-radius, -radius * 0.85, radius * 2, radius * 1.85, radius * 0.3);
    ctx.moveTo(-radius * 0.65, -radius * 0.9); ctx.lineTo(-radius * 0.35, -radius * 1.35); ctx.moveTo(radius * 0.45, -radius * 0.9); ctx.lineTo(radius * 0.7, -radius * 1.3);
  }
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(-radius * 0.35, -radius * 0.2, Math.max(2, scale * 2), 0, Math.PI * 2); ctx.arc(radius * 0.35, -radius * 0.2, Math.max(2, scale * 2), 0, Math.PI * 2); ctx.fill();
  if (enemy.boss) { ctx.strokeStyle = "#fff"; ctx.globalAlpha = 0.7; ctx.strokeRect(-radius * 1.35, -radius * 1.55, radius * 2.7, radius * 3); }
  ctx.restore();
}

export function enemyLabel(enemy) {
  return `${enemy.variant} ${SIDEVIEW_ARCHETYPES[enemy.archetype]?.name || enemy.archetype}`;
}
