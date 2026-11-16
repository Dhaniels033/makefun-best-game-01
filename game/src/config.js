// Every tuning number and colour for Emberkeep in one place. The arena is a fixed
// 1280x720 logical field; the renderer scales it to the window, so no rule below
// depends on the screen size.
export const FIELD = { width: 1280, height: 720, centreX: 640, centreY: 360 };
export const STEP = 1 / 60;
export const TOTAL_WAVES = 10;
export const BEST_KEY = 'emberkeep.best';
export const SHARD_KEY = 'emberkeep.bestScore';

export const PLAYER = {
  radius: 16, speed: 250, maxHp: 100, fireInterval: 0.22, boltSpeed: 620,
  boltDamage: 1, boltRadius: 6, dashSpeed: 720, dashTime: 0.16, dashCooldown: 1.6,
  pickupRadius: 150, invulnerable: 0.8,
};

export const LANTERN = { x: FIELD.centreX, y: FIELD.centreY, radius: 34, maxHp: 100 };

export const ENEMY = {
  cinder: { hp: 3, speed: 58, radius: 15, damage: 1, score: 10, shards: 2, colour: '#ff7a3c' },
  moth:   { hp: 2, speed: 108, radius: 12, damage: 1, score: 15, shards: 2, colour: '#e8b4ff' },
  spitter:{ hp: 4, speed: 46, radius: 14, damage: 1, score: 25, shards: 3, colour: '#7ee787' },
  brute:  { hp: 15, speed: 30, radius: 24, damage: 3, score: 40, shards: 5, colour: '#ff5d73' },
  king:   { hp: 240, speed: 34, radius: 42, damage: 5, score: 500, shards: 40, colour: '#ffd166' },
};

export const SHOP = [
  { key: '1', name: 'Rapid Ember', desc: 'Fire 18% faster', costs: [30, 45, 60, 80], max: 4 },
  { key: '2', name: 'Heavy Ember', desc: '+1 bolt damage', costs: [40, 60, 90], max: 3 },
  { key: '3', name: 'Swift Boots', desc: 'Move 12% faster', costs: [25, 40, 55], max: 3 },
  { key: '4', name: 'Heartwood Charm', desc: '+25 max HP, heal 25', costs: [35, 50], max: 2 },
  { key: '5', name: 'Lantern Repair', desc: 'Restore 40 lantern HP', costs: [30, 45], max: 2 },
  { key: '6', name: 'Piercing Ember', desc: 'Bolts pierce +1 foe', costs: [60, 90], max: 2 },
];

export const PALETTE = {
  backdrop: '#0b0e1a', ground: '#141830', ring: '#232a4a', text: '#f4ead8',
  muted: '#9aa3c7', gold: '#ffd166', ember: '#ff7a3c', leaf: '#7ee787',
  heart: '#ff5d73', panel: 'rgba(16, 20, 40, 0.92)', panelEdge: '#3a4470',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
