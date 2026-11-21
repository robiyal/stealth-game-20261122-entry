// NIGHTMAIL — keyboard and mouse. One job: turn browser events into a
// small state object the player module reads each frame.

export function makeInput(canvas) {
  const input = {
    keys: {},
    // Edge-triggered presses since the last frame. Polling `keys` misses a
    // tap that lands between two frames, so one-shot actions (R retry,
    // ESC pause) read from here instead.
    justPressed: new Set(),
    consumeClick: null, // {x, y} in canvas pixels, read once by the player
    consumeHide: false, // E pressed, read once by the player
    consumeAny: false, // any key/click, read once by menus
    mouse: { x: 0, y: 0 },
    // True once if the code was pressed since the last frame.
    wasPressed(code) {
      const hit = input.justPressed.has(code);
      input.justPressed.delete(code);
      return hit;
    },
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (!e.repeat) {
      input.consumeAny = true;
      input.justPressed.add(e.code);
      if (e.code === 'KeyE') input.consumeHide = true;
    }
    input.keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => {
    input.keys[e.code] = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
    input.mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
  });
  canvas.addEventListener('click', () => {
    input.consumeClick = { x: input.mouse.x, y: input.mouse.y };
    input.consumeAny = true;
  });

  // Losing the window clears held keys so the player never walks alone.
  window.addEventListener('blur', () => {
    input.keys = {};
  });

  return input;
}
