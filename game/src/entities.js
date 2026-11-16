// Everything that lives in the arena besides the player: wisps (the enemies),
// bullets, lumen motes, hostile orbs, particles and floating score text. Each type
// has its own shape of movement so the field reads at a glance.
import { BOSS, DASHER, HAZARD, MOTE, PALETTE, SPITTER, VIEW, WISP } from './config.js';

export function spawnWisp(rng, type, x, y, wave, realm) {
  if (type === 'boss') return spawnBoss(rng, x, y, realm);
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
    color: (realm && realm.enemyColors[type]) || PALETTE[type] || PALETTE.chaser,
    phase: rng.range(0, Math.PI * 2),
    state: 'hunt', // dasher: hunt -> windup -> lunge -> recover
    stateTimer: 0,
    shotTimer: rng.range(1, SPITTER.shotInterval),
    flash: 0, // white flash frames after a hit
  };
}

/** The boss of a realm's tenth wave: huge, slow, and loud. */
export function spawnBoss(rng, x, y, realm) {
  const spec = (realm && realm.boss) || { name: 'Void Bloom', color: '#b388ff', hp: 40, burst: 8, minis: 4 };
  return {
    kind: 'boss',
    type: 'boss',
    x,
    y,
    vx: 0,
    vy: 0,
    radius: BOSS.radius,
    hp: spec.hp,
    maxHp: spec.hp,
    speed: BOSS.speed,
    score: BOSS.score,
    color: spec.color,
    name: spec.name,
    burst: spec.burst,
    minis: spec.minis,
    phase: rng.range(0, Math.PI * 2),
    state: 'hunt', // hunt -> lunge -> recover
    stateTimer: 0,
    burstTimer: BOSS.burstInterval,
    lungeTimer: BOSS.lungeInterval,
    summoned: false, // minis called in once at half health
    flash: 0,
  };
}

/** A realm hazard: a vent telegraphs then erupts, a shard drifts and cuts, a
 * bramble sits still and snags. Vents cannot be shot; shards and brambles can. */
export function spawnHazard(rng, kind, x, y) {
  const base = { kind: 'hazard', hazard: kind, x, y, vx: 0, vy: 0, flash: 0 };
  if (kind === 'vent') {
    return { ...base, radius: HAZARD.ventRadius, state: 'telegraph', stateTimer: HAZARD.ventTelegraph, life: HAZARD.ventTelegraph + HAZARD.ventLife };
  }
  if (kind === 'shard') {
    const a = rng.range(0, Math.PI * 2);
    return { ...base, radius: 16, hp: HAZARD.shardHp, maxHp: HAZARD.shardHp, vx: Math.cos(a) * HAZARD.shardSpeed, vy: Math.sin(a) * HAZARD.shardSpeed, life: HAZARD.shardLife, phase: rng.range(0, Math.PI * 2) };
  }
  return { ...base, radius: 18, hp: HAZARD.brambleHp, maxHp: HAZARD.brambleHp, life: HAZARD.brambleLife, phase: rng.range(0, Math.PI * 2) };
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

/** The boss: slow chase, a radial orb burst every few seconds, a charge at the
 * drone, and one call for minis when its health is halved. */
export function updateBoss(b, player, dt, time, fireOrb, spawnMini) {
  b.flash = Math.max(0, b.flash - dt);
  b.phase += dt;
  b.burstTimer -= dt;
  b.lungeTimer -= dt;
  if (b.stateTimer > 0) b.stateTimer -= dt;

  if (b.state === 'lunge') {
    if (b.stateTimer <= 0) {
      b.state = 'recover';
      b.stateTimer = 1.1;
      b.vx = 0;
      b.vy = 0;
    }
  } else if (b.state === 'recover') {
    if (b.stateTimer <= 0) b.state = 'hunt';
  } else if (b.lungeTimer <= 0) {
    // Charge at the drone, telegraphed by the pause before it.
    const dx = player.x - b.x;
    const dy = player.y - b.y;
    const len = Math.hypot(dx, dy) || 1;
    b.vx = (dx / len) * BOSS.lungeSpeed;
    b.vy = (dy / len) * BOSS.lungeSpeed;
    b.state = 'lunge';
    b.stateTimer = BOSS.lungeTime;
    b.lungeTimer = BOSS.lungeInterval;
  } else {
    steerToward(b, player.x, player.y, dt, 90);
  }

  if (b.burstTimer <= 0) {
    b.burstTimer = BOSS.burstInterval;
    const n = b.burst;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 + b.phase * 0.2;
      fireOrb(b.x, b.y, Math.cos(a), Math.sin(a));
    }
  }

  if (!b.summoned && b.hp <= b.maxHp / 2) {
    b.summoned = true;
    for (let i = 0; i < b.minis; i += 1) spawnMini(b.x, b.y);
  }

  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.x = Math.min(VIEW.width - b.radius, Math.max(b.radius, b.x));
  b.y = Math.min(VIEW.height - b.radius, Math.max(b.radius, b.y));
}

/** Hazards tick down: a vent erupts once and is gone, a shard drifts and fades,
 * a bramble waits until it is shot or the wave ends. */
export function updateHazard(h, dt) {
  h.flash = Math.max(0, h.flash - dt);
  h.phase = (h.phase ?? 0) + dt;
  h.life -= dt;
  if (h.hazard === 'vent') {
    if (h.state === 'telegraph') {
      h.stateTimer -= dt;
      if (h.stateTimer <= 0) {
        h.state = 'erupt';
        h.stateTimer = HAZARD.ventLife;
      }
    } else {
      h.stateTimer -= dt;
    }
  } else if (h.hazard === 'shard') {
    h.x += h.vx * dt;
    h.y += h.vy * dt;
    if (h.x < 20 || h.x > VIEW.width - 20) h.vx *= -1;
    if (h.y < 20 || h.y > VIEW.height - 20) h.vy *= -1;
  }
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
