// The game's rules and state, with no drawing and no browser in it: the keeper, the
// lantern, waves of foes, bolts, shards, the between-wave shop and the win/lose
// conditions. step() advances one fixed step from a plain input object and returns
// what happened as bit flags, so the caller can react (sounds, screens) without the
// world knowing about screens or sound. Nothing here touches the DOM.
import { ENEMY, FIELD, LANTERN, PLAYER, SHOP, STEP, TOTAL_WAVES } from './config.js';

export const EVENT_SHOOT = 1;
export const EVENT_HIT = 2;
export const EVENT_KILL = 4;
export const EVENT_PICKUP = 8;
export const EVENT_WAVE_CLEAR = 16;
export const EVENT_OVER = 32;
export const EVENT_WIN = 64;
export const EVENT_DASH = 128;
export const EVENT_LANTERN_HIT = 256;
export const EVENT_BOSS = 512;

const TWO_PI = Math.PI * 2;

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

function waveQueue(random, wave) {
  const queue = [];
  const total = 6 + wave * 3;
  for (let i = 0; i < total; i += 1) {
    let kind = 'cinder';
    const roll = random();
    if (wave >= 10) kind = roll < 0.45 ? 'cinder' : roll < 0.7 ? 'moth' : roll < 0.88 ? 'spitter' : 'brute';
    else if (wave >= 7) kind = roll < 0.35 ? 'cinder' : roll < 0.6 ? 'moth' : roll < 0.82 ? 'spitter' : 'brute';
    else if (wave >= 5) kind = roll < 0.45 ? 'cinder' : roll < 0.7 ? 'moth' : roll < 0.9 ? 'spitter' : 'brute';
    else if (wave >= 3) kind = roll < 0.55 ? 'cinder' : roll < 0.85 ? 'moth' : 'spitter';
    else if (wave >= 2) kind = roll < 0.7 ? 'cinder' : 'moth';
    queue.push(kind);
  }
  if (wave === TOTAL_WAVES) queue.unshift('king');
  return queue;
}

export function createWorld(random) {
  const state = {
    player: { x: FIELD.centreX, y: FIELD.centreY + 170, hp: PLAYER.maxHp, maxHp: PLAYER.maxHp,
      radius: PLAYER.radius, angle: -Math.PI / 2, fireTimer: 0, dashTimer: 0, dashCooldown: 0, invulnerable: 0,
      speed: PLAYER.speed, damage: PLAYER.boltDamage, fireInterval: PLAYER.fireInterval, pierce: 0 },
    lantern: { hp: LANTERN.maxHp, maxHp: LANTERN.maxHp },
    wave: 0, phase: 'fight', score: 0, shards: 0, combo: 0, comboTimer: 0, bestCombo: 0,
    kills: 0, shotsFired: 0, shotsHit: 0, time: 0, waveBonus: 0,
    upgrades: SHOP.map(() => 0), enemies: [], bolts: [], foeBolts: [], drops: [],
    particles: [], floats: [], queue: [], spawnTimer: 0, bossSpawnTimer: 0, shake: 0,
  };

  function spawnPoint() {
    const side = Math.floor(random() * 4);
    const m = 30;
    if (side === 0) return { x: random() * FIELD.width, y: -m };
    if (side === 1) return { x: random() * FIELD.width, y: FIELD.height + m };
    if (side === 2) return { x: -m, y: random() * FIELD.height };
    return { x: FIELD.width + m, y: random() * FIELD.height };
  }

  function spawnEnemy(kind) {
    const spec = ENEMY[kind];
    const at = spawnPoint();
    state.enemies.push({ kind, x: at.x, y: at.y, hp: spec.hp, maxHp: spec.hp,
      speed: spec.speed * (0.9 + random() * 0.2), radius: spec.radius, attackTimer: 0,
      shootTimer: 1 + random(), zig: random() * TWO_PI, chargeTimer: 4 + random() * 3,
      charging: 0, chargeX: 0, chargeY: 0, flash: 0 });
  }

  function burst(x, y, colour, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = random() * TWO_PI;
      const v = speed * (0.3 + random() * 0.7);
      state.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0.4 + random() * 0.35, maxLife: 0.75, colour, size: 2 + random() * 3 });
    }
    if (state.particles.length > 220) state.particles.splice(0, state.particles.length - 220);
  }

  function floatText(x, y, text, colour) {
    state.floats.push({ x, y, text, colour, life: 0.9 });
    if (state.floats.length > 24) state.floats.shift();
  }

  function addScore(base, x, y) {
    const mult = 1 + Math.min(state.combo, 20) * 0.1;
    const gained = Math.round(base * mult);
    state.score += gained;
    floatText(x, y - 18, `+${gained}`, '#ffd166');
  }

  function killEnemy(enemy, index) {
    const spec = ENEMY[enemy.kind];
    state.enemies.splice(index, 1);
    state.kills += 1;
    state.combo += 1;
    state.comboTimer = 3;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    addScore(spec.score, enemy.x, enemy.y);
    burst(enemy.x, enemy.y, spec.colour, enemy.kind === 'king' ? 40 : 12, 160);
    for (let i = 0; i < spec.shards; i += 1) {
      state.drops.push({ x: enemy.x + (random() - 0.5) * 30, y: enemy.y + (random() - 0.5) * 30,
        vx: (random() - 0.5) * 60, vy: (random() - 0.5) * 60, value: 1, life: 12 });
    }
    if (enemy.kind === 'king') return EVENT_KILL | EVENT_WIN;
    return EVENT_KILL;
  }

  function startWave(wave) {
    state.wave = wave;
    state.queue = waveQueue(random, wave);
    state.spawnTimer = 0.5;
    state.bossSpawnTimer = 8;
    state.phase = 'fight';
    return wave === TOTAL_WAVES ? EVENT_BOSS : 0;
  }

  function reset() {
    state.player.x = FIELD.centreX;
    state.player.y = FIELD.centreY + 170;
    state.player.hp = PLAYER.maxHp;
    state.player.maxHp = PLAYER.maxHp;
    state.player.speed = PLAYER.speed;
    state.player.damage = PLAYER.boltDamage;
    state.player.fireInterval = PLAYER.fireInterval;
    state.player.pierce = 0;
    state.player.fireTimer = 0;
    state.player.dashTimer = 0;
    state.player.dashCooldown = 0;
    state.player.invulnerable = 0;
    state.lantern.hp = LANTERN.maxHp;
    state.wave = 0; state.phase = 'fight';
    state.score = 0; state.shards = 0; state.combo = 0; state.comboTimer = 0; state.bestCombo = 0;
    state.kills = 0; state.shotsFired = 0; state.shotsHit = 0; state.time = 0; state.waveBonus = 0;
    state.upgrades = SHOP.map(() => 0);
    state.enemies.length = 0; state.bolts.length = 0; state.foeBolts.length = 0;
    state.drops.length = 0; state.particles.length = 0; state.floats.length = 0;
    state.queue.length = 0; state.shake = 0;
    return startWave(1);
  }

  /** Buy shop item `index` (0-based). Returns true when the purchase went through. */
  function buy(index) {
    const item = SHOP[index];
    if (!item || state.phase !== 'shop') return false;
    const level = state.upgrades[index];
    if (level >= item.max) return false;
    const cost = item.costs[level];
    if (state.shards < cost) return false;
    state.shards -= cost;
    state.upgrades[index] = level + 1;
    const p = state.player;
    if (index === 0) p.fireInterval *= 0.85;
    else if (index === 1) p.damage += 1;
    else if (index === 2) p.speed *= 1.12;
    else if (index === 3) { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); }
    else if (index === 4) state.lantern.hp = Math.min(state.lantern.maxHp, state.lantern.hp + 40);
    else if (index === 5) p.pierce += 1;
    return true;
  }

  function hurtPlayer(amount, x, y) {
    const p = state.player;
    if (p.invulnerable > 0 || p.dashTimer > 0) return 0;
    p.hp -= amount;
    p.invulnerable = PLAYER.invulnerable;
    state.shake = Math.max(state.shake, 7);
    burst(p.x, p.y, '#ff5d73', 10, 140);
    state.combo = 0;
    if (p.hp <= 0) { p.hp = 0; state.phase = 'lost'; return EVENT_HIT | EVENT_OVER; }
    return EVENT_HIT;
  }

  function hurtLantern(amount) {
    state.lantern.hp -= amount;
    state.shake = Math.max(state.shake, 6);
    burst(LANTERN.x, LANTERN.y, '#ffd166', 8, 120);
    if (state.lantern.hp <= 0) {
      state.lantern.hp = 0;
      state.phase = 'lost';
      return EVENT_LANTERN_HIT | EVENT_OVER;
    }
    return EVENT_LANTERN_HIT;
  }

  function step(dt, input) {
    let events = 0;
    if (state.phase !== 'fight') return events;
    state.time += dt;
    const p = state.player;

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 22);

    // --- player movement, aim, dash ---
    const mx = input.moveX || 0;
    const my = input.moveY || 0;
    const len = Math.hypot(mx, my) || 1;
    let speed = p.speed;
    if (input.dash && p.dashCooldown <= 0 && (mx !== 0 || my !== 0)) {
      p.dashTimer = PLAYER.dashTime;
      p.dashCooldown = PLAYER.dashCooldown;
      events |= EVENT_DASH;
    }
    if (p.dashTimer > 0) { p.dashTimer -= dt; speed = PLAYER.dashSpeed; }
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    p.x = Math.min(FIELD.width - p.radius, Math.max(p.radius, p.x + (mx / len) * speed * dt * (mx || my ? 1 : 0)));
    p.y = Math.min(FIELD.height - p.radius, Math.max(p.radius, p.y + (my / len) * speed * dt * (mx || my ? 1 : 0)));
    p.angle = Math.atan2((input.aimY ?? p.y) - p.y, (input.aimX ?? p.x) - p.x);
    if (p.invulnerable > 0) p.invulnerable -= dt;
    if (p.fireTimer > 0) p.fireTimer -= dt;

    if (input.firing && p.fireTimer <= 0) {
      p.fireTimer = p.fireInterval;
      state.shotsFired += 1;
      state.bolts.push({ x: p.x + Math.cos(p.angle) * (p.radius + 8), y: p.y + Math.sin(p.angle) * (p.radius + 8),
        vx: Math.cos(p.angle) * PLAYER.boltSpeed, vy: Math.sin(p.angle) * PLAYER.boltSpeed,
        damage: p.damage, pierce: p.pierce, hit: new Set(), life: 1.2 });
      events |= EVENT_SHOOT;
    }

    // --- spawning ---
    if (state.queue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEnemy(state.queue.shift());
        const base = Math.max(0.35, 1.05 - state.wave * 0.06);
        state.spawnTimer = base * (0.7 + random() * 0.6);
      }
    }
    const king = state.enemies.find((e) => e.kind === 'king');
    if (king) {
      state.bossSpawnTimer -= dt;
      if (state.bossSpawnTimer <= 0) {
        state.bossSpawnTimer = 8;
        for (let i = 0; i < 2; i += 1) spawnEnemy('cinder');
      }
    }

    // --- player bolts ---
    for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
      const b = state.bolts[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let dead = b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20;
      if (!dead) {
        for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
          const e = state.enemies[j];
          if (b.hit.has(e)) continue;
          if (dist(b.x, b.y, e.x, e.y) < e.radius + PLAYER.boltRadius) {
            b.hit.add(e);
            e.hp -= b.damage;
            e.flash = 0.12;
            state.shotsHit += 1;
            burst(b.x, b.y, '#ffd166', 4, 90);
            if (e.hp <= 0) events |= killEnemy(e, j);
            else events |= EVENT_HIT;
            if (b.pierce > 0) { b.pierce -= 1; } else { dead = true; }
            break;
          }
        }
      }
      if (dead) state.bolts.splice(i, 1);
    }

    // --- enemies ---
    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const e = state.enemies[j];
      const spec = ENEMY[e.kind];
      if (e.flash > 0) e.flash -= dt;
      const dPlayer = dist(e.x, e.y, p.x, p.y);
      const dLantern = dist(e.x, e.y, LANTERN.x, LANTERN.y);
      let tx = LANTERN.x;
      let ty = LANTERN.y;
      let target = 'lantern';
      if (e.kind !== 'spitter' && dPlayer < 150) { tx = p.x; ty = p.y; target = 'player'; }
      if (e.kind === 'spitter' && dPlayer < 220) { tx = p.x; ty = p.y; target = 'player'; }

      if (e.kind === 'king' && e.charging > 0) {
        e.charging -= dt;
        e.x += e.chargeX * dt * 3.2;
        e.y += e.chargeY * dt * 3.2;
        if (e.charging <= 0) e.chargeTimer = 4 + random() * 3;
      } else if (e.kind === 'king') {
        e.chargeTimer -= dt;
        if (e.chargeTimer <= 0 && dPlayer < 320) {
          e.charging = 0.7;
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          e.chargeX = Math.cos(a) * e.speed;
          e.chargeY = Math.sin(a) * e.speed;
        } else {
          const a = Math.atan2(ty - e.y, tx - e.x);
          e.x += Math.cos(a) * e.speed * dt;
          e.y += Math.sin(a) * e.speed * dt;
        }
      } else if (e.kind === 'spitter' && dLantern < 300) {
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          e.shootTimer = 2.2;
          const a = Math.atan2(ty - e.y, tx - e.x);
          state.foeBolts.push({ x: e.x, y: e.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190,
            target, life: 4, radius: 7 });
        }
      } else {
        const a = Math.atan2(ty - e.y, tx - e.x);
        let wobble = 0;
        if (e.kind === 'moth') { e.zig += dt * 5; wobble = Math.sin(e.zig) * 0.7; }
        e.x += (Math.cos(a + wobble) * e.speed) * dt;
        e.y += (Math.sin(a + wobble) * e.speed) * dt;
      }

      // Contact attack on whatever it reached.
      if (e.attackTimer > 0) e.attackTimer -= dt;
      const reach = e.radius + (target === 'player' ? p.radius : LANTERN.radius);
      if (dist(e.x, e.y, tx, ty) < reach && e.attackTimer <= 0) {
        e.attackTimer = 0.9;
        if (target === 'player') events |= hurtPlayer(spec.damage, e.x, e.y);
        else events |= hurtLantern(spec.damage);
        if (state.phase === 'lost') return events;
      }
      // A charging king that touches the player hurts through the dash window.
      if (e.kind === 'king' && e.charging > 0 && dPlayer < e.radius + p.radius) {
        events |= hurtPlayer(2, e.x, e.y);
        if (state.phase === 'lost') return events;
      }
    }

    // --- foe bolts ---
    for (let i = state.foeBolts.length - 1; i >= 0; i -= 1) {
      const b = state.foeBolts[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let dead = b.life <= 0;
      if (!dead && dist(b.x, b.y, p.x, p.y) < p.radius + b.radius) {
        events |= hurtPlayer(1, b.x, b.y);
        dead = true;
      }
      if (!dead && dist(b.x, b.y, LANTERN.x, LANTERN.y) < LANTERN.radius + b.radius) {
        events |= hurtLantern(1);
        dead = true;
      }
      if (state.phase === 'lost') return events;
      if (dead) state.foeBolts.splice(i, 1);
    }

    // --- shard drops: drift, then magnet to the keeper ---
    for (let i = state.drops.length - 1; i >= 0; i -= 1) {
      const d = state.drops[i];
      d.life -= dt;
      const dd = dist(d.x, d.y, p.x, p.y);
      if (dd < PLAYER.pickupRadius) {
        const a = Math.atan2(p.y - d.y, p.x - d.x);
        const pull = 520 * (1 - dd / PLAYER.pickupRadius) + 120;
        d.x += Math.cos(a) * pull * dt;
        d.y += Math.sin(a) * pull * dt;
      } else {
        d.x += d.vx * dt; d.y += d.vy * dt;
        d.vx *= 0.98; d.vy *= 0.98;
      }
      if (dd < p.radius + 12) {
        state.drops.splice(i, 1);
        state.shards += d.value;
        events |= EVENT_PICKUP;
      } else if (d.life <= 0) state.drops.splice(i, 1);
    }

    // --- particles and floating text ---
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floats.length - 1; i >= 0; i -= 1) {
      const f = state.floats[i];
      f.y -= 34 * dt; f.life -= dt;
      if (f.life <= 0) state.floats.splice(i, 1);
    }

    // --- wave clear / victory ---
    if (state.phase === 'fight' && state.queue.length === 0 && state.enemies.length === 0) {
      if (state.wave >= TOTAL_WAVES) {
        state.phase = 'won';
        return events | EVENT_WIN;
      }
      state.waveBonus = 50 * state.wave;
      state.score += state.waveBonus;
      state.phase = 'shop';
      return events | EVENT_WAVE_CLEAR;
    }
    return events;
  }

  /** Staging helper for screenshots only: a keeper strong enough to win, so the
   *  victory scene can be reached by playing the real rules forward. */
  function boostForDemo() {
    state.player.damage = 6;
    state.player.fireInterval = 0.1;
    state.player.speed = 330;
    state.player.maxHp = 400;
    state.player.hp = 400;
  }

  return { state, reset, step, buy, startWave, boostForDemo };
}
