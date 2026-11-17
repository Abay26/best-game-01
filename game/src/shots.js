// Staged screenshot scenes behind ?shot=start|select|play|upgrade|end. Each one
// plays the real rules forward from a fresh world for a fixed time, steered by an
// autopilot, so the frame is what a short game really looks like — and the same
// seed always gives the same frame. The pilot chases the nearest mote, keeps
// clear of wisps, fires whenever it can, dashes out of trouble and surges into
// overdrive when the meter is full; the end scene's pilot never shoots and never
// dashes, so the dark catches it, as it catches a hurried player.
import { OVERDRIVE, STEP, VIEW } from './config.js';
import { REALMS } from './arenas.js';
import { EVENT_OVER, EVENT_UPGRADE } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_SELECT, SCREEN_TITLE, SCREEN_UPGRADE } from './render.js';

const SAMPLE = 1 / 30;
const START_SECONDS = 6;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 240;

function pilotInput(state, recklessness) {
  const p = state.player;
  // Nearest mote worth chasing.
  let mote = null;
  let moteD = Infinity;
  for (const m of state.motes) {
    const d = (m.x - p.x) * (m.x - p.x) + (m.y - p.y) * (m.y - p.y);
    if (d < moteD) {
      moteD = d;
      mote = m;
    }
  }
  // Nearest threat, and how close it is allowed to get.
  let threat = null;
  let threatD = Infinity;
  for (const w of state.wisps) {
    const d = Math.hypot(w.x - p.x, w.y - p.y);
    if (d < threatD) {
      threatD = d;
      threat = w;
    }
  }
  for (const o of state.orbs) {
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d < threatD) {
      threatD = d;
      threat = o;
    }
  }

  let tx;
  let ty;
  if (threat && threatD < 150) {
    // Flee: straight away from the threat.
    tx = p.x + (p.x - threat.x);
    ty = p.y + (p.y - threat.y);
  } else if (mote) {
    tx = mote.x;
    ty = mote.y;
  } else {
    tx = VIEW.width / 2;
    ty = VIEW.height / 2;
  }
  const dx = tx - p.x;
  const dy = ty - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const mx = dx / len;
  const my = dy / len;
  return {
    direction() {
      return { x: mx, y: my };
    },
    fire: recklessness < 1,
    dash: recklessness < 1 && threat !== null && threatD < 95 && p.dashCooldown <= 0,
    nova: false,
    overdrive: recklessness < 1 && p.overdrive >= OVERDRIVE.max,
  };
}

function recklessInput(state) {
  const p = state.player;
  let mote = null;
  let moteD = Infinity;
  for (const m of state.motes) {
    const d = (m.x - p.x) * (m.x - p.x) + (m.y - p.y) * (m.y - p.y);
    if (d < moteD) {
      moteD = d;
      mote = m;
    }
  }
  const tx = mote ? mote.x : VIEW.width / 2;
  const ty = mote ? mote.y : VIEW.height / 2;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    direction() {
      return { x: dx / len, y: dy / len };
    },
    fire: false,
    dash: false,
    nova: false,
    overdrive: false,
  };
}

/**
 * Set `world` to the named scene and return the screen to draw over it, the best
 * score to show, and the map/title data. Any unknown name stages the title screen.
 * The select scene shows a campaign two realms in: Ember and Frost cleared, Void
 * open, the Storm Reef still locked — the map as a returning player sees it.
 */
export function stageShot(name, world) {
  const state = world.state;
  if (name === 'select') {
    world.seedBackdrop();
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, null, true);
    return {
      screen: SCREEN_SELECT,
      best: 6100,
      ui: { save: { best: { ember: 4200, frost: 6100, void: 0, storm: 0 }, bestCombo: { ember: 18, frost: 24, void: 0, storm: 0 }, cleared: ['ember', 'frost'], kills: 512, motes: 840, runs: 11, wins: 2 }, selected: 2 },
    };
  }
  if (name === 'play' || name === 'upgrade' || name === 'end') {
    // The play scene fights in the Storm Reef, the new fourth realm: snipers,
    // orbiters, lightning cells and rain.
    world.reset(REALMS[3]);
    if (name === 'end') {
      // An early wave with full hearts: the reckless pilot gathers some light
      // first, then the dark catches it — a real run's end, not an instant death.
      world.startAtWave(2, 3);
    }
    const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'upgrade' ? 120 : 60;
    for (let i = 0; i < limit / STEP; i += 1) {
      const input = name === 'end' ? recklessInput(state) : pilotInput(state, 0);
      const events = world.step(STEP, input, false);
      if (events & EVENT_OVER) break;
      if (name === 'upgrade' && events & EVENT_UPGRADE) break;
      if (name === 'play' && events & EVENT_UPGRADE) {
        // The play scene keeps going: take the first upgrade and fight on.
        world.applyUpgrade(0);
      }
      if (name === 'play' && state.wave >= 4 && state.wisps.length >= 6) break;
    }
    if (name === 'end') return { screen: SCREEN_OVER, best: state.score, ui: { save: { best: { ember: state.score }, bestCombo: { ember: state.maxCombo }, cleared: [], kills: state.kills, motes: state.motesCollected, runs: 1, wins: 0 }, selected: 0 } };
    if (name === 'upgrade' && state.waveState === 'upgrade') return { screen: SCREEN_UPGRADE, best: state.score, ui: { save: { best: {}, bestCombo: {}, cleared: [], kills: 0, motes: 0, runs: 0, wins: 0 }, selected: 0 } };
    return { screen: SCREEN_PLAY, best: state.score, ui: { save: { best: {}, bestCombo: {}, cleared: [], kills: 0, motes: 0, runs: 0, wins: 0 }, selected: 0 } };
  }
  // Title: let the backdrop drift for a few seconds, then show the title screen.
  world.seedBackdrop();
  for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, null, true);
  return { screen: SCREEN_TITLE, best: 0, ui: { save: { best: { ember: 4200, frost: 6100, void: 0, storm: 0 }, bestCombo: { ember: 18, frost: 24, void: 0, storm: 0 }, cleared: ['ember', 'frost'], kills: 512, motes: 840, runs: 11, wins: 2 }, selected: 0 } };
}
