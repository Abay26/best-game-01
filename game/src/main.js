// Lumen Harvest — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there. The game
// moves between six screens: title, play, upgrade, paused, game over and win.
//
// ?seed=N fixes the field. ?shot=start|play|upgrade|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { audio } from './audio.js';
import { createWorld, EVENT_DASH, EVENT_HIT, EVENT_KILL, EVENT_NOVA, EVENT_OVER, EVENT_PICKUP, EVENT_SHOT, EVENT_UPGRADE, EVENT_WIN } from './world.js';
import {
  ACTION_CONFIRM,
  ACTION_DASH,
  ACTION_MUTE,
  ACTION_NOVA,
  ACTION_PAUSE,
  ACTION_UPGRADE_1,
  ACTION_UPGRADE_2,
  ACTION_UPGRADE_3,
  createInput,
} from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(window);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  world.seedBackdrop();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Three hearts. Gather the light.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(won ? `Harvest complete. Score ${world.state.score}.` : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function playSounds(events) {
    if (events & EVENT_SHOT) audio.shoot();
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_NOVA) audio.nova();
    if (events & EVENT_PICKUP) audio.pickup(Math.min(5, Math.floor(world.state.combo / 5) + 1));
    if (events & EVENT_KILL) audio.explosion(false);
    if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_UPGRADE) audio.waveClear();
    if (events & EVENT_OVER) audio.gameOver();
    if (events & EVENT_WIN) audio.win();
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const nowMuted = audio.toggleMute();
      announce(nowMuted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (screen === SCREEN_UPGRADE) {
      if (actions & ACTION_UPGRADE_1) {
        world.applyUpgrade(0);
        audio.upgrade();
        screen = SCREEN_PLAY;
        announce('Upgrade taken. Next wave.');
      } else if (actions & ACTION_UPGRADE_2) {
        world.applyUpgrade(1);
        audio.upgrade();
        screen = SCREEN_PLAY;
        announce('Upgrade taken. Next wave.');
      } else if (actions & ACTION_UPGRADE_3) {
        world.applyUpgrade(2);
        audio.upgrade();
        screen = SCREEN_PLAY;
        announce('Upgrade taken. Next wave.');
      }
      return;
    }
    if (screen === SCREEN_PLAY && actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (screen === SCREEN_PAUSED && actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, null, true);
      return;
    }
    if (screen !== SCREEN_PLAY) {
      world.step(STEP, null, false);
      return;
    }
    const frameInput = {
      direction() {
        return input.direction();
      },
      fire: input.fireHeld(),
      dash: Boolean(actions & ACTION_DASH),
      nova: Boolean(actions & ACTION_NOVA),
    };
    const events = world.step(STEP, frameInput, false);
    playSounds(events);
    if (events & EVENT_OVER) endGame(false);
    else if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_UPGRADE) screen = SCREEN_UPGRADE;
    else if (events & EVENT_HIT) {
      const left = world.state.player.hearts;
      announce(left === 1 ? 'Hit. 1 heart left.' : `Hit. ${left} hearts left.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      step(actions);
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting wisps close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lumen Harvest. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
