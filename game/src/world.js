// Lumen Harvest — the world: one step of the rules. It owns the state (player,
// wisps, bullets, motes, particles, bolts), the wave flow, the combo, the kill
// streaks, the overdrive meter, collisions and the win/lose conditions. The
// renderer only paints this state; the loop only steps it.
import { CHAIN, COMBO, FRENZY, HAZARD, MOTE, OVERDRIVE, PALETTE, STREAK, VIEW, WAVES_TOTAL } from './config.js';
import { realmById } from './arenas.js';
import { createPlayer, updatePlayer } from './player.js';
import {
  nearestWispInRange,
  spawnBolt,
  spawnBullet,
  spawnFloater,
  spawnHazard,
  spawnHeart,
  spawnMote,
  spawnOrb,
  spawnParticle,
  spawnWisp,
  updateBoss,
  updateHazard,
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
export const EVENT_OVERDRIVE = 1024;
export const EVENT_CHAIN = 2048;
export const EVENT_STREAK = 4096;

export function comboMultiplier(state) {
  const base = 1 + Math.min(Math.floor(state.combo / COMBO.perLevel), COMBO.maxLevel - 1);
  // Frenzy doubles every score gain while it burns.
  return state.frenzyTime > 0 ? base * 2 : base;
}

export function createWorld(rng) {
  const world = {
    rng,
    realm: realmById('void'),
    player: createPlayer(),
    wisps: [],
    bullets: [],
    orbs: [],
    motes: [],
    hearts: [], // heart pickups dropped by elites and bosses
    particles: [],
    floaters: [],
    hazards: [],
    stars: [],
    ambient: [],
    score: 0,
    combo: 0,
    comboTimer: 0,
    frenzyTime: 0, // seconds of doubled score left; 0 means no frenzy
    endless: false, // Endless Tide: waves past 10, no boss, no win
    eliteRolled: false, // whether this wave's first-wisp elite roll is spent
    maxCombo: 0,
    streak: 0, // kills since the last hit
    streakTier: 0, // streak tiers already called out this run
    killsSinceChain: 0,
    wave: 1,
    waveState: 'fight', // fight | upgrade | done
    queue: [],
    spawnTimer: 1,
    moteTimer: 0.5,
    hazardTimer: HAZARD.spawnInterval,
    time: 0,
    shake: 0,
    flash: 0,
    hitstop: 0, // brief freeze after a boss falls
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
    // Endless Tide never meets a boss: past wave 10 it reuses the wave-9 table,
    // and wave 10 itself does too, so the run has no end and no win.
    world.queue = world.endless
      ? waveQueue(Math.min(world.wave, 9), rng, world.realm.id)
      : waveQueue(world.wave, rng, world.realm.id);
    world.spawnTimer = 0.9;
    world.eliteRolled = false;
    // The aegis shield, if the drone carries it, recharges at every wave.
    if (world.player.aegis) world.player.shield = 1;
    const bossWave = world.wave === WAVES_TOTAL && !world.endless;
    const endlessWave = world.endless && world.wave > WAVES_TOTAL;
    world.banner = {
      text: bossWave ? world.realm.boss.name.toUpperCase() : endlessWave ? `WAVE ${world.wave} — ENDLESS` : `WAVE ${world.wave}`,
      sub: bossWave ? 'THE BOSS OF THE REALM' : endlessWave ? 'NO BOSS · NO END · JUST LIGHT' : `${world.queue.length} wisps incoming`,
      timer: 2.2,
    };
  }

  function seedAmbient() {
    world.ambient = [];
    for (let i = 0; i < 42; i += 1) {
      world.ambient.push({
        x: rng.range(0, VIEW.width),
        y: rng.range(0, VIEW.height),
        r: rng.range(1, 2.6),
        vx: rng.range(-8, 8),
        vy: world.realm.ambient === 'embers' ? rng.range(-26, -10) : world.realm.ambient === 'snow' ? rng.range(10, 26) : rng.range(-6, 6),
        tw: rng.range(0, Math.PI * 2),
      });
    }
  }

  function reset(realm, opts) {
    world.realm = realmById(realm && realm.id ? realm.id : realm);
    world.endless = Boolean(opts && opts.endless);
    world.player = createPlayer();
    world.wisps = [];
    world.bullets = [];
    world.orbs = [];
    world.motes = [];
    world.hearts = [];
    world.particles = [];
    world.floaters = [];
    world.hazards = [];
    world.score = 0;
    world.combo = 0;
    world.comboTimer = 0;
    world.frenzyTime = 0;
    world.eliteRolled = false;
    world.maxCombo = 0;
    world.streak = 0;
    world.streakTier = 0;
    world.killsSinceChain = 0;
    world.wave = 1;
    world.waveState = 'fight';
    world.time = 0;
    world.shake = 0;
    world.flash = 0;
    world.hitstop = 0;
    world.upgrades = [];
    world.lastUpgradeIds = [];
    world.kills = 0;
    world.motesCollected = 0;
    world.wavesCleared = 0;
    world.moteTimer = 0.5;
    world.hazardTimer = HAZARD.spawnInterval;
    seedAmbient();
    // A few motes already drifting so the field never opens empty.
    for (let i = 0; i < 5; i += 1) {
      world.motes.push(spawnMoteAt(rng.range(80, VIEW.width - 80), rng.range(80, VIEW.height - 80)));
    }
    startWave();
  }

  function seedBackdrop() {
    // Title-screen backdrop: wisps and motes drifting with nobody to fight.
    seedAmbient();
    for (let i = 0; i < 5; i += 1) {
      const w = spawnWisp(rng, rng.pick(['chaser', 'weaver', 'splitter']), rng.range(60, VIEW.width - 60), rng.range(60, VIEW.height - 60), 1, world.realm);
      w.vx = rng.range(-30, 30);
      w.vy = rng.range(-30, 30);
      world.wisps.push(w);
    }
    for (let i = 0; i < 7; i += 1) {
      world.motes.push(spawnMoteAt(rng.range(60, VIEW.width - 60), rng.range(60, VIEW.height - 60)));
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

  function fillOverdrive(amount) {
    const p = world.player;
    if (p.overdriveTime > 0) return;
    p.overdrive = Math.min(OVERDRIVE.max, p.overdrive + amount * p.overdriveFill);
  }

  function spawnMoteAt(x, y) {
    // About one mote in eight comes up golden; Lumen Greed roughly doubles that.
    const p = world.player;
    const chance = MOTE.goldenChance + (p.goldenBoost ? 0.13 : 0);
    return spawnMote(rng, x, y, undefined, rng.chance(chance));
  }

  function fireChain() {
    // Chain lightning: the nearest wisp within range takes a hit, drawn as a
    // bolt from the drone. Returns true when it zapped something.
    const p = world.player;
    const target = nearestWispInRange(world.wisps, p.x, p.y, CHAIN.range);
    if (!target) return false;
    spawnBolt(world.particles, p.x, p.y, target.x, target.y, '#7dffd4');
    spawnParticle(world.particles, target.x, target.y, '#7dffd4', 10, 200, 0.4, 3);
    target.hp -= CHAIN.damage;
    target.flash = 0.09;
    if (target.hp <= 0) {
      const idx = world.wisps.indexOf(target);
      if (idx >= 0) killWisp(idx, true);
    }
    return true;
  }

  function callStreak() {
    // A streak tier, called out once per run: a banner, a bonus, a sound.
    const tier = STREAK.tiers[world.streakTier];
    if (!tier || world.streak < tier.kills) return 0;
    world.streakTier += 1;
    world.score += tier.bonus;
    world.banner = { text: tier.name, sub: `+${tier.bonus} — ${world.streak} KILLS WITHOUT A HIT`, timer: 2.0 };
    spawnFloater(world.floaters, world.player.x, world.player.y - 34, `+${tier.bonus}`, PALETTE.gold);
    return EVENT_STREAK;
  }

  function killWisp(index, awardScore) {
    const w = world.wisps[index];
    world.wisps.splice(index, 1);
    world.kills += 1;
    world.streak += 1;
    world.killsSinceChain += 1;
    spawnParticle(world.particles, w.x, w.y, w.color, w.type === 'splitter' ? 22 : 14, 190, 0.6, 3.2);
    fillOverdrive(OVERDRIVE.perKill);
    if (awardScore) {
      const gained = w.score * comboMultiplier(world);
      world.score += gained;
      spawnFloater(world.floaters, w.x, w.y, `+${gained}`, w.color);
      // A wisp bursts into motes: the risk of fighting pays in light. A boss
      // bursts into a shower — and its fall is worth a wave on its own. A
      // warden bursts into three; a splitter into two.
      const drops = w.type === 'boss' ? 5 : w.type === 'splitter' ? 2 : w.type === 'warden' ? 3 : 1;
      for (let i = 0; i < drops; i += 1) world.motes.push(spawnMoteAt(w.x, w.y));
      // Elites drop a heart half the time; a boss always leaves one behind.
      if (w.elite && rng.chance(0.5)) world.hearts.push(spawnHeart(rng, w.x, w.y));
      if (w.type === 'boss') {
        world.hearts.push(spawnHeart(rng, w.x, w.y));
        spawnParticle(world.particles, w.x, w.y, '#ffffff', 40, 320, 1.0, 4);
        spawnFloater(world.floaters, w.x, w.y - 34, `${w.name} SLAIN`, PALETTE.gold);
        world.hitstop = 0.22; // the world holds its breath as the boss falls
        world.shake = 24;
      }
      if (w.type === 'splitter') {
        for (let i = 0; i < 2; i += 1) {
          const mini = spawnWisp(rng, 'mini', w.x + rng.range(-16, 16), w.y + rng.range(-16, 16), world.wave, world.realm);
          world.wisps.push(mini);
        }
      }
    }
  }

  function hurtPlayer(fromX, fromY) {
    const p = world.player;
    if (!p.alive || p.invuln > 0 || p.dashTimer > 0) return false;
    // The aegis shield, when up, eats the hit instead of a heart.
    if (p.shield > 0) {
      p.shield = 0;
      p.invuln = 1.1;
      spawnParticle(world.particles, p.x, p.y, '#7dffd4', 16, 200, 0.5, 3.2);
      spawnFloater(world.floaters, p.x, p.y - 30, 'SHIELD DOWN', '#7dffd4');
      return true;
    }
    p.hearts -= 1;
    p.invuln = 1.1;
    world.combo = 0;
    world.comboTimer = 0;
    world.streak = 0;
    world.streakTier = 0;
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
      world.streak += 1;
    }
    world.orbs = [];
    return true;
  }

  function startOverdrive() {
    const p = world.player;
    if (p.overdrive < OVERDRIVE.max || p.overdriveTime > 0) return false;
    p.overdrive = 0;
    p.overdriveTime = p.overdriveDuration;
    world.flash = 0.3;
    world.shake = 12;
    spawnParticle(world.particles, p.x, p.y, PALETTE.overdrive, 30, 300, 0.7, 3.6);
    world.banner = { text: 'OVERDRIVE', sub: 'SURGE FIRE · SURGE SPEED · PIERCING SHOTS', timer: 1.6 };
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
    world.hearts = [];
    world.frenzyTime = 0;
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
    // Frenzy burns down; when it ends the combo resets to zero and must be
    // rebuilt from scratch.
    if (world.frenzyTime > 0) {
      world.frenzyTime -= dt;
      if (world.frenzyTime <= 0) {
        world.frenzyTime = 0;
        world.combo = 0;
        world.comboTimer = 0;
      }
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

    // Overdrive: Q at a full meter starts the surge.
    if (input.overdrive && startOverdrive()) events |= EVENT_OVERDRIVE;
    // Nova bomb.
    if (input.nova && fireNova()) events |= EVENT_NOVA;

    const bulletsBefore = world.bullets.length;
    const dashBefore = p.dashTimer;
    updatePlayer(p, input, world, dt, (x, y, dx, dy, pierce) => {
      world.bullets.push(spawnBullet(x, y, dx, dy, p.bulletSpeed, p.bulletDamage, pierce));
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
        // From wave 4 on, the first wisp of the wave has a 1-in-3 chance to
        // come up elite: double health, wider body, double score, gold ring.
        let elite = false;
        if (world.wave >= 4 && !world.eliteRolled) {
          world.eliteRolled = true;
          elite = rng.chance(1 / 3);
        }
        const w = spawnWisp(rng, type, pos.x, pos.y, world.wave, world.realm, elite);
        // Endless Tide past wave 10: every wisp is tougher, +10% hp per wave.
        if (world.endless && world.wave > WAVES_TOTAL && type !== 'boss') {
          const scale = 1 + 0.1 * (world.wave - WAVES_TOTAL);
          w.hp = Math.ceil(w.hp * scale);
          w.maxHp = w.hp;
        }
        world.wisps.push(w);
        spawnParticle(world.particles, pos.x, pos.y, w.color, 6, 60, 0.4, 2.5);
      }
    }
    // Hazards: one every few seconds from wave 2 on, away from the drone.
    if (world.wave >= HAZARD.firstWave) {
      world.hazardTimer -= dt;
      if (world.hazardTimer <= 0) {
        world.hazardTimer = HAZARD.spawnInterval * rng.range(0.85, 1.2);
        let hx = rng.range(70, VIEW.width - 70);
        let hy = rng.range(70, VIEW.height - 70);
        if (Math.hypot(hx - p.x, hy - p.y) < 190) {
          hx = VIEW.width - hx;
          hy = VIEW.height - hy;
        }
        world.hazards.push(spawnHazard(rng, world.realm.hazard, hx, hy));
      }
    }
    world.moteTimer -= dt;
    if (world.moteTimer <= 0) {
      world.moteTimer = MOTE.spawnInterval * rng.range(0.8, 1.25);
      if (world.motes.length < MOTE.maxOnField) {
        world.motes.push(spawnMoteAt(rng.range(50, VIEW.width - 50), rng.range(50, VIEW.height - 50)));
      }
    }

    // Wisps (and the boss, which fights by its own rules).
    for (const w of world.wisps) {
      if (w.type === 'boss') {
        updateBoss(w, p, dt, world.time, (x, y, dx, dy, speed) => {
          world.orbs.push(spawnOrb(x, y, dx, dy, speed));
        }, (x, y) => {
          const mini = spawnWisp(rng, 'mini', x + rng.range(-24, 24), y + rng.range(-24, 24), world.wave, world.realm);
          world.wisps.push(mini);
        });
      } else {
        updateWisp(w, p, dt, world.time, (x, y, dx, dy, speed) => {
          world.orbs.push(spawnOrb(x, y, dx, dy, speed));
        });
      }
    }

    // Hazards: tick, erupt, strike, and cut.
    for (let i = world.hazards.length - 1; i >= 0; i -= 1) {
      const h = world.hazards[i];
      updateHazard(h, dt, p);
      if (h.life <= 0 || (h.hazard === 'vent' && h.state === 'erupt' && h.stateTimer <= 0)) {
        if (h.hazard === 'vent' && h.state === 'erupt') {
          spawnParticle(world.particles, h.x, h.y, world.realm.hazardColor, 26, 260, 0.6, 3.6);
        }
        world.hazards.splice(i, 1);
        continue;
      }
      if (!p.alive) continue;
      if (h.hazard === 'vent' && h.state === 'erupt') {
        const rr = HAZARD.ventRadius + p.radius;
        if ((h.x - p.x) * (h.x - p.x) + (h.y - p.y) * (h.y - p.y) < rr * rr) {
          if (hurtPlayer(h.x, h.y)) events |= EVENT_HIT;
        }
      } else if (h.hazard === 'storm' && h.state === 'strike') {
        // Lightning lands where the drone stood when the strike was telegraphed.
        if (!h.struck) {
          h.struck = true;
          spawnBolt(world.particles, h.x, h.y, h.strikeX, h.strikeY, world.realm.hazardColor);
          spawnParticle(world.particles, h.strikeX, h.strikeY, world.realm.hazardColor, 18, 240, 0.4, 3.2);
        }
        const rr = HAZARD.stormStrikeRadius + p.radius;
        if ((h.strikeX - p.x) * (h.strikeX - p.x) + (h.strikeY - p.y) * (h.strikeY - p.y) < rr * rr) {
          if (hurtPlayer(h.strikeX, h.strikeY)) events |= EVENT_HIT;
        }
      } else if (h.hazard !== 'vent' && h.hazard !== 'storm') {
        const rr = h.radius + p.radius - 2;
        if ((h.x - p.x) * (h.x - p.x) + (h.y - p.y) * (h.y - p.y) < rr * rr) {
          if (hurtPlayer(h.x, h.y)) events |= EVENT_HIT;
        }
      }
    }

    // Bullets: fly, hit wisps, and keep going while they still pierce.
    for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
      const b = world.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > VIEW.width + 20 || b.y < -20 || b.y > VIEW.height + 20) {
        world.bullets.splice(i, 1);
        continue;
      }
      let spent = false;
      for (let j = world.wisps.length - 1; j >= 0; j -= 1) {
        const w = world.wisps[j];
        if (b.hit.has(w)) continue;
        const rr = w.radius + b.radius;
        if ((w.x - b.x) * (w.x - b.x) + (w.y - b.y) * (w.y - b.y) < rr * rr) {
          b.hit.add(w);
          w.hp -= b.damage;
          w.flash = 0.09;
          spawnParticle(world.particles, b.x, b.y, w.color, 3, 90, 0.25, 2);
          if (w.hp <= 0) {
            killWisp(j, true);
            events |= EVENT_KILL;
          }
          if (b.pierce > 0) {
            b.pierce -= 1; // through it goes, into the next wisp
          } else {
            spent = true;
          }
          break;
        }
      }
      if (spent) {
        world.bullets.splice(i, 1);
        continue;
      }
      // Shards, brambles and storm cells can be shot apart; vents cannot.
      if (world.bullets[i] === b) {
        for (let j = world.hazards.length - 1; j >= 0; j -= 1) {
          const h = world.hazards[j];
          if (h.hazard === 'vent') continue;
          const rr = h.radius + b.radius;
          if ((h.x - b.x) * (h.x - b.x) + (h.y - b.y) * (h.y - b.y) < rr * rr) {
            h.hp -= b.damage;
            h.flash = 0.09;
            spawnParticle(world.particles, b.x, b.y, world.realm.hazardColor, 3, 90, 0.25, 2);
            world.bullets.splice(i, 1);
            if (h.hp <= 0) {
              world.hazards.splice(j, 1);
              spawnParticle(world.particles, h.x, h.y, world.realm.hazardColor, 14, 170, 0.5, 3);
              world.score += 15;
              spawnFloater(world.floaters, h.x, h.y, '+15', world.realm.hazardColor);
            }
            break;
          }
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
        world.maxCombo = Math.max(world.maxCombo, world.combo);
        world.comboTimer = COMBO.window;
        world.motesCollected += 1;
        fillOverdrive(OVERDRIVE.perMote);
        const gained = (m.value + p.moteBonus) * comboMultiplier(world);
        world.score += gained;
        spawnFloater(world.floaters, m.x, m.y, `+${gained}`, m.golden ? PALETTE.gold : PALETTE.mote);
        spawnParticle(world.particles, m.x, m.y, m.golden ? PALETTE.gold : PALETTE.mote, 6, 110, 0.35, 2.4);
        events |= EVENT_PICKUP;
        // A 25 combo sets the harvest on fire: six seconds of doubled score.
        if (world.combo >= FRENZY.combo && world.frenzyTime <= 0) {
          world.frenzyTime = FRENZY.duration;
          world.banner = { text: 'FRENZY — DOUBLE LIGHT', sub: 'ALL SCORE DOUBLED FOR 6s', timer: 2.0 };
        }
      }
    }

    // Hearts: drift, magnet, pickup — a full heart becomes bonus score instead.
    for (let i = world.hearts.length - 1; i >= 0; i -= 1) {
      const h = world.hearts[i];
      updateMote(h, p, dt);
      if (h.life <= 0) {
        world.hearts.splice(i, 1);
        continue;
      }
      const rr = 26;
      if (p.alive && (h.x - p.x) * (h.x - p.x) + (h.y - p.y) * (h.y - p.y) < rr * rr) {
        world.hearts.splice(i, 1);
        if (p.hearts < p.maxHearts) {
          p.hearts += 1;
          spawnFloater(world.floaters, h.x, h.y, '+1 ♥', PALETTE.danger);
        } else {
          world.score += 25;
          spawnFloater(world.floaters, h.x, h.y, '+25', PALETTE.gold);
        }
        spawnParticle(world.particles, h.x, h.y, PALETTE.danger, 8, 120, 0.4, 2.6);
        events |= EVENT_PICKUP;
      }
    }

    // Chain lightning, every Nth kill, when the drone carries the coil.
    // Chain Coil II shortens the count to every 4th kill.
    if (p.chain && world.killsSinceChain >= (p.chainEvery ?? CHAIN.everyKills)) {
      world.killsSinceChain = 0;
      if (fireChain()) events |= EVENT_CHAIN;
    }
    // Streak callouts.
    events |= callStreak();

    updateFx(dt);

    if (!p.alive) {
      events |= EVENT_OVER;
      return events;
    }

    // Wave cleared: queue empty and field empty. In Endless Tide there is no
    // win — every cleared wave just opens the upgrade screen and the next wave.
    if (world.queue.length === 0 && world.wisps.length === 0) {
      world.wavesCleared += 1;
      const bonus = 100 * world.wave;
      world.score += bonus;
      spawnFloater(world.floaters, p.x, p.y - 30, `WAVE BONUS +${bonus}`, PALETTE.gold);
      if (world.wave >= WAVES_TOTAL && !world.endless) {
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
      if (pt.kind === 'bolt') {
        // Lightning bolts hang for a blink, then vanish.
        pt.life -= dt;
        if (pt.life <= 0) world.particles.splice(i, 1);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 1 - 2.4 * dt;
      pt.vy *= 1 - 2.4 * dt;
      pt.life -= dt;
      if (pt.life <= 0) world.particles.splice(i, 1);
    }
    // Ambient life of the realm: embers rise, snow falls, spores drift, rain slants.
    for (const a of world.ambient) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.tw += dt;
      if (a.y < -8) {
        a.y = VIEW.height + 8;
        a.x = rng.range(0, VIEW.width);
      } else if (a.y > VIEW.height + 8) {
        a.y = -8;
        a.x = rng.range(0, VIEW.width);
      }
      if (a.x < -8) a.x = VIEW.width + 8;
      if (a.x > VIEW.width + 8) a.x = -8;
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
