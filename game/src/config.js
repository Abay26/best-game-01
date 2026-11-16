// Lumen Harvest — tuning constants and palette. One place for every number the
// game balances on, so the feel can be tuned without touching the rules.
export const VIEW = { width: 960, height: 600 };
export const STEP = 1 / 60;
export const BEST_KEY = 'lumen-harvest-best';
export const WAVES_TOTAL = 10;
export const REALMS_TOTAL = 3;

export const PALETTE = {
  bgTop: '#0a0e1e',
  bgBottom: '#141b38',
  nebulaA: '#1d2b5e',
  nebulaB: '#3b1d5e',
  star: '#cfe6ff',
  player: '#4de8ff',
  playerCore: '#ffffff',
  bullet: '#bff6ff',
  mote: '#ffd166',
  moteCore: '#fff3c4',
  chaser: '#ff4d6d',
  weaver: '#b388ff',
  splitter: '#ff9f43',
  spitter: '#7dff6a',
  dasher: '#ff3860',
  mini: '#ffb38a',
  orb: '#a5ff8a',
  text: '#eaf6ff',
  dim: '#8fa3c8',
  gold: '#ffd166',
  danger: '#ff5d73',
};

export const PLAYER = {
  radius: 14,
  speed: 268,
  hearts: 3,
  fireInterval: 0.21,
  bulletSpeed: 560,
  bulletDamage: 1,
  bulletRadius: 4,
  magnet: 82,
  pickupRadius: 24,
  dashTime: 0.18,
  dashSpeed: 790,
  dashCooldown: 1.6,
  invulnTime: 1.1,
  novaStart: 1,
  novaMax: 3,
};

export const COMBO = {
  window: 2.5, // seconds between pickups before the streak resets
  perLevel: 5, // pickups per multiplier level
  maxLevel: 5, // x1 .. x5
};

export const MOTE = {
  value: 10,
  drift: 26,
  life: 14, // seconds before a mote fades out
  spawnInterval: 1.15,
  maxOnField: 9,
};

// Per wisp type: hit points, speed, radius, score and the wave it first appears in.
export const WISP = {
  chaser: { hp: 2, speed: 96, radius: 15, score: 25, firstWave: 1 },
  weaver: { hp: 2, speed: 82, radius: 14, score: 35, firstWave: 2 },
  splitter: { hp: 3, speed: 68, radius: 19, score: 40, firstWave: 3 },
  spitter: { hp: 2, speed: 58, radius: 15, score: 50, firstWave: 4 },
  dasher: { hp: 3, speed: 74, radius: 15, score: 60, firstWave: 6 },
  mini: { hp: 1, speed: 138, radius: 9, score: 15, firstWave: 3 },
};

export const SPITTER = {
  shotInterval: 2.6,
  orbSpeed: 150,
  orbRadius: 6,
};

export const DASHER = {
  windup: 0.55, // telegraph time before the lunge
  lungeSpeed: 430,
  lungeTime: 0.42,
  recover: 0.9,
};

// The boss of a realm's tenth wave: a huge wisp that chases slowly, fires a radial
// burst of orbs, and calls in minis when its health is halved.
export const BOSS = {
  radius: 42,
  speed: 46,
  score: 500,
  burstInterval: 3.1, // seconds between radial orb bursts
  lungeInterval: 6.5, // seconds between charges at the drone
  lungeSpeed: 300,
  lungeTime: 0.55,
};

// A realm's hazard: vents erupt where they are telegraphed, shards drift and cut,
// brambles sit still and snag. A new one appears every few seconds from wave 2 on.
export const HAZARD = {
  spawnInterval: 6.5,
  firstWave: 2,
  ventTelegraph: 1.25, // seconds of warning before the eruption
  ventRadius: 72,
  ventLife: 0.35, // the eruption itself
  shardHp: 2,
  shardSpeed: 34,
  shardLife: 14,
  brambleHp: 3,
  brambleLife: 18, // then it withers, so thorns never choke the field
};
