// Lumen Harvest — everything the eye sees. One canvas, one draw per frame: the
// realm's own sky and drifting life, the arena, the HUD, the wave banners, and
// the seven screens (title, realm map, play, upgrade, paused, game over and win).
// The world state is read-only here.
import { COMBO, OVERDRIVE, PALETTE, REALMS_TOTAL, VIEW, WAVES_TOTAL } from './config.js';
import { REALMS } from './arenas.js';
import { isOverdrive } from './player.js';
import { isUnlocked, overallBest, overallBestCombo, realmBest, realmBestCombo } from './save.js';
import { comboMultiplier } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_SELECT = 'select';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** '#rrggbb' to an rgba() string, so a palette colour can fade. */
function hexA(hex, alpha) {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function starShape(ctx, x, y, r, points, rot) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = rot + (i * Math.PI) / points;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** A jagged lightning bolt between two points, drawn in three segments. */
function boltShape(ctx, x1, y1, x2, y2, jitter) {
  const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * jitter;
  const my = (y1 + y2) / 2 + (Math.random() - 0.5) * jitter;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(mx, my);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;

  function drawBackground(state) {
    const pal = state.realm.palette;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    g.addColorStop(0, pal.bgTop);
    g.addColorStop(1, pal.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // Two slow nebulae, drifting with time, in the realm's own colours.
    const t = state.time;
    const nebA = ctx.createRadialGradient(220 + Math.sin(t * 0.05) * 30, 150, 10, 220, 150, 260);
    nebA.addColorStop(0, hexA(pal.nebulaB, 0.55));
    nebA.addColorStop(1, hexA(pal.nebulaB, 0));
    ctx.fillStyle = nebA;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const nebB = ctx.createRadialGradient(760 + Math.cos(t * 0.04) * 30, 460, 10, 760, 460, 280);
    nebB.addColorStop(0, hexA(pal.nebulaA, 0.55));
    nebB.addColorStop(1, hexA(pal.nebulaA, 0));
    ctx.fillStyle = nebB;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    for (const s of state.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(s.tw));
      ctx.globalAlpha = a * s.depth;
      ctx.fillStyle = pal.star;
      circle(ctx, s.x, s.y, s.r);
    }
    ctx.globalAlpha = 1;

    // The realm's drifting life: embers rise, snow falls, spores wander, rain slants,
    // aurora ribbons drift sideways in green and violet.
    for (const a of state.ambient) {
      const flicker = 0.45 + 0.55 * Math.abs(Math.sin(a.tw * 2));
      ctx.globalAlpha = flicker * 0.8;
      if (state.realm.ambient === 'rain') {
        ctx.strokeStyle = 'rgba(125, 255, 212, 0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x - 4, a.y + 12);
        ctx.stroke();
      } else if (state.realm.ambient === 'aurora') {
        ctx.strokeStyle = a.r > 1.8 ? 'rgba(125, 242, 160, 0.6)' : 'rgba(179, 136, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(a.x - 9, a.y);
        ctx.quadraticCurveTo(a.x, a.y - 4, a.x + 9, a.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = state.realm.ambient === 'snow' ? '#ffffff' : pal.accent;
        circle(ctx, a.x, a.y, a.r);
      }
    }
    ctx.globalAlpha = 1;

    // The ground each realm stands on: ash dunes, ice shards, a drowned reef.
    if (state.realm.ambient === 'embers') {
      ctx.fillStyle = 'rgba(20, 8, 2, 0.85)';
      ctx.beginPath();
      ctx.moveTo(0, VIEW.height);
      ctx.lineTo(0, VIEW.height - 26);
      for (let x = 0; x <= VIEW.width; x += 80) {
        ctx.lineTo(x + 40, VIEW.height - 52 - ((x / 80) % 2) * 14);
        ctx.lineTo(x + 80, VIEW.height - 26);
      }
      ctx.lineTo(VIEW.width, VIEW.height);
      ctx.closePath();
      ctx.fill();
    } else if (state.realm.ambient === 'snow') {
      ctx.fillStyle = 'rgba(190, 230, 255, 0.16)';
      ctx.beginPath();
      ctx.moveTo(0, VIEW.height);
      for (let x = 0; x <= VIEW.width; x += 64) {
        const h = 18 + ((x / 64) % 3) * 12;
        ctx.lineTo(x + 32, VIEW.height - h);
        ctx.lineTo(x + 64, VIEW.height);
      }
      ctx.lineTo(VIEW.width, VIEW.height);
      ctx.closePath();
      ctx.fill();
    } else if (state.realm.ambient === 'rain') {
      ctx.fillStyle = 'rgba(4, 20, 26, 0.8)';
      ctx.beginPath();
      ctx.moveTo(0, VIEW.height);
      for (let x = 0; x <= VIEW.width; x += 48) {
        const h = 14 + ((x / 48) % 4) * 9;
        ctx.lineTo(x + 12, VIEW.height - h);
        ctx.lineTo(x + 24, VIEW.height - h * 0.4);
        ctx.lineTo(x + 36, VIEW.height - h);
        ctx.lineTo(x + 48, VIEW.height);
      }
      ctx.lineTo(VIEW.width, VIEW.height);
      ctx.closePath();
      ctx.fill();
    }

    // Arena border, in the realm's accent.
    ctx.strokeStyle = pal.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, VIEW.width - 12, VIEW.height - 12);
  }

  function drawMotes(state) {
    const pal = state.realm.palette;
    for (const m of state.motes) {
      const pulse = 1 + Math.sin(m.phase * 3) * 0.15;
      const fade = m.life < 3 ? 0.35 + 0.65 * (m.life / 3) : 1;
      ctx.globalAlpha = fade;
      // Golden motes glow gold with a ring: worth triple, gone in eight seconds.
      if (m.golden) {
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius * pulse + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffd700';
        starShape(ctx, m.x, m.y, m.radius * pulse, 4, m.phase * 0.5);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff8d6';
        circle(ctx, m.x, m.y, m.radius * 0.38 * pulse);
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.shadowColor = pal.mote;
      ctx.shadowBlur = 14;
      ctx.fillStyle = pal.mote;
      starShape(ctx, m.x, m.y, m.radius * pulse, 4, m.phase * 0.5);
      ctx.shadowBlur = 0;
      ctx.fillStyle = pal.moteCore;
      circle(ctx, m.x, m.y, m.radius * 0.38 * pulse);
      ctx.globalAlpha = 1;
    }
  }

  function drawHearts(state) {
    // Heart pickups: a pulsing red ♥, dropped by elites and bosses.
    for (const h of state.hearts) {
      const pulse = 1 + Math.sin(h.phase * 4) * 0.15;
      const fade = h.life < 3 ? 0.35 + 0.65 * (h.life / 3) : 1;
      ctx.globalAlpha = fade;
      ctx.shadowColor = PALETTE.danger;
      ctx.shadowBlur = 16;
      ctx.fillStyle = PALETTE.danger;
      ctx.font = `bold ${Math.round(24 * pulse)}px "Trebuchet MS", "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('♥', h.x, h.y + 8);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  function drawWisps(state) {
    for (const w of state.wisps) {
      ctx.save();
      ctx.translate(w.x, w.y);
      if (w.type === 'boss') {
        // The boss: a huge crowned star with its name above it.
        const pulse = 1 + Math.sin(w.phase * 2) * 0.06;
        ctx.shadowColor = w.color;
        ctx.shadowBlur = 26;
        ctx.fillStyle = w.flash > 0 ? '#ffffff' : w.color;
        starShape(ctx, 0, 0, w.radius * pulse, 10, w.phase * 0.3);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0a0e1e';
        circle(ctx, 0, 0, w.radius * 0.5);
        ctx.fillStyle = '#ffffff';
        circle(ctx, -8, -4, 4);
        circle(ctx, 8, -4, 4);
        ctx.fillStyle = PALETTE.text;
        ctx.font = 'bold 15px "Trebuchet MS", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(w.name.toUpperCase(), 0, -w.radius - 16);
        ctx.restore();
        continue;
      }
      // Telegraph ring while a dasher winds up its lunge.
      if (w.type === 'dasher' && w.state === 'windup') {
        const k = 1 - w.stateTimer / 0.55;
        ctx.strokeStyle = `rgba(255, 56, 96, ${0.4 + 0.5 * k})`;
        ctx.lineWidth = 2 + 2 * k;
        ctx.beginPath();
        ctx.arc(0, 0, w.radius + 6 + 14 * k, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Aim line while a sniper draws its bead on the drone.
      if (w.type === 'sniper' && w.state === 'aim') {
        const k = 1 - w.stateTimer / 0.7;
        ctx.strokeStyle = `rgba(255, 93, 242, ${0.25 + 0.6 * k})`;
        ctx.lineWidth = 1.5 + 1.5 * k;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w.aimX - w.x, w.aimY - w.y);
        ctx.stroke();
      }
      ctx.shadowColor = w.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = w.flash > 0 ? '#ffffff' : w.color;
      if (w.type === 'weaver') {
        ctx.rotate(w.phase * 0.8);
        ctx.fillRect(-w.radius * 0.8, -w.radius * 0.8, w.radius * 1.6, w.radius * 1.6);
      } else if (w.type === 'dasher') {
        ctx.rotate(Math.atan2(w.vy, w.vx) + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -w.radius - 4);
        ctx.lineTo(w.radius * 0.9, w.radius);
        ctx.lineTo(-w.radius * 0.9, w.radius);
        ctx.closePath();
        ctx.fill();
      } else if (w.type === 'sniper') {
        // A long diamond, pointed at its prey.
        ctx.rotate(Math.atan2(state.player.y - w.y, state.player.x - w.x));
        ctx.beginPath();
        ctx.moveTo(w.radius + 6, 0);
        ctx.lineTo(0, w.radius * 0.6);
        ctx.lineTo(-w.radius - 4, 0);
        ctx.lineTo(0, -w.radius * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        circle(ctx, 4, 0, 2.5);
      } else if (w.type === 'orbiter') {
        // A ringed orbiter: its orbit ring shows while it circles.
        if (w.state === 'hunt') {
          ctx.strokeStyle = hexA(w.color, 0.35);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, w.radius + 12, 0, Math.PI * 2);
          ctx.stroke();
        }
        starShape(ctx, 0, 0, w.radius, 5, w.phase * 1.2);
      } else if (w.type === 'warden') {
        // A slow armored hexagon with a ring: the tank of the field.
        ctx.beginPath();
        for (let i = 0; i < 6; i += 1) {
          const a = w.phase * 0.2 + (i / 6) * Math.PI * 2;
          const px = Math.cos(a) * w.radius;
          const py = Math.sin(a) * w.radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 209, 102, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, w.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#0a0e1e';
        circle(ctx, 0, 0, w.radius * 0.4);
        ctx.fillStyle = '#ffffff';
        circle(ctx, 0, 0, w.radius * 0.18);
      } else if (w.type === 'splitter' || w.type === 'mini') {
        starShape(ctx, 0, 0, w.radius, 6, w.phase * 0.6);
      } else {
        // Chaser and spitter: spiked orbs with a watching eye.
        starShape(ctx, 0, 0, w.radius, 8, w.phase * 0.4);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0a0e1e';
        circle(ctx, 0, 0, w.radius * 0.45);
        ctx.fillStyle = '#ffffff';
        circle(ctx, 0, 0, w.radius * 0.2);
      }
      ctx.shadowBlur = 0;
      // An elite wisp wears a gold ring: double health, double score.
      if (w.elite) {
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.95)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, w.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Hit-point pips under damaged wisps.
      if (w.hp < w.maxHp && w.maxHp > 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (let i = 0; i < w.maxHp; i += 1) {
          circle(ctx, (i - (w.maxHp - 1) / 2) * 9, w.radius + 9, i < w.hp ? 2.6 : 1.6);
        }
      }
      ctx.restore();
    }
  }

  function drawHazards(state) {
    const hc = state.realm.hazardColor;
    for (const h of state.hazards) {
      ctx.save();
      ctx.translate(h.x, h.y);
      if (h.hazard === 'vent') {
        // A telegraphed ring that fills as the eruption nears, then a bright burst.
        if (h.state === 'telegraph') {
          const k = 1 - h.stateTimer / 1.25;
          ctx.strokeStyle = hexA(hc, 0.35 + 0.55 * k);
          ctx.lineWidth = 2 + 2 * k;
          ctx.beginPath();
          ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = hexA(hc, 0.12 + 0.25 * k);
          ctx.beginPath();
          ctx.arc(0, 0, h.radius * k, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = hexA(hc, 0.9);
          ctx.font = 'bold 13px "Trebuchet MS", "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', 0, 5);
        } else {
          ctx.shadowColor = hc;
          ctx.shadowBlur = 30;
          ctx.fillStyle = hexA(hc, 0.85);
          circle(ctx, 0, 0, h.radius);
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffffff';
          circle(ctx, 0, 0, h.radius * 0.45);
        }
      } else if (h.hazard === 'shard') {
        ctx.rotate(h.phase * 0.9);
        ctx.shadowColor = hc;
        ctx.shadowBlur = 12;
        ctx.fillStyle = h.flash > 0 ? '#ffffff' : hc;
        ctx.beginPath();
        ctx.moveTo(0, -h.radius - 6);
        ctx.lineTo(h.radius * 0.6, 0);
        ctx.lineTo(0, h.radius + 6);
        ctx.lineTo(-h.radius * 0.6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        circle(ctx, 0, 0, 3);
      } else if (h.hazard === 'storm') {
        // A drifting storm cell: a dark cloud that crackles, telegraphs a strike
        // circle at the drone's feet, then throws a bolt down it.
        ctx.shadowColor = hc;
        ctx.shadowBlur = 16;
        ctx.fillStyle = h.flash > 0 ? '#ffffff' : 'rgba(10, 30, 36, 0.9)';
        circle(ctx, -8, 2, 16);
        circle(ctx, 8, -2, 18);
        circle(ctx, 0, 6, 14);
        ctx.shadowBlur = 0;
        ctx.fillStyle = hexA(hc, 0.7 + 0.3 * Math.sin(h.phase * 5));
        starShape(ctx, 0, -2, 7, 4, h.phase);
        if (h.state === 'telegraph') {
          const k = 1 - h.stateTimer / 0.8;
          ctx.strokeStyle = hexA(hc, 0.4 + 0.55 * k);
          ctx.lineWidth = 2 + 2 * k;
          ctx.beginPath();
          ctx.arc(h.strikeX - h.x, h.strikeY - h.y, 46, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = hexA(hc, 0.1 + 0.22 * k);
          ctx.beginPath();
          ctx.arc(h.strikeX - h.x, h.strikeY - h.y, 46 * k, 0, Math.PI * 2);
          ctx.fill();
        } else if (h.state === 'strike') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          boltShape(ctx, 0, 0, h.strikeX - h.x, h.strikeY - h.y, 14);
          ctx.strokeStyle = hexA(hc, 0.8);
          ctx.lineWidth = 6;
          boltShape(ctx, 0, 0, h.strikeX - h.x, h.strikeY - h.y, 14);
        }
      } else if (h.hazard === 'aurora') {
        // A slow-drifting ribbon: a glowing band that burns on touch.
        ctx.rotate(Math.sin(h.phase * 0.7) * 0.5);
        ctx.shadowColor = hc;
        ctx.shadowBlur = 14;
        ctx.fillStyle = h.flash > 0 ? '#ffffff' : hexA(hc, 0.85);
        ctx.beginPath();
        ctx.ellipse(0, 0, h.radius + 8, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.ellipse(0, 0, h.radius - 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Bramble: a snarl of thorns that snags the drone.
        ctx.shadowColor = hc;
        ctx.shadowBlur = 10;
        ctx.fillStyle = h.flash > 0 ? '#ffffff' : hc;
        for (let i = 0; i < 7; i += 1) {
          const a = (i / 7) * Math.PI * 2 + h.phase * 0.15;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a - 0.22) * 8, Math.sin(a - 0.22) * 8);
          ctx.lineTo(Math.cos(a) * (h.radius + 4), Math.sin(a) * (h.radius + 4));
          ctx.lineTo(Math.cos(a + 0.22) * 8, Math.sin(a + 0.22) * 8);
          ctx.closePath();
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0a0e1e';
        circle(ctx, 0, 0, 7);
      }
      // Hit-point pips under damaged shards, brambles and storm cells.
      if (h.hp && h.hp < h.maxHp) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (let i = 0; i < h.maxHp; i += 1) {
          circle(ctx, (i - (h.maxHp - 1) / 2) * 9, h.radius + 10, i < h.hp ? 2.6 : 1.6);
        }
      }
      ctx.restore();
    }
  }

  function drawBullets(state) {
    ctx.fillStyle = PALETTE.bullet;
    ctx.shadowColor = PALETTE.bullet;
    ctx.shadowBlur = 8;
    for (const b of state.bullets) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.fillRect(-7, -2, 14, 4);
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.orb;
    ctx.shadowColor = PALETTE.orb;
    ctx.shadowBlur = 10;
    for (const o of state.orbs) {
      circle(ctx, o.x, o.y, o.radius);
    }
    ctx.shadowBlur = 0;
  }

  function drawParticles(state) {
    for (const pt of state.particles) {
      if (pt.kind === 'bolt') {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 3;
        boltShape(ctx, pt.x, pt.y, pt.x2, pt.y2, 10);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        boltShape(ctx, pt.x, pt.y, pt.x2, pt.y2, 10);
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      circle(ctx, pt.x, pt.y, pt.radius);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(state) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Trebuchet MS", "Segoe UI", sans-serif';
    for (const f of state.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer(state) {
    const p = state.player;
    if (!p.alive) return;
    const pc = state.realm.palette.player;
    const surging = isOverdrive(p);
    // Motion trail, greener while surging.
    for (const t of p.trail) {
      ctx.globalAlpha = Math.max(0, t.life / 0.22) * 0.35;
      ctx.fillStyle = surging ? PALETTE.overdrive : pc;
      circle(ctx, t.x, t.y, p.radius * 0.7);
    }
    ctx.globalAlpha = 1;
    // Blink while invulnerable after a hit.
    if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    const angle = Math.atan2(p.vy, p.vx);
    ctx.rotate(p.vx !== 0 || p.vy !== 0 ? angle : -Math.PI / 2);
    ctx.shadowColor = surging ? PALETTE.overdrive : pc;
    ctx.shadowBlur = surging ? 26 : 16;
    ctx.fillStyle = surging ? PALETTE.overdrive : pc;
    ctx.beginPath();
    ctx.moveTo(p.radius + 6, 0);
    ctx.lineTo(-p.radius * 0.8, p.radius * 0.75);
    ctx.lineTo(-p.radius * 0.4, 0);
    ctx.lineTo(-p.radius * 0.8, -p.radius * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.playerCore;
    circle(ctx, 2, 0, 4.5);
    ctx.restore();
    // Aegis shield ring while the wave's shield is up.
    if (p.shield > 0) {
      ctx.strokeStyle = 'rgba(125, 255, 212, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Dash cooldown ring under the drone.
    if (p.dashCooldown > 0) {
      ctx.strokeStyle = hexA(pc, 0.5);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 9, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (1 - p.dashCooldown / p.dashCooldownBase)));
      ctx.stroke();
    }
  }

  function drawHud(state, best) {
    const p = state.player;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 26px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(`${state.score}`, 22, 38);
    ctx.font = '13px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 22, 58);
    // Wave and realm, top centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 20px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(state.endless ? `WAVE ${state.wave} · ENDLESS` : `WAVE ${state.wave} / ${WAVES_TOTAL}`, VIEW.width / 2, 36);
    const remaining = state.queue.length + state.wisps.length;
    ctx.fillStyle = state.realm.palette.accent;
    ctx.font = 'bold 12px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(state.endless ? `${state.realm.name.toUpperCase()} · ENDLESS TIDE · ${remaining} wisps left` : `${state.realm.name.toUpperCase()} · ${remaining} wisps left`, VIEW.width / 2, 56);
    // Boss health bar, under the wave line while the boss lives.
    const boss = state.wisps.find((w) => w.type === 'boss');
    if (boss) {
      const bw = 300;
      const bx = (VIEW.width - bw) / 2;
      const by = 66;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(bx, by, bw, 10);
      ctx.fillStyle = boss.color;
      ctx.fillRect(bx, by, bw * Math.max(0, boss.hp / boss.maxHp), 10);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, 10);
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 12px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(boss.name.toUpperCase(), VIEW.width / 2, by + 26);
    }
    // Hearts and novas, top right.
    ctx.textAlign = 'right';
    for (let i = 0; i < p.maxHearts; i += 1) {
      ctx.fillStyle = i < p.hearts ? PALETTE.danger : 'rgba(255, 93, 115, 0.25)';
      ctx.font = '22px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText('♥', VIEW.width - 24 - i * 26, 40);
    }
    ctx.fillStyle = PALETTE.player;
    ctx.font = 'bold 15px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(`NOVA ×${p.novas}  [E]`, VIEW.width - 22, 64);
    // Combo, bottom left.
    if (state.combo >= 2) {
      const mult = comboMultiplier(state);
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.mote;
      ctx.font = 'bold 22px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(`COMBO ×${mult}`, 22, VIEW.height - 44);
      ctx.fillStyle = 'rgba(255, 209, 102, 0.35)';
      ctx.fillRect(22, VIEW.height - 34, 120, 6);
      ctx.fillStyle = PALETTE.mote;
      ctx.fillRect(22, VIEW.height - 34, 120 * Math.max(0, state.comboTimer / COMBO.window), 6);
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '12px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(`${state.combo} motes in a row`, 22, VIEW.height - 18);
    }
    // Frenzy, above the combo: doubled score while it burns.
    if (state.frenzyTime > 0) {
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 18px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(`FRENZY ×2 — ${state.frenzyTime.toFixed(1)}s`, 22, VIEW.height - 72);
    }
    // Overdrive meter, bottom centre, clear of the controls hint below it.
    const ow = 190;
    const ox = (VIEW.width - ow) / 2;
    const oy = VIEW.height - 42;
    const ready = p.overdrive >= OVERDRIVE.max;
    ctx.textAlign = 'center';
    ctx.fillStyle = ready ? PALETTE.overdrive : PALETTE.dim;
    ctx.font = 'bold 12px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(isOverdrive(p) ? `OVERDRIVE ${p.overdriveTime.toFixed(1)}s` : ready ? 'OVERDRIVE READY — PRESS Q' : 'OVERDRIVE', VIEW.width / 2, oy - 6);
    ctx.fillStyle = 'rgba(125, 255, 212, 0.25)';
    ctx.fillRect(ox, oy, ow, 7);
    ctx.fillStyle = isOverdrive(p) ? '#ffffff' : PALETTE.overdrive;
    ctx.fillRect(ox, oy, ow * (isOverdrive(p) ? p.overdriveTime / p.overdriveDuration : p.overdrive / OVERDRIVE.max), 7);
    // Controls hint, bottom right.
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(143, 163, 200, 0.8)';
    ctx.font = '12px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('WASD move · SPACE fire · SHIFT dash · E nova · Q overdrive · P pause', VIEW.width - 22, VIEW.height - 18);
  }

  function drawBanner(state) {
    if (!state.banner) return;
    const a = Math.min(1, state.banner.timer / 0.6, (2.2 - state.banner.timer) / 0.25 + 0.4);
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 44px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.shadowColor = PALETTE.player;
    ctx.shadowBlur = 24;
    ctx.fillText(state.banner.text, VIEW.width / 2, VIEW.height / 2 - 40);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 18px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(state.banner.sub, VIEW.width / 2, VIEW.height / 2 - 8);
    ctx.globalAlpha = 1;
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(8, 12, 28, 0.82)';
    ctx.strokeStyle = 'rgba(120, 170, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
  }

  function drawTitle(state, best, ui) {
    const save = ui && ui.save;
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 62px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.shadowColor = PALETTE.player;
    ctx.shadowBlur = 30;
    ctx.fillText('LUMEN HARVEST', VIEW.width / 2, 148);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 19px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('Five realms. One harvest. Gather the light. Outrun the dark.', VIEW.width / 2, 182);

    panel(VIEW.width / 2 - 300, 214, 600, 168);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '15px "Trebuchet MS", "Segoe UI", sans-serif';
    const lines = [
      ['WASD / ARROWS', '— steer the harvester drone'],
      ['SPACE (hold)', '— fire at the nearest wisp'],
      ['SHIFT', '— dash through danger (brief shield)'],
      ['E', '— nova bomb: clears the field'],
      ['Q', '— overdrive when the meter is full'],
      ['1 / 2 / 3 / 4 / 5', '— pick a realm, pick an upgrade'],
    ];
    lines.forEach((line, i) => {
      const y = 238 + i * 24;
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.player;
      ctx.font = 'bold 15px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(line[0], VIEW.width / 2 - 8, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.text;
      ctx.font = '15px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(line[1], VIEW.width / 2 + 8, y);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '14px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('Clear a realm to open the next — clear all five to open Endless Tide', VIEW.width / 2, 412);
    if (save) {
      const cleared = save.cleared.length;
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 16px "Trebuchet MS", "Segoe UI", sans-serif';
      if (cleared >= REALMS_TOTAL) {
        ctx.fillText(`★ ALL FIVE REALMS CLEARED · BEST HARVEST ${overallBest(save)} · BEST COMBO ${overallBestCombo(save)} ★`, VIEW.width / 2, 442);
      } else if (best > 0) {
        ctx.fillText(`REALMS CLEARED ${cleared} / ${REALMS_TOTAL} · BEST HARVEST ${best}`, VIEW.width / 2, 442);
      } else {
        ctx.fillText('NO REALM CLEARED YET — THE EMBER WASTES WAIT', VIEW.width / 2, 442);
      }
    } else if (best > 0) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 16px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(`BEST HARVEST: ${best}`, VIEW.width / 2, 442);
    }
    // The start prompt pulses but never vanishes: a screenshot must show it.
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(state.time * 3);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 22px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('— PRESS ENTER — CHOOSE YOUR REALM —', VIEW.width / 2, 516);
    ctx.globalAlpha = 1;
  }

  /** The realm map: five realm cards plus Endless Tide, locked ones shut,
   * cleared ones crowned, the selected one lit. This is where the campaign's
   * variety shows at a glance. */
  function drawSelect(state, ui) {
    const save = (ui && ui.save) || { best: {}, bestCombo: {}, cleared: [] };
    const selected = (ui && ui.selected) || 0;
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 44px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.shadowColor = PALETTE.player;
    ctx.shadowBlur = 22;
    ctx.fillText('CHOOSE YOUR REALM', VIEW.width / 2, 96);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '15px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('Clear a realm to open the next. Each realm is ten waves, its own foes and a boss.', VIEW.width / 2, 124);

    // The sixth card is Endless Tide: it opens once all five realms are cleared.
    const endlessCard = {
      id: 'endless',
      name: 'Endless Tide',
      tagline: 'Waves without end, no boss, no finish',
      unlock: REALMS_TOTAL,
      palette: {
        bgTop: '#0a0e1e',
        bgBottom: '#141b38',
        nebulaA: '#1d2b5e',
        nebulaB: '#3b1d5e',
        star: '#cfe6ff',
        accent: '#ffd166',
        mote: '#ffd166',
        moteCore: '#fff3c4',
        player: '#4de8ff',
        border: 'rgba(255, 209, 102, 0.30)',
      },
      boss: { name: 'No boss, no end' },
    };
    const entries = [...REALMS, endlessCard];
    // Six narrow cards in one row.
    const w = 143;
    const gap = 10;
    const total = w * entries.length + gap * (entries.length - 1);
    // Wrap one line of small text onto at most two lines inside a card.
    function wrapCard(text, maxW) {
      const words = text.split(' ');
      const lines = [''];
      for (const word of words) {
        const trial = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
        if (ctx.measureText(trial).width > maxW && lines[lines.length - 1]) lines.push(word);
        else lines[lines.length - 1] = trial;
      }
      return lines.slice(0, 2);
    }
    entries.forEach((realm, i) => {
      const x = (VIEW.width - total) / 2 + i * (w + gap);
      const y = 156;
      const h = 300;
      const unlocked = isUnlocked(save, realm);
      const cleared = save.cleared.includes(realm.id);
      const isSel = i === selected;
      // Card body in the realm's own dusk.
      ctx.fillStyle = 'rgba(10, 14, 32, 0.94)';
      ctx.strokeStyle = isSel ? realm.palette.accent : 'rgba(120, 170, 255, 0.3)';
      ctx.lineWidth = isSel ? 3 : 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 14);
      ctx.fill();
      ctx.stroke();
      // A band of the realm's sky across the top of the card.
      const band = ctx.createLinearGradient(x, y, x, y + 92);
      band.addColorStop(0, realm.palette.bgTop);
      band.addColorStop(1, realm.palette.bgBottom);
      ctx.fillStyle = band;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, w - 4, 90, 12);
      ctx.fill();
      // The realm's mark: a glowing mote, a shard, a bloom, or a bolt.
      ctx.fillStyle = realm.palette.accent;
      ctx.shadowColor = realm.palette.accent;
      ctx.shadowBlur = 16;
      if (realm.id === 'ember') starShape(ctx, x + w / 2, y + 48, 20, 4, state.time * 0.5);
      else if (realm.id === 'frost') starShape(ctx, x + w / 2, y + 48, 20, 6, state.time * 0.2);
      else if (realm.id === 'void') starShape(ctx, x + w / 2, y + 48, 18, 8, state.time * 0.4);
      else if (realm.id === 'storm') starShape(ctx, x + w / 2, y + 48, 18, 5, state.time * 0.9);
      else if (realm.id === 'aurora') starShape(ctx, x + w / 2, y + 48, 18, 4, state.time * 0.7);
      else starShape(ctx, x + w / 2, y + 48, 18, 8, state.time * 0.3);
      ctx.shadowBlur = 0;
      // Number, name, tagline (wrapped onto two lines in a narrow card).
      ctx.fillStyle = PALETTE.dim;
      ctx.font = 'bold 11px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(realm.id === 'endless' ? 'ENDLESS · [ 6 ]' : `REALM ${i + 1} · [ ${i + 1} ]`, x + w / 2, y + 118);
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 15px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(realm.name.toUpperCase(), x + w / 2, y + 142);
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '11px "Trebuchet MS", "Segoe UI", sans-serif';
      const tagLines = wrapCard(realm.tagline, w - 14);
      tagLines.forEach((line, li) => {
        ctx.fillText(line, x + w / 2, y + 164 + li * 14);
      });
      // Boss line.
      ctx.fillStyle = realm.palette.accent;
      ctx.font = 'bold 11px "Trebuchet MS", "Segoe UI", sans-serif';
      const bossLines = wrapCard(realm.id === 'endless' ? realm.boss.name.toUpperCase() : `BOSS: ${realm.boss.name.toUpperCase()}`, w - 14);
      bossLines.forEach((line, li) => {
        ctx.fillText(line, x + w / 2, y + 208 + li * 14);
      });
      // Status: crowned, open, or locked — per-realm best score on its own line.
      ctx.font = 'bold 12px "Trebuchet MS", "Segoe UI", sans-serif';
      if (realm.id === 'endless') {
        if (unlocked) {
          ctx.fillStyle = PALETTE.gold;
          ctx.fillText('★ OPEN · ENDLESS', x + w / 2, y + 244);
          ctx.fillStyle = PALETTE.text;
          ctx.font = '11px "Trebuchet MS", "Segoe UI", sans-serif';
          ctx.fillText(`BEST ${overallBest(save)}`, x + w / 2, y + 264);
        } else {
          ctx.fillStyle = PALETTE.dim;
          ctx.fillText('LOCKED', x + w / 2, y + 244);
          ctx.font = '11px "Trebuchet MS", "Segoe UI", sans-serif';
          ctx.fillText('CLEAR ALL 5 REALMS', x + w / 2, y + 264);
        }
      } else if (cleared) {
        ctx.fillStyle = PALETTE.gold;
        ctx.fillText('★ CLEARED', x + w / 2, y + 244);
        ctx.fillStyle = PALETTE.text;
        ctx.font = '11px "Trebuchet MS", "Segoe UI", sans-serif';
        ctx.fillText(`BEST ${realmBest(save, realm.id)}`, x + w / 2, y + 264);
      } else if (unlocked) {
        const best = realmBest(save, realm.id);
        ctx.fillStyle = PALETTE.text;
        ctx.fillText('OPEN', x + w / 2, y + 244);
        ctx.fillStyle = PALETTE.dim;
        ctx.font = '11px "Trebuchet MS", "Segoe UI", sans-serif';
        ctx.fillText(best > 0 ? `BEST ${best}` : 'NOT YET CLEARED', x + w / 2, y + 264);
      } else {
        ctx.fillStyle = PALETTE.dim;
        ctx.fillText('LOCKED', x + w / 2, y + 244);
        ctx.font = '11px "Trebuchet MS", "Segoe UI", sans-serif';
        ctx.fillText(`CLEAR REALM ${i} FIRST`, x + w / 2, y + 264);
      }
      if (isSel) {
        ctx.fillStyle = realm.palette.accent;
        ctx.font = 'bold 13px "Trebuchet MS", "Segoe UI", sans-serif';
        ctx.fillText('▶ SELECTED ◀', x + w / 2, y + 284);
      }
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '14px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(`REALMS CLEARED ${save.cleared.length} / ${REALMS_TOTAL} · BEST HARVEST ${overallBest(save)} · BEST COMBO ${overallBestCombo(save)}`, VIEW.width / 2, 500);
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(state.time * 3);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 19px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('1–5 pick a realm · 6 endless · ← → move · ENTER start', VIEW.width / 2, 534);
    ctx.globalAlpha = 1;
  }

  function drawUpgrade(state) {
    ctx.fillStyle = 'rgba(6, 9, 20, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 34px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('WAVE CLEARED!', VIEW.width / 2, 118);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '17px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('Choose an upgrade — press 1, 2 or 3', VIEW.width / 2, 150);
    const w = 250;
    const gap = 24;
    const total = w * 3 + gap * 2;
    state.upgrades.forEach((up, i) => {
      const x = (VIEW.width - total) / 2 + i * (w + gap);
      const y = 190;
      const h = 220;
      ctx.fillStyle = 'rgba(10, 16, 36, 0.92)';
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 15px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(`[ ${i + 1} ]`, x + w / 2, y + 36);
      ctx.fillStyle = PALETTE.mote;
      ctx.font = 'bold 34px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(up.icon, x + w / 2, y + 92);
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 20px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(up.name, x + w / 2, y + 132);
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '15px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(up.desc, x + w / 2, y + 164);
    });
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '13px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('The next wave starts the moment you choose.', VIEW.width / 2, 452);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(6, 9, 20, 0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 44px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2 - 10);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '16px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('Press P or Enter to keep harvesting', VIEW.width / 2, VIEW.height / 2 + 26);
  }

  function drawEnd(state, best, won, ui) {
    const save = ui && ui.save;
    ctx.fillStyle = 'rgba(6, 9, 20, 0.62)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    if (won) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 52px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.shadowColor = PALETTE.gold;
      ctx.shadowBlur = 26;
      ctx.fillText(`${state.realm.name.toUpperCase()} CLEARED!`, VIEW.width / 2, 158);
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.text;
      ctx.font = '17px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(`${state.realm.boss.name} is slain. The ${state.realm.name}'s light is yours.`, VIEW.width / 2, 192);
    } else {
      ctx.fillStyle = PALETTE.danger;
      ctx.font = 'bold 52px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.shadowColor = PALETTE.danger;
      ctx.shadowBlur = 26;
      ctx.fillText('HARVEST LOST', VIEW.width / 2, 158);
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.text;
      ctx.font = '17px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(`The ${state.realm.name} swallowed the last of the light.`, VIEW.width / 2, 192);
    }
    panel(VIEW.width / 2 - 220, 228, 440, 224);
    const rows = [
      ['SCORE', `${state.score}`],
      ['BEST IN REALM', `${Math.max(best, state.score)}`],
      ['BEST COMBO', `${state.maxCombo} motes`],
      ['WAVE REACHED', `${state.wave} / ${WAVES_TOTAL}`],
      ['WISPS SLAIN', `${state.kills}`],
      ['MOTES GATHERED', `${state.motesCollected}`],
    ];
    rows.forEach((row, i) => {
      const y = 258 + i * 28;
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '15px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(row[0], VIEW.width / 2 - 12, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 15px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(row[1], VIEW.width / 2 + 12, y);
    });
    if (save) {
      const cleared = save.cleared.length;
      ctx.textAlign = 'center';
      ctx.fillStyle = cleared >= REALMS_TOTAL ? PALETTE.gold : PALETTE.text;
      ctx.font = 'bold 15px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(
        cleared >= REALMS_TOTAL
          ? `★ ALL FIVE REALMS CLEARED · LIFETIME HARVEST ${save.kills} WISPS · ${save.motes} MOTES ★`
          : `REALMS CLEARED ${cleared} / ${REALMS_TOTAL} · RUNS ${save.runs} · WINS ${save.wins}`,
        VIEW.width / 2,
        428,
      );
    }
    if (state.score > best && best > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 17px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText('★ NEW BEST IN THIS REALM ★', VIEW.width / 2, 472);
    }
    // The restart prompt pulses but never vanishes: a screenshot must show it.
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(state.time * 3);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 22px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('— PRESS ENTER — BACK TO THE REALMS —', VIEW.width / 2, 516);
    ctx.globalAlpha = 1;
  }

  function draw(state, screen, best, ui) {
    ctx.save();
    if (state.shake > 0.4) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground(state);
    if (screen !== SCREEN_TITLE && screen !== SCREEN_SELECT) {
      drawMotes(state);
      drawHearts(state);
      drawWisps(state);
      drawHazards(state);
      drawBullets(state);
      drawParticles(state);
      drawPlayer(state);
      drawFloaters(state);
    } else {
      // Title and map backdrops: the drifting field, dimmed under the panel.
      drawMotes(state);
      drawWisps(state);
      drawParticles(state);
    }
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_UPGRADE) {
      drawHud(state, best);
    }
    drawBanner(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best, ui);
    if (screen === SCREEN_SELECT) drawSelect(state, ui);
    if (screen === SCREEN_UPGRADE) drawUpgrade(state);
    if (screen === SCREEN_PAUSED) drawPaused();
    if (screen === SCREEN_OVER) drawEnd(state, best, false, ui);
    if (screen === SCREEN_WIN) drawEnd(state, best, true, ui);
    ctx.restore();
    // Low-health vignette: a pulsing red border while one heart is left.
    if ((screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_UPGRADE) && state.player && state.player.alive && state.player.hearts === 1) {
      const a = 0.22 + 0.14 * Math.sin(state.time * 4);
      ctx.strokeStyle = `rgba(255, 60, 80, ${a})`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, VIEW.width - 10, VIEW.height - 10);
    }
    // Damage flash over everything.
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 70, 90, ${state.flash * 0.45})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    // Overdrive tint: the whole field glows green while the surge runs.
    if (state.player && isOverdrive(state.player)) {
      ctx.fillStyle = 'rgba(125, 255, 212, 0.05)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }

  return { draw };
}
