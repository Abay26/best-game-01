// Lumen Harvest — the save: best scores per realm, which realms are cleared, and
// the lifetime tally. One JSON blob in localStorage; a run that ends, won or lost,
// records itself, so the map, the bests and the campaign tally survive a reload.
export const SAVE_KEY = 'lumen-harvest-save-v2';

export function blankSave() {
  return { best: {}, cleared: [], kills: 0, motes: 0, runs: 0, wins: 0 };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return blankSave();
    const parsed = JSON.parse(raw);
    const save = blankSave();
    if (parsed && typeof parsed === 'object') {
      if (parsed.best && typeof parsed.best === 'object') {
        for (const [k, v] of Object.entries(parsed.best)) {
          if (typeof v === 'number' && Number.isFinite(v)) save.best[k] = Math.max(0, Math.floor(v));
        }
      }
      if (Array.isArray(parsed.cleared)) save.cleared = parsed.cleared.filter((c) => typeof c === 'string');
      for (const k of ['kills', 'motes', 'runs', 'wins']) {
        if (typeof parsed[k] === 'number' && Number.isFinite(parsed[k])) save[k] = Math.max(0, Math.floor(parsed[k]));
      }
    }
    return save;
  } catch {
    return blankSave();
  }
}

export function storeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage can be off: the save then lasts this visit only.
  }
}

/** Best score ever in one realm, or 0. */
export function realmBest(save, realmId) {
  return save.best[realmId] ?? 0;
}

/** Best score across all realms, or 0. */
export function overallBest(save) {
  let best = 0;
  for (const v of Object.values(save.best)) best = Math.max(best, v);
  return best;
}

/** A realm opens once the realms before it are cleared. */
export function isUnlocked(save, realm) {
  return save.cleared.length >= realm.unlock;
}

/** Fold one finished run into the save and store it. */
export function recordRun(save, realmId, result) {
  save.runs += 1;
  save.kills += result.kills;
  save.motes += result.motes;
  if (result.score > realmBest(save, realmId)) save.best[realmId] = result.score;
  if (result.won) {
    save.wins += 1;
    if (!save.cleared.includes(realmId)) save.cleared.push(realmId);
  }
  storeSave(save);
  return save;
}
