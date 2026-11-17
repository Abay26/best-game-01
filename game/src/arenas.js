// Lumen Harvest — the four realms. One harvester, four arenas, each with its own
// palette, enemy colours, drifting ambient life, a hazard that shapes the fight
// and a boss at the end of its tenth wave. The campaign runs them in order: a
// realm opens once the realms before it are cleared, so the map itself is the
// progress. The Storm Reef is the new fourth realm: lightning, rain and a boss
// that fires its orbs in a spiral.
export const REALMS = [
  {
    id: 'ember',
    name: 'Ember Wastes',
    tagline: 'Ash, cinders and a burning crown',
    unlock: 0, // realms cleared before this one opens
    palette: {
      bgTop: '#200e05',
      bgBottom: '#411708',
      nebulaA: '#8a2f0a',
      nebulaB: '#b3540f',
      star: '#ffd9a0',
      accent: '#ff8a3c',
      mote: '#ffb347',
      moteCore: '#fff3c4',
      player: '#7de8ff',
      border: 'rgba(255, 150, 70, 0.30)',
    },
    enemyColors: {
      chaser: '#ff5d3c',
      weaver: '#ff9f43',
      splitter: '#ffc46b',
      spitter: '#ff7a59',
      dasher: '#ff3860',
      sniper: '#ff5df2',
      orbiter: '#5df2ff',
      mini: '#ffb38a',
    },
    hazard: 'vent',
    hazardColor: '#ff7a2a',
    ambient: 'embers', // glowing cinders rising
    boss: { name: 'Ember Colossus', color: '#ff6a2a', hp: 46, burst: 8, minis: 2, spiral: false },
  },
  {
    id: 'frost',
    name: 'Frost Hollow',
    tagline: 'Still air, sharp ice, a patient warden',
    unlock: 1,
    palette: {
      bgTop: '#06121f',
      bgBottom: '#0d2a3d',
      nebulaA: '#1d5e7a',
      nebulaB: '#3b7a9e',
      star: '#dff4ff',
      accent: '#7de8ff',
      mote: '#9fe8ff',
      moteCore: '#ffffff',
      player: '#ffb347',
      border: 'rgba(125, 232, 255, 0.30)',
    },
    enemyColors: {
      chaser: '#5dc8ff',
      weaver: '#9fe8ff',
      splitter: '#bfe9ff',
      spitter: '#7db8ff',
      dasher: '#4d9fff',
      sniper: '#ff5df2',
      orbiter: '#5df2ff',
      mini: '#cfeeff',
    },
    hazard: 'shard',
    hazardColor: '#9fe8ff',
    ambient: 'snow', // snowflakes drifting down
    boss: { name: 'Glacier Warden', color: '#5dc8ff', hp: 56, burst: 10, minis: 2, spiral: false },
  },
  {
    id: 'void',
    name: 'Void Garden',
    tagline: 'The old dark, overgrown',
    unlock: 2,
    palette: {
      bgTop: '#0a0e1e',
      bgBottom: '#141b38',
      nebulaA: '#1d2b5e',
      nebulaB: '#3b1d5e',
      star: '#cfe6ff',
      accent: '#b388ff',
      mote: '#ffd166',
      moteCore: '#fff3c4',
      player: '#4de8ff',
      border: 'rgba(120, 170, 255, 0.25)',
    },
    enemyColors: {
      chaser: '#ff4d6d',
      weaver: '#b388ff',
      splitter: '#ff9f43',
      spitter: '#7dff6a',
      dasher: '#ff3860',
      sniper: '#ff5df2',
      orbiter: '#5df2ff',
      mini: '#ffb38a',
    },
    hazard: 'bramble',
    hazardColor: '#b388ff',
    ambient: 'spores', // slow violet spores drifting
    boss: { name: 'Void Bloom', color: '#b388ff', hp: 40, burst: 8, minis: 4, spiral: false },
  },
  {
    id: 'storm',
    name: 'Storm Reef',
    tagline: 'Lightning over a drowned reef',
    unlock: 3,
    palette: {
      bgTop: '#04141a',
      bgBottom: '#0a2e33',
      nebulaA: '#0f5e6b',
      nebulaB: '#1d8a7a',
      star: '#d8fff4',
      accent: '#5df2d6',
      mote: '#7dffd4',
      moteCore: '#eafffa',
      player: '#ffd166',
      border: 'rgba(93, 242, 214, 0.32)',
    },
    enemyColors: {
      chaser: '#5df2d6',
      weaver: '#7dffd4',
      splitter: '#a5ffe9',
      spitter: '#3fd6b2',
      dasher: '#2ad4ff',
      sniper: '#ff5df2',
      orbiter: '#5df2ff',
      mini: '#c8fff0',
    },
    hazard: 'storm',
    hazardColor: '#5df2d6',
    ambient: 'rain', // slanted rain streaks
    boss: { name: 'Tempest Leviathan', color: '#2ad4ff', hp: 64, burst: 12, minis: 3, spiral: true },
  },
];

/** The realm with this id, or the first realm when the id is unknown. */
export function realmById(id) {
  return REALMS.find((r) => r.id === id) ?? REALMS[0];
}

/** The realm after this one in the campaign, or null at the end. */
export function nextRealm(realm) {
  const i = REALMS.findIndex((r) => r.id === realm.id);
  return i >= 0 && i + 1 < REALMS.length ? REALMS[i + 1] : null;
}
