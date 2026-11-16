// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between six screens: title, play, shop, paused, game over
// and victory. Shop purchases are keyboard 1-6 or mouse clicks on the shop rows.
//
// ?seed=N fixes the spawn pattern. ?shot=start|play|shop|end|win (with &seed=N)
// stages that scene instead of running the loop, paints it and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, STEP, TOTAL_WAVES } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_BOSS, EVENT_DASH, EVENT_HIT, EVENT_KILL, EVENT_LANTERN_HIT, EVENT_OVER, EVENT_PICKUP, EVENT_SHOOT, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function toArena(cx, cy, w, h) {
  const scale = Math.min(w / FIELD.width, h / FIELD.height);
  const ox = (w - FIELD.width * scale) / 2;
  const oy = (h - FIELD.height * scale) / 2;
  return { x: (cx - ox) / scale, y: (cy - oy) / scale };
}

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}

function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* best then lasts this visit only */ }
}

function runShot(name) {
  const scene = stageShot(name, world);
  renderer.draw(world.state, scene.screen, scene.best);
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
  const input = createInput(canvas, toArena);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) { status.textContent = message; }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    input.setShopMode(false);
    announce(`Playing. Wave 1 of ${TOTAL_WAVES}. Guard the lantern.`);
  }

  function endGame(won) {
    if (world.state.score > best) { best = world.state.score; saveBest(best); }
    if (won) { screen = SCREEN_WIN; audio.victory(); announce(`Victory. Score ${world.state.score}.`); }
    else { screen = SCREEN_OVER; audio.defeat(); announce(`Game over. Score ${world.state.score}. Best ${best}.`); }
  }

  function nextWave() {
    audio.unlock();
    world.startWave(world.state.wave + 1);
    screen = SCREEN_PLAY;
    input.setShopMode(false);
    audio.wave();
    announce(`Wave ${world.state.wave} of ${TOTAL_WAVES}.`);
  }

  function playSounds(events) {
    if (events & EVENT_SHOOT) audio.shoot();
    if (events & EVENT_KILL) audio.kill();
    else if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_LANTERN_HIT) audio.hurt();
    if (events & EVENT_BOSS) audio.boss();
  }

  // Shop mouse clicks: a row buys that upgrade, the bottom strip starts the next wave.
  canvas.addEventListener('click', (event) => {
    if (screen !== SCREEN_SHOP) return;
    const point = input.clickPoint(event);
    const panelX = (FIELD.width - 760) / 2;
    if (point.x >= panelX + 24 && point.x <= panelX + 736) {
      for (let i = 0; i < 6; i += 1) {
        const rowY = 96 + 130 + i * 50;
        if (point.y >= rowY && point.y <= rowY + 42) {
          if (world.buy(i)) { audio.buy(); announce(`Bought ${['Rapid Ember', 'Heavy Ember', 'Swift Boots', 'Heartwood Charm', 'Lantern Repair', 'Piercing Ember'][i]}.`); }
          return;
        }
      }
      if (point.y >= 96 + 444 && point.y <= 96 + 500) nextWave();
    }
  });

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_SHOP) {
      const key = input.takeShopKey();
      if (key >= 1 && key <= 6 && world.buy(key - 1)) audio.buy();
      if (actions & ACTION_CONFIRM) nextWave();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      audio.unlock();
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // A live backdrop behind the title: the keeper plays itself; if the lantern
      // ever falls during a long idle, quietly start a fresh backdrop.
      const p = world.state.player;
      const foe = world.state.enemies[0];
      const inputState = { moveX: 0, moveY: 0, aimX: foe ? foe.x : p.x, aimY: foe ? foe.y : p.y - 100, firing: !!foe, dash: false };
      world.step(STEP, inputState);
      if (world.state.phase !== 'fight') world.reset();
      return;
    }
    const move = input.move();
    const aim = input.aim();
    const actions = input.takeActions();
    const events = world.step(STEP, {
      moveX: move.x, moveY: move.y, aimX: aim.x, aimY: aim.y,
      firing: input.firing, dash: !!(actions & ACTION_DASH),
    });
    // takeActions above consumed the flags; re-queue confirm/pause for handleActions
    // by re-issuing them through a second read is not possible, so handle them here:
    if (actions & ACTION_MUTE) { const muted = audio.toggleMute(); announce(muted ? 'Sound off.' : 'Sound on.'); }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
    playSounds(events);
    if (events & EVENT_WAVE_CLEAR) {
      screen = SCREEN_SHOP;
      input.setShopMode(true);
      audio.buy();
      announce(`Wave ${world.state.wave} clear. Bonus ${world.state.waveBonus}. Spend shards, then continue.`);
    } else if (events & EVENT_WIN) {
      endGame(true);
    } else if (events & EVENT_OVER) {
      endGame(false);
    } else if (events & EVENT_HIT) {
      announce(world.state.player.hp <= 25 ? `Hit. ${Math.ceil(world.state.player.hp)} health left.` : '');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (screen !== SCREEN_PLAY) handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });

  announce('Emberkeep. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
