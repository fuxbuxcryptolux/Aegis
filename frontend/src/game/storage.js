// LocalStorage persistence for in-run progress + permanent meta (soul gems).
import { emptyDailyProgress, getDailyEngagement, normalizeDailyProgress } from "./engagement";
const SAVE_KEY = "aegis_rogue_save_v1";
const META_KEY = "aegis_rogue_meta_v1";

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {}
}

export function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : { soulGems: 0, bestWave: 0, prestigeLevel: 0, playerName: "", daily: emptyDailyProgress() };
  } catch {
    return { soulGems: 0, bestWave: 0, prestigeLevel: 0, playerName: "", daily: emptyDailyProgress() };
  }
}

export function loadDailyMeta(meta = loadMeta()) {
  const daily = getDailyEngagement();
  meta.daily = normalizeDailyProgress(meta.daily, daily);
  return { meta, daily };
}

export function writeMeta(meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {}
}
