// Waves and upgrades. A wave is a spawn queue: types unlock as the waves climb,
// counts grow, and the gaps shrink. Clearing a wave opens the upgrade screen, where
// the player picks one of three upgrades — the choices that shape a run.
import { WISP } from './config.js';

const WAVE_TABLE = [
  { chaser: 6 },
  { chaser: 8, weaver: 3 },
  { chaser: 9, weaver: 4, splitter: 2 },
  { chaser: 10, weaver: 5, splitter: 3, spitter: 2 },
  { chaser: 11, weaver: 6, splitter: 3, spitter: 3 },
  { chaser: 12, weaver: 6, splitter: 4, spitter: 3, dasher: 2 },
  { chaser: 13, weaver: 7, splitter: 4, spitter: 4, dasher: 3 },
  { chaser: 14, weaver: 8, splitter: 5, spitter: 4, dasher: 3 },
  { chaser: 15, weaver: 9, splitter: 5, spitter: 5, dasher: 4 },
  { chaser: 16, weaver: 10, splitter: 6, spitter: 5, dasher: 5 },
];

/** The spawn queue for a wave: shuffled types, one entry per wisp. */
export function waveQueue(wave, rng) {
  const table = WAVE_TABLE[Math.min(wave, WAVE_TABLE.length) - 1];
  const queue = [];
  for (const [type, count] of Object.entries(table)) {
    if (wave >= WISP[type].firstWave) {
      for (let i = 0; i < count; i += 1) queue.push(type);
    }
  }
  // Shuffle so the wave never arrives in one predictable clump.
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

/** Gap between spawns shrinks as the waves climb: 1.15s early, 0.45s by wave 10. */
export function spawnGap(wave) {
  return Math.max(0.45, 1.15 - (wave - 1) * 0.08);
}

export const UPGRADE_POOL = [
  {
    id: 'rapid',
    name: 'Rapid Coil',
    icon: '»»',
    desc: 'Fire 18% faster.',
    apply(p) {
      p.fireInterval *= 0.82;
    },
  },
  {
    id: 'heavy',
    name: 'Heavy Rounds',
    icon: '◆',
    desc: '+1 bullet damage.',
    apply(p) {
      p.bulletDamage += 1;
    },
  },
  {
    id: 'swift',
    name: 'Swift Thrusters',
    icon: '≫',
    desc: '+12% move speed.',
    apply(p) {
      p.speed *= 1.12;
    },
  },
  {
    id: 'magnet',
    name: 'Wide Magnet',
    icon: '◎',
    desc: '+45% mote pull range.',
    apply(p) {
      p.magnet *= 1.45;
      p.magnetLevel += 1;
    },
  },
  {
    id: 'heart',
    name: 'Hull Plate',
    icon: '♥',
    desc: 'Restore 1 heart (max 5).',
    apply(p) {
      p.maxHearts = Math.min(5, p.maxHearts + 1);
      p.hearts = Math.min(p.maxHearts, p.hearts + 1);
    },
  },
  {
    id: 'dash',
    name: 'Coolant Flush',
    icon: '↯',
    desc: 'Dash recharges 35% faster.',
    apply(p) {
      p.dashCooldownBase = (p.dashCooldownBase ?? 1.6) * 0.65;
    },
  },
  {
    id: 'nova',
    name: 'Nova Cell',
    icon: '✦',
    desc: '+1 nova bomb (max 4).',
    apply(p) {
      p.novaMax = Math.min(4, p.novaMax + 1);
      p.novas = Math.min(p.novaMax, p.novas + 1);
    },
  },
  {
    id: 'rich',
    name: 'Rich Veins',
    icon: '✧',
    desc: 'Motes are worth +5.',
    apply(p) {
      p.moteBonus = (p.moteBonus ?? 0) + 5;
    },
  },
];

/** Three distinct upgrades, none repeated from the last offered set if possible. */
export function rollUpgrades(rng, lastIds) {
  const pool = UPGRADE_POOL.filter((u) => !lastIds.includes(u.id));
  const source = pool.length >= 3 ? pool : UPGRADE_POOL;
  const picked = [];
  const copy = [...source];
  while (picked.length < 3 && copy.length > 0) {
    const i = Math.floor(rng.next() * copy.length);
    picked.push(copy.splice(i, 1)[0]);
  }
  return picked;
}
