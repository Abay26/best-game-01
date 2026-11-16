// Lumen Harvest — the three realms. One harvester, three arenas, each with its own
// palette, enemy colours, drifting ambient life, a hazard that shapes the fight and
// a boss at the end of its tenth wave. The campaign runs them in order: a realm
// opens once the realms before it are cleared, so the map itself is the progress.
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
      mini: '#ffb38a',
    },
    hazard: 'vent',
    hazardColor: '#ff7a2a',
    ambient: 'embers', // glowing cinders rising
    boss: { name: 'Ember Colossus', color: '#ff6a2a', hp: 46, burst: 8, minis: 2 },
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
      mini: '#cfeeff',
    },
    hazard: 'shard',
    hazardColor: '#9fe8ff',
    ambient: 'snow', // snowflakes drifting down
    boss: { name: 'Glacier Warden', color: '#5dc8ff', hp: 56, burst: 10, minis: 2 },
  },
  {
    id: 'void',
    name: 'Void Garden',
    tagline: 'The old dark, overgrown and blooming',
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
      mini: '#ffb38a',
    },
    hazard: 'bramble',
    hazardColor: '#b388ff',
    ambient: 'spores', // slow violet spores drifting
    boss: { name: 'Void Bloom', color: '#b388ff', hp: 40, burst: 8, minis: 4 },
  },
];

/** The realm with this id, or the first realm when the id is unknown. */
export function realmById(id) {
  return REALMS.find((r) => r.id === id) ?? REALMS[0];
}
