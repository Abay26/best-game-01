// The harvester drone: movement, dash with i-frames, auto-aimed fire, nova bombs.
// The player object carries its own upgradeable stats so upgrades are plain data.
import { PLAYER, VIEW } from './config.js';

export function createPlayer() {
  return {
    x: VIEW.width / 2,
    y: VIEW.height / 2,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    hearts: PLAYER.hearts,
    maxHearts: PLAYER.hearts,
    speed: PLAYER.speed,
    fireInterval: PLAYER.fireInterval,
    fireTimer: 0,
    bulletDamage: PLAYER.bulletDamage,
    bulletSpeed: PLAYER.bulletSpeed,
    magnet: PLAYER.magnet,
    magnetLevel: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashCooldownBase: PLAYER.dashCooldown,
    dashDirX: 1,
    dashDirY: 0,
    invuln: 0,
    novas: PLAYER.novaStart,
    novaMax: PLAYER.novaMax,
    moteBonus: 0,
    alive: true,
    trail: [], // recent positions, drawn as a motion trail
  };
}

/** Nearest wisp to the player, or null when the field is empty. */
export function nearestWisp(player, wisps) {
  let best = null;
  let bestD = Infinity;
  for (const w of wisps) {
    const d = (w.x - player.x) * (w.x - player.x) + (w.y - player.y) * (w.y - player.y);
    if (d < bestD) {
      bestD = d;
      best = w;
    }
  }
  return best;
}

/** Nearest thing worth shooting: the closest wisp, or the closest shootable
 * hazard (a shard or a bramble — vents cannot be shot). The drone's fire
 * auto-aims, so hazards must be valid targets or they could never be cleared. */
export function nearestTarget(player, wisps, hazards) {
  let best = nearestWisp(player, wisps);
  let bestD = best ? (best.x - player.x) * (best.x - player.x) + (best.y - player.y) * (best.y - player.y) : Infinity;
  for (const h of hazards ?? []) {
    if (h.hazard === 'vent') continue;
    const d = (h.x - player.x) * (h.x - player.x) + (h.y - player.y) * (h.y - player.y);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
}

export function updatePlayer(player, input, state, dt, fireBullet) {
  if (!player.alive) return;
  player.invuln = Math.max(0, player.invuln - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);

  const dir = input.direction();
  if (player.dashTimer > 0) {
    // Dashing: locked direction, triple speed, untouchable.
    player.dashTimer -= dt;
    player.vx = player.dashDirX * PLAYER.dashSpeed;
    player.vy = player.dashDirY * PLAYER.dashSpeed;
    player.invuln = Math.max(player.invuln, 0.05);
  } else {
    player.vx = dir.x * player.speed;
    player.vy = dir.y * player.speed;
    if (input.dash && player.dashCooldown <= 0 && (dir.x !== 0 || dir.y !== 0)) {
      player.dashTimer = PLAYER.dashTime;
      player.dashDirX = dir.x;
      player.dashDirY = dir.y;
      player.dashCooldown = player.dashCooldownBase;
    }
  }

  player.x = Math.min(VIEW.width - player.radius, Math.max(player.radius, player.x + player.vx * dt));
  player.y = Math.min(VIEW.height - player.radius, Math.max(player.radius, player.y + player.vy * dt));

  player.trail.push({ x: player.x, y: player.y, life: 0.22 });
  if (player.trail.length > 14) player.trail.shift();
  for (const t of player.trail) t.life -= dt;
  while (player.trail.length > 0 && player.trail[0].life <= 0) player.trail.shift();

  // Fire: hold Space, bullets auto-aim at the nearest wisp or shootable hazard;
  // with nothing to aim at they fly in the direction the drone is moving (or up
  // when still).
  player.fireTimer -= dt;
  if (input.fire && player.fireTimer <= 0) {
    player.fireTimer = player.fireInterval;
    const target = nearestTarget(player, state.wisps, state.hazards);
    let dx;
    let dy;
    if (target) {
      const len = Math.hypot(target.x - player.x, target.y - player.y) || 1;
      dx = (target.x - player.x) / len;
      dy = (target.y - player.y) / len;
    } else if (dir.x !== 0 || dir.y !== 0) {
      dx = dir.x;
      dy = dir.y;
    } else {
      dx = 0;
      dy = -1;
    }
    fireBullet(player.x + dx * (player.radius + 6), player.y + dy * (player.radius + 6), dx, dy);
  }
}
