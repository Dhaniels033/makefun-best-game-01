// Keyboard and pointer input. Held keys give a steering direction and the mouse
// gives the aim point (in arena coordinates); one-shot presses (start, restart,
// pause, dash, shop keys) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const DASH = new Set(['ShiftLeft', 'ShiftRight']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas, toArena) {
  const keys = new Set();
  let actions = 0;
  let firing = false;
  let shopMode = false;
  let aimX = 640;
  let aimY = 200;
  let shopKey = 0; // 1..6 when a shop number key was pressed

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code) || RIGHT.has(event.code) || UP.has(event.code) || DOWN.has(event.code)) {
      keys.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (/^Digit[1-6]$/.test(event.code)) {
      shopKey = Number(event.code.slice(5));
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => { keys.delete(event.code); });
  window.addEventListener('blur', () => { keys.clear(); firing = false; });

  function updateAim(event) {
    const rect = canvas.getBoundingClientRect();
    const point = toArena(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
    aimX = point.x;
    aimY = point.y;
  }
  canvas.addEventListener('pointermove', updateAim);
  canvas.addEventListener('pointerdown', (event) => {
    updateAim(event);
    if (shopMode) return; // in the shop, clicks buy / continue via the click handler
    if (event.button === 2) { actions |= ACTION_DASH; return; }
    firing = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => { firing = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** Steering -1..1 on each axis, from the held movement keys. */
    move() {
      const x = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
      const y = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);
      return { x, y };
    },
    aim() { return { x: aimX, y: aimY }; },
    get firing() { return firing; },
    setShopMode(value) { shopMode = !!value; if (value) firing = false; },
    takeActions() { const taken = actions; actions = 0; return taken; },
    takeShopKey() { const taken = shopKey; shopKey = 0; return taken; },
    /** Click position in arena coordinates, for shop rows / buttons. */
    clickPoint(event) {
      const rect = canvas.getBoundingClientRect();
      return toArena(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
    },
  };
}
