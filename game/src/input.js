// Keyboard input: held keys give a movement vector every frame, and
// edge-triggered actions (confirm, pause, dash, nova, overdrive, upgrade picks,
// realm picks) are taken once per press. Four realms means four pick keys.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_NOVA = 8;
export const ACTION_UPGRADE_1 = 16;
export const ACTION_UPGRADE_2 = 32;
export const ACTION_UPGRADE_3 = 64;
export const ACTION_MUTE = 128;
export const ACTION_LEFT = 256;
export const ACTION_RIGHT = 512;
export const ACTION_OVERDRIVE = 1024;
export const ACTION_UPGRADE_4 = 2048;

const MOVE_KEYS = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

export function createInput(target) {
  const held = new Set();
  let queued = 0;

  function onKeyDown(event) {
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') queued |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') queued |= ACTION_PAUSE;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'KeyJ') queued |= ACTION_DASH;
    if (event.code === 'KeyE' || event.code === 'KeyK') queued |= ACTION_NOVA;
    if (event.code === 'KeyQ' || event.code === 'KeyL') queued |= ACTION_OVERDRIVE;
    if (event.code === 'Digit1') queued |= ACTION_UPGRADE_1;
    if (event.code === 'Digit2') queued |= ACTION_UPGRADE_2;
    if (event.code === 'Digit3') queued |= ACTION_UPGRADE_3;
    if (event.code === 'Digit4') queued |= ACTION_UPGRADE_4;
    if (event.code === 'KeyM') queued |= ACTION_MUTE;
    if (event.code === 'ArrowLeft') queued |= ACTION_LEFT;
    if (event.code === 'ArrowRight') queued |= ACTION_RIGHT;
    // Keep the page from scrolling on the keys the game owns.
    if (MOVE_KEYS[event.code] || event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onBlur() {
    held.clear();
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onBlur);

  return {
    /** Normalised movement vector from the held WASD / arrow keys. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const d = MOVE_KEYS[code];
        if (d) {
          x += d[0];
          y += d[1];
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    fireHeld() {
      return held.has('Space');
    },
    /** Actions pressed since the last call; reading them clears the queue. */
    takeActions() {
      const out = queued;
      queued = 0;
      return out;
    },
  };
}
