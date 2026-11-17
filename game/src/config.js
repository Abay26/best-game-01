// Lumen Harvest — every number the game balances on, in one place. Tuning the
// feel means editing here, never the rules: the drone, the wisps, the combo, the
// motes, the hazards, the bosses and the new overdrive system all read from this
// file. Five realms now: Ember, Frost, Void, Storm Reef and the Aurora Tide.
export const VIEW = { width: 960, height: 600 };
export const STEP = 1 / 60;
export const BEST_KEY = 'lumen-harvest-best';
export const WAVES_TOTAL = 10;
export const REALMS_TOTAL = 5;

// The fallback palette, used before any realm is chosen (title screen backdrop).
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
  sniper: '#ff5df2',
  orbiter: '#5df2ff',
  warden: '#d8b25c',
  mini: '#ffb38a',
  orb: '#a5ff8a',
  text: '#eaf6ff',
  dim: '#8fa3c8',
  gold: '#ffd166',
  danger: '#ff5d73',
  overdrive: '#7dffd4',
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

// Overdrive: the meter fills as the drone harvests and slays. At full, Q fires a
// five-second surge — faster fire, faster flight, bullets that punch through.
export const OVERDRIVE = {
  max: 100,
  perMote: 2,
  perKill: 2,
  duration: 5, // seconds the surge lasts
  fireMult: 0.55, // fire interval multiplier while surging
  speedMult: 1.25,
  pierceBonus: 1,
  fillRateMult: 1, // raised by the Overdrive Cell upgrade
};

// Combo: pickups inside the window keep the streak alive; every five pickups
// the multiplier climbs, up to x5. At a 25 combo the harvest goes FRENZY: six
// seconds of doubled score, then the streak resets and must be rebuilt.
export const COMBO = {
  window: 2.5, // seconds between pickups before the streak resets
  perLevel: 5, // pickups per multiplier level
  maxLevel: 5, // x1 .. x5
};

export const FRENZY = {
  combo: 25, // combo that triggers the frenzy
  duration: 6, // seconds of doubled score
};

// Kill streaks: slaying without taking a hit builds a streak. At 8, 16 and 24
// the game calls it out and pays a bonus.
export const STREAK = {
  tiers: [
    { kills: 8, name: 'RAMPAGE', bonus: 50 },
    { kills: 16, name: 'UNSTOPPABLE', bonus: 120 },
    { kills: 24, name: 'LUMEN STORM', bonus: 250 },
  ],
};

export const MOTE = {
  value: 10,
  drift: 26,
  life: 14, // seconds before a mote fades out
  spawnInterval: 1.15,
  maxOnField: 9,
  goldenValue: 30, // a golden mote's score before the combo multiplier
  goldenChance: 0.12, // share of spawned motes that come up golden
  goldenLife: 8, // golden motes burn out faster
};

// Per wisp type: hit points, speed, radius, score and the wave it first appears
// in. The two new types: a sniper that holds range and fires a telegraphed bolt,
// and an orbiter that circles the drone before diving at it. The warden is the
// new tank: slow, armored, worth 90, and it bursts into three motes when it falls.
export const WISP = {
  chaser: { hp: 2, speed: 96, radius: 15, score: 25, firstWave: 1 },
  weaver: { hp: 2, speed: 82, radius: 14, score: 35, firstWave: 2 },
  splitter: { hp: 3, speed: 68, radius: 19, score: 40, firstWave: 3 },
  spitter: { hp: 2, speed: 58, radius: 15, score: 50, firstWave: 4 },
  dasher: { hp: 3, speed: 74, radius: 15, score: 60, firstWave: 6 },
  sniper: { hp: 2, speed: 52, radius: 14, score: 70, firstWave: 3 },
  orbiter: { hp: 2, speed: 108, radius: 13, score: 65, firstWave: 4 },
  warden: { hp: 5, speed: 40, radius: 20, score: 90, firstWave: 5 },
  mini: { hp: 1, speed: 138, radius: 9, score: 15, firstWave: 3 },
};

export const SPITTER = {
  shotInterval: 2.9,
  orbSpeed: 150,
  orbRadius: 6,
};

export const DASHER = {
  windup: 0.55, // telegraph time before the lunge
  lungeSpeed: 430,
  lungeTime: 0.42,
  recover: 0.9,
};

export const SNIPER = {
  holdRange: 320, // preferred distance from the drone
  aimTime: 0.85, // telegraphed aim before the bolt
  boltSpeed: 340,
  boltRadius: 5,
  shotInterval: 3.4,
};

export const ORBITER = {
  orbitRadius: 170,
  orbitSpeed: 1.9, // radians per second around the drone
  diveSpeed: 330,
  diveTime: 0.5,
  recover: 0.8,
};

// The boss of a realm's tenth wave: a huge wisp that chases slowly, fires a
// radial burst of orbs, lunges at the drone, and calls in minis when its health
// is halved. Spiral bosses weave a rotating helix into every second burst.
export const BOSS = {
  radius: 42,
  speed: 46,
  score: 500,
  burstInterval: 3.1, // seconds between radial orb bursts
  lungeInterval: 6.5, // seconds between charges at the drone
  lungeSpeed: 300,
  lungeTime: 0.55,
  spiralOrbs: 16, // orbs in a spiral burst
  spiralSpeed: 110,
};

// A realm's hazard: vents erupt where they are telegraphed, shards drift and
// cut, brambles sit still and snag, storm cells drift and strike lightning at
// the drone, aurora ribbons drift and burn on touch. A new one appears every
// few seconds from wave 2 on.
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
  stormHp: 3,
  stormLife: 16,
  stormDrift: 26, // how fast a storm cell wanders
  stormStrikeInterval: 2.6, // seconds between lightning strikes
  stormTelegraph: 0.8, // warning before a strike lands
  stormStrikeRadius: 46,
  auroraHp: 3,
  auroraLife: 18,
  auroraDrift: 18, // slow ribbons, slower than storm cells
};

// Chain lightning: every Nth kill zaps the nearest wisp for this much damage.
export const CHAIN = {
  everyKills: 6,
  damage: 2,
  range: 420,
};
