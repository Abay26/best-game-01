// Lumen Harvest — everything the eye sees. One canvas, one draw per frame: the
// starfield and nebulae, the arena, the HUD, the wave banners, and the six screens
// (title, play, upgrade, paused, game over, win). The world state is read-only here.
import { COMBO, PALETTE, VIEW, WAVES_TOTAL } from './config.js';
import { comboMultiplier } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

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

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;

  function drawBackground(state) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    g.addColorStop(0, PALETTE.bgTop);
    g.addColorStop(1, PALETTE.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // Two slow nebulae, drifting with time.
    const t = state.time;
    const nebA = ctx.createRadialGradient(220 + Math.sin(t * 0.05) * 30, 150, 10, 220, 150, 260);
    nebA.addColorStop(0, 'rgba(59, 29, 94, 0.55)');
    nebA.addColorStop(1, 'rgba(59, 29, 94, 0)');
    ctx.fillStyle = nebA;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const nebB = ctx.createRadialGradient(760 + Math.cos(t * 0.04) * 30, 460, 10, 760, 460, 280);
    nebB.addColorStop(0, 'rgba(29, 43, 94, 0.55)');
    nebB.addColorStop(1, 'rgba(29, 43, 94, 0)');
    ctx.fillStyle = nebB;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    for (const s of state.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(s.tw));
      ctx.globalAlpha = a * s.depth;
      ctx.fillStyle = PALETTE.star;
      circle(ctx, s.x, s.y, s.r);
    }
    ctx.globalAlpha = 1;

    // Arena border.
    ctx.strokeStyle = 'rgba(120, 170, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, VIEW.width - 12, VIEW.height - 12);
  }

  function drawMotes(state) {
    for (const m of state.motes) {
      const pulse = 1 + Math.sin(m.phase * 3) * 0.15;
      const fade = m.life < 3 ? 0.35 + 0.65 * (m.life / 3) : 1;
      ctx.globalAlpha = fade;
      ctx.shadowColor = PALETTE.mote;
      ctx.shadowBlur = 14;
      ctx.fillStyle = PALETTE.mote;
      starShape(ctx, m.x, m.y, m.radius * pulse, 4, m.phase * 0.5);
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.moteCore;
      circle(ctx, m.x, m.y, m.radius * 0.38 * pulse);
      ctx.globalAlpha = 1;
    }
  }

  function drawWisps(state) {
    for (const w of state.wisps) {
      ctx.save();
      ctx.translate(w.x, w.y);
      // Telegraph ring while a dasher winds up its lunge.
      if (w.type === 'dasher' && w.state === 'windup') {
        const k = 1 - w.stateTimer / 0.55;
        ctx.strokeStyle = `rgba(255, 56, 96, ${0.4 + 0.5 * k})`;
        ctx.lineWidth = 2 + 2 * k;
        ctx.beginPath();
        ctx.arc(0, 0, w.radius + 6 + 14 * k, 0, Math.PI * 2);
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
    // Motion trail.
    for (const t of p.trail) {
      ctx.globalAlpha = Math.max(0, t.life / 0.22) * 0.35;
      ctx.fillStyle = PALETTE.player;
      circle(ctx, t.x, t.y, p.radius * 0.7);
    }
    ctx.globalAlpha = 1;
    // Blink while invulnerable after a hit.
    if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    const angle = Math.atan2(p.vy, p.vx);
    ctx.rotate(p.vx !== 0 || p.vy !== 0 ? angle : -Math.PI / 2);
    ctx.shadowColor = PALETTE.player;
    ctx.shadowBlur = 16;
    ctx.fillStyle = PALETTE.player;
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
    // Dash cooldown ring under the drone.
    if (p.dashCooldown > 0) {
      ctx.strokeStyle = 'rgba(77, 232, 255, 0.5)';
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
    // Wave, top centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 20px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(`WAVE ${state.wave} / ${WAVES_TOTAL}`, VIEW.width / 2, 36);
    const remaining = state.queue.length + state.wisps.length;
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '12px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(`${remaining} wisps left`, VIEW.width / 2, 56);
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
    // Controls hint, bottom right.
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(143, 163, 200, 0.8)';
    ctx.font = '12px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('WASD move · SPACE fire · SHIFT dash · E nova · P pause · M mute', VIEW.width - 22, VIEW.height - 18);
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

  function drawTitle(state, best) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 62px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.shadowColor = PALETTE.player;
    ctx.shadowBlur = 30;
    ctx.fillText('LUMEN HARVEST', VIEW.width / 2, 168);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 19px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('Gather the light. Outrun the dark.', VIEW.width / 2, 202);

    panel(VIEW.width / 2 - 300, 238, 600, 168);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '15px "Trebuchet MS", "Segoe UI", sans-serif';
    const lines = [
      ['WASD / ARROWS', '— steer the harvester drone'],
      ['SPACE (hold)', '— fire at the nearest wisp'],
      ['SHIFT', '— dash through danger (brief shield)'],
      ['E', '— nova bomb: clears the field'],
      ['1 / 2 / 3', '— pick an upgrade between waves'],
    ];
    lines.forEach((line, i) => {
      const y = 268 + i * 28;
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
    ctx.fillText('Collect motes to build your combo · slay wisps for light · survive all 10 waves', VIEW.width / 2, 436);
    if (best > 0) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 16px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(`BEST HARVEST: ${best}`, VIEW.width / 2, 466);
    }
    // The start prompt pulses but never vanishes: a screenshot must show it.
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(state.time * 3);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 22px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('— PRESS ENTER TO START —', VIEW.width / 2, 516);
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

  function drawEnd(state, best, won) {
    ctx.fillStyle = 'rgba(6, 9, 20, 0.62)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    if (won) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 52px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.shadowColor = PALETTE.gold;
      ctx.shadowBlur = 26;
      ctx.fillText('HARVEST COMPLETE!', VIEW.width / 2, 158);
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.text;
      ctx.font = '17px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText('All ten waves survived. The dark is gathered, the light is yours.', VIEW.width / 2, 192);
    } else {
      ctx.fillStyle = PALETTE.danger;
      ctx.font = 'bold 52px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.shadowColor = PALETTE.danger;
      ctx.shadowBlur = 26;
      ctx.fillText('HARVEST LOST', VIEW.width / 2, 158);
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.text;
      ctx.font = '17px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText('The wisps swallowed the last of the light.', VIEW.width / 2, 192);
    }
    panel(VIEW.width / 2 - 220, 228, 440, 168);
    const rows = [
      ['SCORE', `${state.score}`],
      ['BEST', `${Math.max(best, state.score)}`],
      ['WAVE REACHED', `${state.wave} / ${WAVES_TOTAL}`],
      ['WISPS SLAIN', `${state.kills}`],
      ['MOTES GATHERED', `${state.motesCollected}`],
    ];
    rows.forEach((row, i) => {
      const y = 260 + i * 28;
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '15px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(row[0], VIEW.width / 2 - 12, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 15px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText(row[1], VIEW.width / 2 + 12, y);
    });
    if (state.score > best && best > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 17px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.fillText('★ NEW BEST HARVEST ★', VIEW.width / 2, 428);
    }
    // The restart prompt pulses but never vanishes: a screenshot must show it.
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(state.time * 3);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 22px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('— PRESS ENTER TO HARVEST AGAIN —', VIEW.width / 2, 478);
    ctx.globalAlpha = 1;
  }

  function draw(state, screen, best) {
    ctx.save();
    if (state.shake > 0.4) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground(state);
    if (screen !== SCREEN_TITLE) {
      drawMotes(state);
      drawWisps(state);
      drawBullets(state);
      drawParticles(state);
      drawPlayer(state);
      drawFloaters(state);
    } else {
      // Title backdrop: the drifting field, dimmed under the panel.
      drawMotes(state);
      drawWisps(state);
      drawParticles(state);
    }
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_UPGRADE) {
      drawHud(state, best);
    }
    drawBanner(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_UPGRADE) drawUpgrade(state);
    if (screen === SCREEN_PAUSED) drawPaused();
    if (screen === SCREEN_OVER) drawEnd(state, best, false);
    if (screen === SCREEN_WIN) drawEnd(state, best, true);
    ctx.restore();
    // Damage flash over everything.
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 70, 90, ${state.flash * 0.45})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }

  return { draw };
}
