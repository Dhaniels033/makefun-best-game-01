// The screenshot scenes behind ?shot=start|play|shop|end|win. Each one plays the real
// rules forward from a fresh world for a fixed time (or until the scene is reached),
// steered by a simple autopilot — aim at the nearest foe, shoot it, keep a kite
// distance from the lantern, dash out of trouble, collect shards — so the frame is
// what a short game really looks like and the same seed always gives the same frame.
import { FIELD, LANTERN, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const SAMPLE = STEP;

function nearestEnemy(state) {
  let best = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - state.player.x, e.y - state.player.y);
    if (d < bestD) { bestD = d; best = e; }
  }
  return { enemy: best, dist: bestD };
}

function nearestDrop(state) {
  let best = null;
  let bestD = Infinity;
  for (const d of state.drops) {
    const dd = Math.hypot(d.x - state.player.x, d.y - state.player.y);
    if (dd < bestD) { bestD = dd; best = d; }
  }
  return { drop: best, dist: bestD };
}

/** Good play: shoot the nearest foe, kite at ~200 px from the lantern, grab shards. */
function autopilot(state, time) {
  const p = state.player;
  const { enemy, dist } = nearestEnemy(state);
  const input = { moveX: 0, moveY: 0, aimX: p.x, aimY: p.y - 100, firing: false, dash: false };
  if (enemy) {
    input.aimX = enemy.x;
    input.aimY = enemy.y;
    input.firing = true;
    if (dist < 70) input.dash = true;
  }
  // Desired spot: on a slow orbit around the lantern, pulled toward shards.
  const orbitAngle = time * 0.25;
  let tx = LANTERN.x + Math.cos(orbitAngle) * 210;
  let ty = LANTERN.y + Math.sin(orbitAngle) * 210;
  const { drop, dist: dropD } = nearestDrop(state);
  if (drop && dropD < 260) { tx = drop.x; ty = drop.y; }
  else if (enemy && dist < 110) { // back away from a foe that is too close
    tx = p.x + (p.x - enemy.x);
    ty = p.y + (p.y - enemy.y);
  }
  const dx = tx - p.x;
  const dy = ty - p.y;
  const len = Math.hypot(dx, dy) || 1;
  if (len > 24) { input.moveX = dx / len; input.moveY = dy / len; }
  return input;
}

/** Stand still and never shoot, as a hurried player caught out is. */
function passive() {
  return { moveX: 0, moveY: 0, aimX: 640, aimY: 200, firing: false, dash: false };
}

function runFor(world, seconds, pilot) {
  let time = 0;
  for (let i = 0; i < seconds / SAMPLE; i += 1) {
    world.step(SAMPLE, pilot(world.state, time));
    time += SAMPLE;
    if (world.state.phase !== 'fight') break;
  }
  return time;
}

function runUntil(world, pilot, phase, seconds) {
  let time = 0;
  for (let i = 0; i < seconds / SAMPLE; i += 1) {
    world.step(SAMPLE, pilot(world.state, time));
    time += SAMPLE;
    if (world.state.phase === phase) break;
  }
  return time;
}

/**
 * Set `world` to the named scene (start, play, shop, end or win; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    runFor(world, 9, autopilot);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'shop') {
    runUntil(world, autopilot, 'shop', 180);
    return { screen: SCREEN_SHOP, best: world.state.score };
  }
  if (name === 'end') {
    runUntil(world, passive, 'lost', 900);
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  if (name === 'win') {
    world.boostForDemo();
    // Play through every wave, buying whatever the shards afford at each shop.
    let time = 0;
    for (let i = 0; i < 900 / SAMPLE; i += 1) {
      if (world.state.phase === 'won') break;
      if (world.state.phase === 'shop') {
        let bought = false;
        for (let item = 0; item < 6; item += 1) if (world.buy(item)) { bought = true; break; }
        if (!bought) world.startWave(world.state.wave + 1);
        continue;
      }
      if (world.state.phase !== 'fight') break;
      world.step(SAMPLE, autopilot(world.state, time));
      time += SAMPLE;
    }
    return { screen: SCREEN_WIN, best: world.state.score };
  }
  // start: a live backdrop behind the title panel.
  runFor(world, 5, autopilot);
  return { screen: SCREEN_TITLE, best: 0 };
}

export { FIELD };
