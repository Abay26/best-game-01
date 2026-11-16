// Lumen Harvest — the world: one step of the rules. It owns the state (player,
// wisps, bullets, motes, particles), the wave flow, the combo, collisions and the
// win/lose conditions. The renderer only paints this state; the loop only steps it.
import { COMBO, MOTE, PALETTE, VIEW, WAVES_TOTAL } from './config.js';
import { createPlayer, updatePlayer } from './player.js';
import {
  spawnBullet,
  spawnFloater,
  spawnMote,
  spawnOrb,
  spawnParticle,
  spawnWisp,
  updateMote,
  updateWisp,
} from './entities.js';
import { rollUpgrades, spawnGap, waveQueue } from './waves.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_WIN = 8;
export const EVENT_UPGRADE = 16;
export const EVENT_SHOT = 32;
export const EVENT_DASH = 64;
export const EVENT_NOVA = 128;
export const EVENT_PICKUP = 256;
export const EVENT_KILL = 512;

export function comboMultiplier(state) {
  return 1 + Math.min(Math.floor(state.combo / COMBO.perLevel), COMBO.maxLevel - 1);
}

export function createWorld(rng) {
  const world = {
    rng,
    player: createPlayer(),
    wisps: [],
    bullets: [],
    orbs: [],
    motes: [],
    particles: [],
    floaters: [],
    stars: [],
    score: 0,
    combo: 0,
    comboTimer: 0,
    wave: 1,
    waveState: 'fight', // fight | upgrade | done
    queue: [],
    spawnTimer: 1,
    moteTimer: 0.5,
    time: 0,
    shake: 0,
    flash: 0,
    banner: null,
    upgrades: [],
    lastUpgradeIds: [],
    kills: 0,
    motesCollected: 0,
    wavesCleared: 0,
  };

  for (let i = 0; i < 90; i += 1) {
    world.stars.push({
      x: rng.range(0, VIEW.width),
      y: rng.range(0, VIEW.height),
      r: rng.range(0.5, 1.8),
      tw: rng.range(0, Math.PI * 2),
      depth: rng.range(0.3, 1),
    });
  }

  function startWave() {
    world.queue = waveQueue(world.wave, rng);
    world.spawnTimer = 0.9;
    world.banner = { text: `WAVE ${world.wave}`, sub: world.wave === WAVES_TOTAL ? 'THE LAST WAVE' : `${world.queue.length} wisps incoming`, timer: 2.2 };
  }

  function reset() {
    world.player = createPlayer();
    world.wisps = [];
    world.bullets = [];
    world.orbs = [];
    world.motes = [];
    world.particles = [];
    world.floaters = [];
    world.score = 0;
    world.combo = 0;
    world.comboTimer = 0;
    world.wave = 1;
    world.waveState = 'fight';
    world.time = 0;
    world.shake = 0;
    world.flash = 0;
    world.upgrades = [];
    world.lastUpgradeIds = [];
    world.kills = 0;
    world.motesCollected = 0;
    world.wavesCleared = 0;
    world.moteTimer = 0.5;
    // A few motes already drifting so the field never opens empty.
    for (let i = 0; i < 5; i += 1) {
      world.motes.push(spawnMote(rng, rng.range(80, VIEW.width - 80), rng.range(80, VIEW.height - 80)));
    }
    startWave();
  }

  function seedBackdrop() {
    // Title-screen backdrop: wisps and motes drifting with nobody to fight.
    for (let i = 0; i < 5; i += 1) {
      const w = spawnWisp(rng, rng.pick(['chaser', 'weaver', 'splitter']), rng.range(60, VIEW.width - 60), rng.range(60, VIEW.height - 60), 1);
      w.vx = rng.range(-30, 30);
      w.vy = rng.range(-30, 30);
      world.wisps.push(w);
    }
    for (let i = 0; i < 7; i += 1) {
      world.motes.push(spawnMote(rng, rng.range(60, VIEW.width - 60), rng.range(60, VIEW.height - 60)));
    }
  }

  function edgeSpawn() {
    const side = rng.int(0, 3);
    let x;
    let y;
    if (side === 0) {
      x = rng.range(30, VIEW.width - 30);
      y = 24;
    } else if (side === 1) {
      x = rng.range(30, VIEW.width - 30);
      y = VIEW.height - 24;
    } else if (side === 2) {
      x = 24;
      y = rng.range(30, VIEW.height - 30);
    } else {
      x = VIEW.width - 24;
      y = rng.range(30, VIEW.height - 30);
    }
    return { x, y };
  }

  function killWisp(index, awardScore) {
    const w = world.wisps[index];
    world.wisps.splice(index, 1);
    world.kills += 1;
    spawnParticle(world.particles, w.x, w.y, w.color, w.type === 'splitter' ? 22 : 14, 190, 0.6, 3.2);
    if (awardScore) {
      const gained = w.score * comboMultiplier(world);
      world.score += gained;
      spawnFloater(world.floaters, w.x, w.y, `+${gained}`, w.color);
      // A wisp bursts into motes: the risk of fighting pays in light.
      const drops = w.type === 'splitter' ? 2 : 1;
      for (let i = 0; i < drops; i += 1) world.motes.push(spawnMote(rng, w.x, w.y));
      if (w.type === 'splitter') {
        for (let i = 0; i < 2; i += 1) {
          const mini = spawnWisp(rng, 'mini', w.x + rng.range(-16, 16), w.y + rng.range(-16, 16), world.wave);
          world.wisps.push(mini);
        }
      }
    }
  }

  function hurtPlayer(fromX, fromY) {
    const p = world.player;
    if (!p.alive || p.invuln > 0 || p.dashTimer > 0) return false;
    p.hearts -= 1;
    p.invuln = 1.1;
    world.combo = 0;
    world.comboTimer = 0;
    world.shake = 15;
    world.flash = 0.4;
    // Knock the drone away from whatever hit it.
    const dx = p.x - fromX;
    const dy = p.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    p.x = Math.min(VIEW.width - p.radius, Math.max(p.radius, p.x + (dx / len) * 46));
    p.y = Math.min(VIEW.height - p.radius, Math.max(p.radius, p.y + (dy / len) * 46));
    spawnParticle(world.particles, p.x, p.y, PALETTE.danger, 18, 220, 0.5, 3.4);
    if (p.hearts <= 0) {
      p.alive = false;
      world.waveState = 'done';
      spawnParticle(world.particles, p.x, p.y, PALETTE.player, 60, 320, 1.1, 4);
      spawnParticle(world.particles, p.x, p.y, '#ffffff', 30, 200, 0.8, 3);
      world.shake = 22;
    }
    return true;
  }

  function fireNova() {
    const p = world.player;
    if (p.novas <= 0 || world.wisps.length === 0) return false;
    p.novas -= 1;
    world.flash = 0.55;
    world.shake = 20;
    spawnParticle(world.particles, p.x, p.y, PALETTE.player, 40, 420, 0.9, 4);
    for (let i = world.wisps.length - 1; i >= 0; i -= 1) {
      const w = world.wisps[i];
      world.score += w.score * comboMultiplier(world);
      spawnParticle(world.particles, w.x, w.y, w.color, 10, 200, 0.6, 3);
      world.wisps.splice(i, 1);
      world.kills += 1;
    }
    world.orbs = [];
    return true;
  }

  function startAtWave(n, hearts) {
    // Screenshot staging: jump straight into a later wave with few hearts left.
    world.wave = n;
    world.player.hearts = hearts;
    world.queue = [];
    world.wisps = [];
    world.orbs = [];
    world.bullets = [];
    world.waveState = 'fight';
    startWave();
  }

  function applyUpgrade(index) {
    const up = world.upgrades[index];
    if (!up) return;
    up.apply(world.player);
    world.lastUpgradeIds = world.upgrades.map((u) => u.id);
    world.upgrades = [];
    world.wave += 1;
    world.waveState = 'fight';
    startWave();
  }

  function step(dt, input, attract) {
    world.time += dt;
    let events = EVENT_NONE;
    world.shake = Math.max(0, world.shake - dt * 26);
    world.flash = Math.max(0, world.flash - dt * 1.4);
    if (world.banner) {
      world.banner.timer -= dt;
      if (world.banner.timer <= 0) world.banner = null;
    }
    if (world.comboTimer > 0) {
      world.comboTimer -= dt;
      if (world.comboTimer <= 0) world.combo = 0;
    }

    // Ambient backdrop behind the title screen: drift, never fight.
    if (attract) {
      for (const w of world.wisps) {
        w.x += w.vx * dt;
        w.y += w.vy * dt;
        if (w.x < 20 || w.x > VIEW.width - 20) w.vx *= -1;
        if (w.y < 20 || w.y > VIEW.height - 20) w.vy *= -1;
      }
      for (const m of world.motes) {
        m.phase += dt;
        m.x += Math.sin(m.phase) * 6 * dt;
        m.y += Math.cos(m.phase * 0.8) * 6 * dt;
      }
      updateFx(dt);
      return events;
    }

    if (world.waveState === 'upgrade') {
      updateFx(dt);
      return events;
    }
    if (world.waveState === 'done') {
      updateFx(dt);
      return events;
    }

    const p = world.player;

    // Nova bomb.
    if (input.nova && fireNova()) events |= EVENT_NOVA;

    const bulletsBefore = world.bullets.length;
    const dashBefore = p.dashTimer;
    updatePlayer(p, input, world, dt, (x, y, dx, dy) => {
      world.bullets.push(spawnBullet(x, y, dx, dy, p.bulletSpeed, p.bulletDamage));
    });
    if (world.bullets.length > bulletsBefore) events |= EVENT_SHOT;
    if (p.dashTimer > 0 && dashBefore <= 0) events |= EVENT_DASH;

    // Spawning.
    if (world.queue.length > 0) {
      world.spawnTimer -= dt;
      if (world.spawnTimer <= 0) {
        world.spawnTimer = spawnGap(world.wave);
        const type = world.queue.shift();
        let pos = edgeSpawn();
        for (let tries = 0; tries < 5; tries += 1) {
          if (Math.hypot(pos.x - p.x, pos.y - p.y) > 220) break;
          pos = edgeSpawn();
        }
        const w = spawnWisp(rng, type, pos.x, pos.y, world.wave);
        world.wisps.push(w);
        spawnParticle(world.particles, pos.x, pos.y, w.color, 6, 60, 0.4, 2.5);
      }
    }
    world.moteTimer -= dt;
    if (world.moteTimer <= 0) {
      world.moteTimer = MOTE.spawnInterval * rng.range(0.8, 1.25);
      if (world.motes.length < MOTE.maxOnField) {
        world.motes.push(spawnMote(rng, rng.range(50, VIEW.width - 50), rng.range(50, VIEW.height - 50)));
      }
    }

    // Wisps.
    for (const w of world.wisps) {
      updateWisp(w, p, dt, world.time, (x, y, dx, dy) => {
        world.orbs.push(spawnOrb(x, y, dx, dy));
      });
    }

    // Bullets.
    for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
      const b = world.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > VIEW.width + 20 || b.y < -20 || b.y > VIEW.height + 20) {
        world.bullets.splice(i, 1);
        continue;
      }
      for (let j = world.wisps.length - 1; j >= 0; j -= 1) {
        const w = world.wisps[j];
        const rr = w.radius + b.radius;
        if ((w.x - b.x) * (w.x - b.x) + (w.y - b.y) * (w.y - b.y) < rr * rr) {
          w.hp -= b.damage;
          w.flash = 0.09;
          spawnParticle(world.particles, b.x, b.y, w.color, 3, 90, 0.25, 2);
          world.bullets.splice(i, 1);
          if (w.hp <= 0) {
            killWisp(j, true);
            events |= EVENT_KILL;
          }
          break;
        }
      }
    }

    // Hostile orbs.
    for (let i = world.orbs.length - 1; i >= 0; i -= 1) {
      const o = world.orbs[i];
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.life -= dt;
      if (o.life <= 0 || o.x < -20 || o.x > VIEW.width + 20 || o.y < -20 || o.y > VIEW.height + 20) {
        world.orbs.splice(i, 1);
        continue;
      }
      const rr = o.radius + p.radius;
      if (p.alive && (o.x - p.x) * (o.x - p.x) + (o.y - p.y) * (o.y - p.y) < rr * rr) {
        world.orbs.splice(i, 1);
        if (hurtPlayer(o.x, o.y)) events |= EVENT_HIT;
      }
    }

    // Wisps touching the drone.
    if (p.alive) {
      for (let j = world.wisps.length - 1; j >= 0; j -= 1) {
        const w = world.wisps[j];
        const rr = w.radius + p.radius - 2;
        if ((w.x - p.x) * (w.x - p.x) + (w.y - p.y) * (w.y - p.y) < rr * rr) {
          killWisp(j, false);
          if (hurtPlayer(w.x, w.y)) events |= EVENT_HIT;
          break;
        }
      }
    }

    // Motes: drift, magnet, pickup.
    for (let i = world.motes.length - 1; i >= 0; i -= 1) {
      const m = world.motes[i];
      updateMote(m, p, dt);
      if (m.life <= 0) {
        world.motes.splice(i, 1);
        continue;
      }
      const rr = 26;
      if (p.alive && (m.x - p.x) * (m.x - p.x) + (m.y - p.y) * (m.y - p.y) < rr * rr) {
        world.motes.splice(i, 1);
        world.combo += 1;
        world.comboTimer = COMBO.window;
        world.motesCollected += 1;
        const gained = (m.value + p.moteBonus) * comboMultiplier(world);
        world.score += gained;
        spawnFloater(world.floaters, m.x, m.y, `+${gained}`, PALETTE.mote);
        spawnParticle(world.particles, m.x, m.y, PALETTE.mote, 6, 110, 0.35, 2.4);
        events |= EVENT_PICKUP;
      }
    }

    updateFx(dt);

    if (!p.alive) {
      events |= EVENT_OVER;
      return events;
    }

    // Wave cleared: queue empty and field empty.
    if (world.queue.length === 0 && world.wisps.length === 0) {
      world.wavesCleared += 1;
      const bonus = 100 * world.wave;
      world.score += bonus;
      spawnFloater(world.floaters, p.x, p.y - 30, `WAVE BONUS +${bonus}`, PALETTE.gold);
      if (world.wave >= WAVES_TOTAL) {
        world.waveState = 'done';
        events |= EVENT_WIN;
      } else {
        world.waveState = 'upgrade';
        world.upgrades = rollUpgrades(rng, world.lastUpgradeIds);
        events |= EVENT_WAVE_CLEAR | EVENT_UPGRADE;
      }
    }
    return events;
  }

  function updateFx(dt) {
    for (let i = world.particles.length - 1; i >= 0; i -= 1) {
      const pt = world.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 1 - 2.4 * dt;
      pt.vy *= 1 - 2.4 * dt;
      pt.life -= dt;
      if (pt.life <= 0) world.particles.splice(i, 1);
    }
    for (let i = world.floaters.length - 1; i >= 0; i -= 1) {
      const f = world.floaters[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) world.floaters.splice(i, 1);
    }
    for (const s of world.stars) s.tw += dt * 0.8;
  }

  // The world object plus the actions the loop calls on it.
  return {
    state: world,
    reset,
    step,
    applyUpgrade,
    seedBackdrop,
    startAtWave,
  };
}
