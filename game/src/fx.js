// fx.js — feedback on every action: floating burn numbers, light
// particles, breach flashes and screen shake. Effects are pure visuals —
// they never change the sim — but they are the reason a burn feels like a
// burn. The GLEAM step sizes the floating numbers, so the combo is
// readable even with the sound off.

export function createFx() {
  return { floaters: [], particles: [], shake: 0 };
}

export function addFloater(fx, x, y, text, color, big = false) {
  fx.floaters.push({ x, y, text, color, age: 0, life: 0.9, big });
  if (fx.floaters.length > 60) fx.floaters.shift();
}

export function addParticles(fx, x, y, color, count = 8, speed = 60) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    fx.particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20,
      age: 0, life: 0.5 + Math.random() * 0.4, color, size: 2 + Math.random() * 3,
    });
  }
  if (fx.particles.length > 300) fx.particles.splice(0, fx.particles.length - 300);
}

export function addShake(fx, amount) {
  fx.shake = Math.min(14, fx.shake + amount);
}

export function stepFx(fx, dt) {
  for (const f of fx.floaters) f.age += dt;
  fx.floaters = fx.floaters.filter((f) => f.age < f.life);
  for (const p of fx.particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 60 * dt;
  }
  fx.particles = fx.particles.filter((p) => p.age < p.life);
  fx.shake = Math.max(0, fx.shake - dt * 30);
}

// Shake offset for the current frame (0 when shake is disabled).
export function shakeOffset(fx, enabled) {
  if (!enabled || fx.shake <= 0.2) return { x: 0, y: 0 };
  const s = fx.shake;
  return { x: (Math.random() - 0.5) * s, y: (Math.random() - 0.5) * s };
}
