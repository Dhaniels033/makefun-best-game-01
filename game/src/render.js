// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 arena is scaled to fit the window and centred, the margin filled with
// the backdrop colour. Canvas shapes, gradients and text only — no image assets.
import { ENEMY, FIELD, LANTERN, PALETTE, PLAYER, SHOP, TOTAL_WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_SHOP = 'shop';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 660, line: 30 };

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  let stars = [];
  for (let i = 0; i < 90; i += 1) {
    stars.push({ x: (i * 137.5) % FIELD.width, y: (i * 89.3) % FIELD.height, r: 0.6 + (i % 3) * 0.5, tw: (i % 5) * 0.7 });
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, colour, align, weight) {
    ctx.font = `${weight || 400} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillStyle = colour;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function drawArena(state, time) {
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const s of stars) {
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(time * 1.4 + s.tw);
      ctx.fillStyle = '#cdd6ff';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    // Concentric ground rings around the lantern.
    ctx.strokeStyle = PALETTE.ring;
    ctx.lineWidth = 2;
    for (const r of [90, 180, 270]) {
      ctx.beginPath(); ctx.arc(LANTERN.x, LANTERN.y, r, 0, Math.PI * 2); ctx.stroke();
    }
    // Lantern glow, pulsing with its remaining health.
    const glow = ctx.createRadialGradient(LANTERN.x, LANTERN.y, 10, LANTERN.x, LANTERN.y, 210);
    const healthFrac = state.lantern.hp / state.lantern.maxHp;
    glow.addColorStop(0, `rgba(255, 209, 102, ${0.5 * healthFrac + 0.12})`);
    glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(LANTERN.x - 220, LANTERN.y - 220, 440, 440);
    // The lantern itself: stone base, glass, flame.
    ctx.fillStyle = '#3a4470';
    ctx.fillRect(LANTERN.x - 26, LANTERN.y + 14, 52, 14);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(LANTERN.x, LANTERN.y, LANTERN.radius - 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(LANTERN.x, LANTERN.y, 12 + 3 * Math.sin(time * 3), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a3040';
    ctx.fillRect(LANTERN.x - 20, LANTERN.y - LANTERN.radius - 6, 40, 8);
  }

  function drawDrops(state) {
    for (const d of state.drops) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.life * 2);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
  }

  function drawEnemies(state) {
    for (const e of state.enemies) {
      const spec = ENEMY[e.kind];
      const flashing = e.flash > 0;
      ctx.fillStyle = flashing ? '#ffffff' : spec.colour;
      if (e.kind === 'moth') {
        ctx.save(); ctx.translate(e.x, e.y);
        ctx.beginPath(); ctx.ellipse(-9, 0, 11, 6, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(9, 0, 11, 6, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (e.kind === 'brute') {
        ctx.fillRect(e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2);
        ctx.fillStyle = flashing ? '#ffffff' : '#7a1020';
        ctx.fillRect(e.x - 10, e.y - 6, 20, 6);
        ctx.fillRect(e.x - 4, e.y + 4, 8, 10);
      } else if (e.kind === 'spitter') {
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#12351a';
        ctx.beginPath(); ctx.arc(e.x - 5, e.y - 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.x + 5, e.y - 3, 3, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'king') {
        if (e.charging > 0) { ctx.strokeStyle = '#ff5d73'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 10, 0, Math.PI * 2); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7a4d00';
        ctx.beginPath(); ctx.moveTo(e.x - 30, e.y - 28); ctx.lineTo(e.x - 14, e.y - 52); ctx.lineTo(e.x - 2, e.y - 30); ctx.fill();
        ctx.beginPath(); ctx.moveTo(e.x + 30, e.y - 28); ctx.lineTo(e.x + 14, e.y - 52); ctx.lineTo(e.x + 2, e.y - 30); ctx.fill();
        ctx.fillStyle = '#1a1200';
        ctx.beginPath(); ctx.arc(e.x - 14, e.y - 6, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.x + 14, e.y - 6, 5, 0, Math.PI * 2); ctx.fill();
      } else {
        // Cinder: a flickering ember with a hot core.
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * 0.45, 0, Math.PI * 2); ctx.fill();
      }
      if (e.maxHp > 4) {
        bar(ctx, e.x - e.radius, e.y - e.radius - 12, e.radius * 2, 5, e.hp / e.maxHp, '#ff5d73', 'rgba(0,0,0,0.5)');
      }
    }
  }

  function drawPlayer(state, time) {
    const p = state.player;
    if (p.invulnerable > 0 && Math.floor(p.invulnerable * 10) % 2 === 0) return; // blink after a hit
    // Dash trail while dashing.
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#7ee787';
    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-10, -11); ctx.lineTo(-6, 0); ctx.lineTo(-10, 11); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#2fbf71';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8ffe9';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius - 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#12351a';
    ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 5, p.y + Math.sin(p.angle) * 5, 4, 0, Math.PI * 2); ctx.fill();
    if (p.dashCooldown > 0) {
      ctx.strokeStyle = 'rgba(126, 231, 135, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCooldown / PLAYER.dashCooldown)); ctx.stroke();
    }
    void time;
  }

  function drawBolts(state) {
    for (const b of state.bolts) {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(b.x, b.y, PLAYER.boltRadius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    for (const b of state.foeBolts) {
      ctx.fillStyle = '#7ee787';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
    }
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.colour;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
    for (const f of state.floats) {
      ctx.globalAlpha = Math.max(0, f.life);
      text(f.text, f.x, f.y, 18, f.colour, 'center', 700);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    ctx.textBaseline = 'top';
    text(`SCORE ${state.score}`, 24, 40, 26, PALETTE.text, 'left', 700);
    text(`BEST ${Math.max(best, state.score)}`, 24, 68, 16, PALETTE.muted, 'left');
    text(`WAVE ${Math.max(1, state.wave)} / ${TOTAL_WAVES}`, FIELD.width / 2, 40, 26, PALETTE.text, 'center', 700);
    const foesLeft = state.enemies.length + state.queue.length;
    text(foesLeft > 0 ? `${foesLeft} foes left` : 'Wave clear!', FIELD.width / 2, 68, 16, PALETTE.muted, 'center');
    text(`◆ ${state.shards}`, FIELD.width - 24, 40, 26, PALETTE.gold, 'right', 700);
    if (state.combo >= 2) text(`COMBO x${(1 + Math.min(state.combo, 20) * 0.1).toFixed(1)}`, FIELD.width - 24, 68, 16, PALETTE.ember, 'right', 700);
    // Bottom-left: keeper HP. Bottom-right: lantern HP.
    text('KEEPER', 24, FIELD.height - 52, 14, PALETTE.muted, 'left', 700);
    bar(ctx, 24, FIELD.height - 32, 220, 14, state.player.hp / state.player.maxHp, '#2fbf71', 'rgba(0,0,0,0.55)');
    text(`${Math.ceil(state.player.hp)} / ${state.player.maxHp}`, 252, FIELD.height - 52, 14, PALETTE.text, 'left');
    text('LANTERN', FIELD.width - 244, FIELD.height - 52, 14, PALETTE.muted, 'left', 700);
    bar(ctx, FIELD.width - 244, FIELD.height - 32, 220, 14, state.lantern.hp / state.lantern.maxHp, PALETTE.gold, 'rgba(0,0,0,0.55)');
    text(`${Math.ceil(state.lantern.hp)} / ${state.lantern.maxHp}`, FIELD.width - 150, FIELD.height - 52, 14, PALETTE.text, 'left');
    text('WASD move · Mouse aim · Click / hold to shoot · Shift dash · P pause · M mute', FIELD.width / 2, FIELD.height - 30, 13, PALETTE.muted, 'center');
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = 120 + lines.length * PANEL.line + 64;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x, y, PANEL.width, height);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, PANEL.width, height);
    text(title, FIELD.width / 2, y + 62, 44, accent || PALETTE.text, 'center', 800);
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + 118 + i * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 34, 22, PALETTE.gold, 'center', 700);
  }

  function drawShop(state, best) {
    drawHud(state, best);
    const x = (FIELD.width - 760) / 2;
    const y = 96;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x, y, 760, 500);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 760, 500);
    text(`WAVE ${state.wave} CLEAR  ·  BONUS +${state.waveBonus}`, FIELD.width / 2, y + 44, 30, PALETTE.text, 'center', 800);
    text(`Spend your shards — press 1–6 or click a row, then Enter for wave ${state.wave + 1}`, FIELD.width / 2, y + 78, 17, PALETTE.muted, 'center');
    text(`◆ ${state.shards} shards`, FIELD.width / 2, y + 104, 20, PALETTE.gold, 'center', 700);
    for (let i = 0; i < SHOP.length; i += 1) {
      const item = SHOP[i];
      const level = state.upgrades[i];
      const maxed = level >= item.max;
      const cost = maxed ? 0 : item.costs[level];
      const affordable = !maxed && state.shards >= cost;
      const rowY = y + 130 + i * 50;
      ctx.fillStyle = affordable ? 'rgba(255, 209, 102, 0.10)' : 'rgba(255,255,255,0.03)';
      ctx.fillRect(x + 24, rowY, 712, 42);
      text(`${item.key}`, x + 44, rowY + 29, 20, PALETTE.gold, 'left', 700);
      text(item.name, x + 78, rowY + 29, 20, PALETTE.text, 'left', 700);
      text(item.desc, x + 300, rowY + 29, 16, PALETTE.muted, 'left');
      text('●'.repeat(level) + '○'.repeat(item.max - level), x + 560, rowY + 29, 16, PALETTE.gold, 'left');
      text(maxed ? 'MAX' : `◆ ${cost}`, x + 712, rowY + 29, 18, maxed ? PALETTE.muted : affordable ? PALETTE.gold : '#ff8a8a', 'right', 700);
    }
    text('Press Enter or click NEXT WAVE to continue', FIELD.width / 2, y + 500 - 22, 20, PALETTE.gold, 'center', 700);
  }

  function draw(state, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sx = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const sy = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x + sx * view.scale, view.y + sy * view.scale);
    const time = state.time;
    drawArena(state, time);
    drawDrops(state);
    drawEnemies(state);
    drawPlayer(state, time);
    drawBolts(state);

    if (screen === SCREEN_TITLE) {
      drawPanel('EMBERKEEP', [
        'The last lantern is lit. The night wants it out.',
        'Move with WASD or arrows. Aim with the mouse,',
        'hold click to shoot embers. Shift dashes through danger.',
        'Guard the lantern through 10 waves — beat the Ember King.',
        'Foes drop shards: spend them between waves to grow stronger.',
      ], 'Press Space or click to begin', PALETTE.gold);
      return;
    }
    if (screen === SCREEN_SHOP) { drawShop(state, best); return; }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The night waits for you.'], 'Press P or click to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel('The light went out', [
        `Score ${state.score}   ·   Wave ${state.wave} / ${TOTAL_WAVES}`,
        `Foes felled ${state.kills}   ·   Best combo ${state.bestCombo}`,
        `Best score ${Math.max(best, state.score)}`,
      ], 'Press Space or click to try again', '#ff8a8a');
    } else if (screen === SCREEN_WIN) {
      const accuracy = state.shotsFired ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
      drawPanel('THE LANTERN STILL BURNS', [
        `You beat all ${TOTAL_WAVES} waves and the Ember King!`,
        `Score ${state.score}   ·   Foes felled ${state.kills}`,
        `Best combo ${state.bestCombo}   ·   Bolt accuracy ${accuracy}%`,
        `Time ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`,
      ], 'Press Space or click to play again', PALETTE.gold);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
