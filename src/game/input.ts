/** Raw keyboard + pointer-lock mouse state, read by the player controller each frame. */
export const keys = new Set<string>();
export const mouse = {dx: 0, dy: 0, wheel: 0, locked: false};

export const consumeMouse = () => {
  const out = {dx: mouse.dx, dy: mouse.dy, wheel: mouse.wheel};
  mouse.dx = 0;
  mouse.dy = 0;
  mouse.wheel = 0;
  return out;
};

export const attachInput = (canvas: HTMLCanvasElement, onInteract: () => void) => {
  const down = (e: KeyboardEvent) => {
    keys.add(e.code);
    if (e.code === 'KeyE') onInteract();
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  };
  const up = (e: KeyboardEvent) => keys.delete(e.code);
  const move = (e: MouseEvent) => {
    if (!mouse.locked) return;
    mouse.dx += e.movementX;
    mouse.dy += e.movementY;
  };
  const wheel = (e: WheelEvent) => {
    mouse.wheel += e.deltaY;
  };
  const click = () => {
    if (!mouse.locked) canvas.requestPointerLock();
  };
  const lockChange = () => {
    mouse.locked = document.pointerLockElement === canvas;
    if (!mouse.locked) keys.clear();
  };

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('mousemove', move);
  window.addEventListener('wheel', wheel, {passive: true});
  canvas.addEventListener('click', click);
  document.addEventListener('pointerlockchange', lockChange);

  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('mousemove', move);
    window.removeEventListener('wheel', wheel);
    canvas.removeEventListener('click', click);
    document.removeEventListener('pointerlockchange', lockChange);
  };
};
