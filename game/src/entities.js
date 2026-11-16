// Everything that lives in the arena besides the player: wisps (the enemies),
// bullets, lumen motes, hostile orbs, particles and floating score text. Each type
// has its own shape of movement so the field reads at a glance.
import { DASHER, MOTE, PALETTE, SPITTER, VIEW, WISP } from './config.js';

export function spawnWisp(rng, type, x, y, wave) {
  const spec = WISP[type];
  const hpScale = 1 + Math.floor((wave - 1) / 3); // +1 hp every three waves
  return {
    kind: 'wisp',
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: spec.radius,
    hp: spec.hp + (type === 'mini' ? 0 : hpScale - 1),
    maxHp: spec.hp + (type === 'mini' ? 0 : hpScale - 1),
    speed: spec.speed * rng.range(0.9, 1.1),
    score: spec.score,
    color: PALETTE[type] || PALETTE.chaser,
    phase: rng.range(0, Math.PI * 2),
    state: 'hunt', // dasher: hunt -> windup -> lunge -> recover
    stateTimer: 0,
    shotTimer: rng.range(1, SPITTER.shotInterval),
    flash: 0, // white flash frames after a hit
  };
}

export function spawnMote(rng, x, y, value) {
  const a = rng.range(0, Math.PI * 2);
  const sp = rng.range(20, 70);
  return {
    kind: 'mote',
    x,
    y,
    vx: Math.cos(a) * sp,
    vy: Math.sin(a) * sp,
    radius: 8,
    value: value ?? MOTE.value,
    life: MOTE.life,
    phase: rng.range(0, Math.PI * 2),
  };
}

export function spawnBullet(x, y, dx, dy, speed, damage) {
  return { kind: 'bullet', x, y, vx: dx * speed, vy: dy * speed, radius: 4, damage, life: 1.6 };
}

export function spawnOrb(x, y, dx, dy) {
  return { kind: 'orb', x, y, vx: dx * SPITTER.orbSpeed, vy: dy * SPITTER.orbSpeed, radius: SPITTER.orbRadius, life: 5 };
}

export function spawnParticle(list, x, y, color, count, speed, life, size) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const sp = speed * (0.3 + Math.random() * 0.7);
    list.push({
      kind: 'particle',
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      radius: size * (0.6 + Math.random() * 0.8),
      color,
      life: life * (0.6 + Math.random() * 0.7),
      maxLife: life,
    });
  }
}

export function spawnFloater(list, x, y, text, color) {
  list.push({ kind: 'floater', x, y, text, color, life: 0.9, maxLife: 0.9 });
}

function steerToward(w, tx, ty, dt, accel) {
  const dx = tx - w.x;
  const dy = ty - w.y;
  const len = Math.hypot(dx, dy) || 1;
  w.vx += (dx / len) * accel * dt;
  w.vy += (dy / len) * accel * dt;
  const sp = Math.hypot(w.vx, w.vy);
  const max = w.speed * 1.6;
  if (sp > max) {
    w.vx = (w.vx / sp) * max;
    w.vy = (w.vy / sp) * max;
  }
}

export function updateWisp(w, player, dt, time, fireOrb) {
  w.flash = Math.max(0, w.flash - dt);
  w.phase += dt;
  if (w.stateTimer > 0) w.stateTimer -= dt;

  if (w.type === 'weaver') {
    // Sine-weaves sideways while closing in: hard to lead with a shot.
    const dx = player.x - w.x;
    const dy = player.y - w.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const sway = Math.sin(w.phase * 2.4) * 70;
    w.vx = (dx / len) * w.speed + px * sway;
    w.vy = (dy / len) * w.speed + py * sway;
  } else if (w.type === 'spitter') {
    // Keeps its distance and lobs slow orbs at the drone.
    const dx = player.x - w.x;
    const dy = player.y - w.y;
    const dist = Math.hypot(dx, dy) || 1;
    const want = 260;
    const toward = dist > want + 30 ? 1 : dist < want - 30 ? -1 : 0;
    w.vx = (dx / dist) * w.speed * toward;
    w.vy = (dy / dist) * w.speed * toward;
    w.shotTimer -= dt;
    if (w.shotTimer <= 0 && dist < 520) {
      w.shotTimer = SPITTER.shotInterval;
      fireOrb(w.x, w.y, dx / dist, dy / dist);
    }
  } else if (w.type === 'dasher') {
    if (w.state === 'hunt') {
      steerToward(w, player.x, player.y, dt, 240);
      const dist = Math.hypot(player.x - w.x, player.y - w.y);
      if (dist < 190 && w.stateTimer <= 0) {
        w.state = 'windup';
        w.stateTimer = DASHER.windup;
        w.vx = 0;
        w.vy = 0;
      }
    } else if (w.state === 'windup') {
      if (w.stateTimer <= 0) {
        const dx = player.x - w.x;
        const dy = player.y - w.y;
        const len = Math.hypot(dx, dy) || 1;
        w.vx = (dx / len) * DASHER.lungeSpeed;
        w.vy = (dy / len) * DASHER.lungeSpeed;
        w.state = 'lunge';
        w.stateTimer = DASHER.lungeTime;
      }
    } else if (w.state === 'lunge') {
      if (w.stateTimer <= 0) {
        w.state = 'recover';
        w.stateTimer = DASHER.recover;
        w.vx = 0;
        w.vy = 0;
      }
    } else if (w.state === 'recover' && w.stateTimer <= 0) {
      w.state = 'hunt';
    }
  } else {
    // Chaser, splitter and mini: straight pursuit with a little wobble.
    steerToward(w, player.x, player.y, dt, 300);
  }

  w.x += w.vx * dt;
  w.y += w.vy * dt;
  w.x = Math.min(VIEW.width - w.radius, Math.max(w.radius, w.x));
  w.y = Math.min(VIEW.height - w.radius, Math.max(w.radius, w.y));
}

export function updateMote(m, player, dt) {
  m.life -= dt;
  m.phase += dt;
  // Drift, then get pulled in when the drone's magnet reaches it.
  const dx = player.x - m.x;
  const dy = player.y - m.y;
  const dist = Math.hypot(dx, dy) || 1;
  if (dist < player.magnet) {
    const pull = 640 * (1 - dist / player.magnet) + 120;
    m.vx += (dx / dist) * pull * dt;
    m.vy += (dy / dist) * pull * dt;
  } else {
    m.vx *= 1 - 1.6 * dt;
    m.vy *= 1 - 1.6 * dt;
    m.vx += Math.sin(m.phase * 1.3) * 8 * dt;
    m.vy += Math.cos(m.phase * 1.1) * 8 * dt;
  }
  m.x += m.vx * dt;
  m.y += m.vy * dt;
}
