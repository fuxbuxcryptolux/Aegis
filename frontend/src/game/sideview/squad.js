import { SQUAD_ROSTER } from "./config";

export function createSquadState() {
  return Object.fromEntries(SQUAD_ROSTER.map((unit) => [unit.id, { cooldown: 0, ready: true }]));
}

export function tickSquad(squad, delta) {
  return Object.fromEntries(Object.entries(squad).map(([id, unit]) => {
    const cooldown = Math.max(0, unit.cooldown - delta);
    return [id, { cooldown, ready: cooldown === 0 }];
  }));
}

export function issueSquadCommand(squad, role) {
  const unit = SQUAD_ROSTER.find((entry) => entry.id === role);
  if (!unit || !squad[role]?.ready) return { squad, accepted: false };
  return { squad: { ...squad, [role]: { cooldown: unit.cooldown, ready: false } }, accepted: true };
}
