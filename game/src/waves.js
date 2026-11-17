// Waves and upgrades. A wave is a spawn queue: types unlock as the waves climb,
// counts grow, and the gaps shrink. Clearing a wave opens the upgrade screen,
// where the player picks one of three upgrades — the choices that shape a run.
// Each realm runs its own table: Ember is aggressive (dashers and spitters early),
// Frost swarms slow weavers and splitters, Void is the balanced original, the
// Storm Reef leads with snipers and orbiters, and the Aurora Tide mixes every
// wisp type under its ribbons. Wave 10 of every realm is the boss: the realm's
// boss plus a small escort. From wave 5 on, the armored warden joins every table.
import { WISP } from './config.js';

const WAVE_TABLES = {
  ember: [
    { chaser: 5, spitter: 1 },
    { chaser: 8, weaver: 2, spitter: 2 },
    { chaser: 9, weaver: 3, splitter: 2, spitter: 2 },
    { chaser: 10, weaver: 4, splitter: 3, spitter: 3, dasher: 1 },
    { chaser: 11, weaver: 5, splitter: 3, spitter: 3, dasher: 2, warden: 1 },
    { chaser: 12, weaver: 5, splitter: 4, spitter: 3, dasher: 2, warden: 1 },
    { chaser: 13, weaver: 6, splitter: 4, spitter: 4, dasher: 3, warden: 1 },
    { chaser: 14, weaver: 7, splitter: 5, spitter: 3, dasher: 3, warden: 2 },
    { chaser: 15, weaver: 8, splitter: 5, spitter: 5, dasher: 4, warden: 2 },
  ],
  frost: [
    { chaser: 4, weaver: 2 },
    { chaser: 7, weaver: 4, splitter: 1 },
    { chaser: 8, weaver: 5, splitter: 3 },
    { chaser: 9, weaver: 6, splitter: 4, spitter: 2 },
    { chaser: 10, weaver: 7, splitter: 4, spitter: 2, dasher: 1, warden: 1 },
    { chaser: 11, weaver: 8, splitter: 5, spitter: 3, dasher: 2, warden: 1 },
    { chaser: 12, weaver: 9, splitter: 5, spitter: 3, dasher: 3, warden: 1 },
    { chaser: 13, weaver: 9, splitter: 6, spitter: 4, dasher: 3, warden: 2 },
    { chaser: 14, weaver: 10, splitter: 6, spitter: 4, dasher: 4, warden: 2 },
  ],
  void: [
    { chaser: 5 },
    { chaser: 8, weaver: 3 },
    { chaser: 9, weaver: 4, splitter: 2 },
    { chaser: 10, weaver: 5, splitter: 3, spitter: 2 },
    { chaser: 11, weaver: 6, splitter: 3, spitter: 3, warden: 1 },
    { chaser: 12, weaver: 6, splitter: 4, spitter: 3, dasher: 2, warden: 1 },
    { chaser: 13, weaver: 7, splitter: 4, spitter: 4, dasher: 3, warden: 1 },
    { chaser: 14, weaver: 8, splitter: 5, spitter: 4, dasher: 3, warden: 2 },
    { chaser: 15, weaver: 9, splitter: 5, spitter: 5, dasher: 4, warden: 2 },
  ],
  storm: [
    { chaser: 4, sniper: 1 },
    { chaser: 7, weaver: 2, sniper: 1 },
    { chaser: 8, weaver: 3, splitter: 2, sniper: 2 },
    { chaser: 9, weaver: 4, splitter: 2, sniper: 2, orbiter: 1 },
    { chaser: 10, weaver: 5, splitter: 3, spitter: 2, sniper: 2, orbiter: 2, warden: 1 },
    { chaser: 11, weaver: 6, splitter: 3, spitter: 3, sniper: 2, orbiter: 2, dasher: 1, warden: 1 },
    { chaser: 12, weaver: 6, splitter: 4, spitter: 3, sniper: 3, orbiter: 2, dasher: 2, warden: 1 },
    { chaser: 13, weaver: 7, splitter: 4, spitter: 4, sniper: 3, orbiter: 3, dasher: 2, warden: 2 },
    { chaser: 14, weaver: 8, splitter: 5, spitter: 4, sniper: 3, orbiter: 3, dasher: 3, warden: 2 },
  ],
  aurora: [
    { chaser: 5, weaver: 1 },
    { chaser: 6, weaver: 3, sniper: 1 },
    { chaser: 7, weaver: 4, splitter: 2, sniper: 1 },
    { chaser: 8, weaver: 5, splitter: 3, spitter: 2, sniper: 2, orbiter: 1 },
    { chaser: 9, weaver: 5, splitter: 3, spitter: 3, sniper: 2, orbiter: 1, warden: 1 },
    { chaser: 10, weaver: 6, splitter: 4, spitter: 3, sniper: 2, orbiter: 2, dasher: 1, warden: 1 },
    { chaser: 11, weaver: 6, splitter: 4, spitter: 3, sniper: 3, orbiter: 2, dasher: 2, warden: 1 },
    { chaser: 12, weaver: 7, splitter: 5, spitter: 4, sniper: 3, orbiter: 3, dasher: 2, warden: 2 },
    { chaser: 13, weaver: 8, splitter: 5, spitter: 4, sniper: 3, orbiter: 3, dasher: 3, warden: 2 },
  ],
};

/** The spawn queue for a wave in a realm: shuffled types, one entry per wisp. */
export function waveQueue(wave, rng, realmId) {
  if (wave >= 10) return ['boss', 'orbiter', 'mini', 'mini', 'chaser', 'chaser'];
  const table = (WAVE_TABLES[realmId] ?? WAVE_TABLES.void)[Math.min(wave, 9) - 1];
  const queue = [];
  for (const [type, count] of Object.entries(table)) {
    if (wave >= WISP[type].firstWave) {
      for (let i = 0; i < count; i += 1) queue.push(type);
    }
  }
  // Shuffle so the wave never arrives in one predictable clump.
  return rng.shuffle(queue);
}

/** Gap between spawns shrinks as the waves climb: 1.15s early, 0.5s by wave 10. */
export function spawnGap(wave) {
  return Math.max(0.5, 1.15 - (wave - 1) * 0.08);
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
  {
    id: 'pierce',
    name: 'Piercing Rounds',
    icon: '➶',
    desc: 'Bullets pierce +1 wisp.',
    apply(p) {
      p.pierce = (p.pierce ?? 0) + 1;
    },
  },
  {
    id: 'chain',
    name: 'Chain Coil',
    icon: 'ϟ',
    desc: 'Every 6th kill zaps a wisp.',
    apply(p) {
      p.chain = true;
    },
  },
  {
    id: 'overdrive',
    name: 'Overdrive Cell',
    icon: '✪',
    desc: 'Overdrive lasts +2s, fills faster.',
    apply(p) {
      p.overdriveDuration = (p.overdriveDuration ?? 5) + 2;
      p.overdriveFill = (p.overdriveFill ?? 1) * 1.3;
    },
  },
  {
    id: 'aegis',
    name: 'Aegis Plating',
    icon: '⛨',
    desc: 'A shield blocks one hit per wave.',
    apply(p) {
      p.aegis = true;
      p.shield = 1;
    },
  },
  {
    id: 'twin',
    name: 'Twin Shot',
    icon: '✕',
    desc: 'Fire a second bullet at a spread.',
    apply(p) {
      p.twin = true;
    },
  },
  {
    id: 'vessel',
    name: 'Heart Vessel',
    icon: '♥+',
    desc: '+1 max heart and heal 1.',
    apply(p) {
      p.maxHearts = Math.min(6, p.maxHearts + 1);
      p.hearts = Math.min(p.maxHearts, p.hearts + 1);
    },
  },
  {
    id: 'greed',
    name: 'Lumen Greed',
    icon: '❖',
    desc: 'Motes +10 value, more golden motes.',
    apply(p) {
      p.moteBonus = (p.moteBonus ?? 0) + 10;
      p.goldenBoost = true;
    },
  },
  {
    id: 'chain2',
    name: 'Chain Coil II',
    icon: 'ϟϟ',
    desc: 'Chain lightning every 4th kill.',
    apply(p) {
      p.chain = true;
      p.chainEvery = 4;
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
