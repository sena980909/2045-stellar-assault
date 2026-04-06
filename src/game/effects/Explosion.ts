// ===== EXPLOSION & PARTICLE EFFECTS =====

import { ExplosionData, Particle } from '../types';

// --- EXPLOSIONS ---

export function createExplosion(x: number, y: number, size: number, color: string): ExplosionData {
  return { x, y, radius: 0, maxRadius: size, alpha: 1, color, active: true };
}

function createRingExplosion(x: number, y: number, size: number, color: string, delay: number): ExplosionData {
  return { x, y, radius: 0, maxRadius: size, alpha: 1, color, active: true, ring: true, delay };
}

export function updateExplosion(exp: ExplosionData, dt: number) {
  if (exp.delay && exp.delay > 0) {
    exp.delay -= dt;
    return;
  }
  exp.radius += exp.maxRadius * 4 * dt; // faster expansion
  exp.alpha -= 3.0 * dt;
  if (exp.alpha <= 0) exp.active = false;
}

export function drawExplosion(ctx: CanvasRenderingContext2D, exp: ExplosionData) {
  if (!exp.active || (exp.delay && exp.delay > 0)) return;
  ctx.save();
  ctx.globalAlpha = exp.alpha;

  if (exp.ring) {
    // Ring style: expanding hollow circle
    const lineW = Math.max(1, 4 * exp.alpha);
    ctx.strokeStyle = exp.color;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
    ctx.stroke();
    // Inner white flash
    if (exp.alpha > 0.6) {
      ctx.globalAlpha = (exp.alpha - 0.6) * 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = lineW * 0.5;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    // Filled burst: white core -> color -> transparent
    const r = exp.radius;
    // Outer color glow
    ctx.globalAlpha = exp.alpha * 0.5;
    ctx.fillStyle = exp.color;
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, r * 1.3, 0, Math.PI * 2);
    ctx.fill();
    // Main body
    ctx.globalAlpha = exp.alpha;
    const grad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#ffffaa');
    grad.addColorStop(0.5, exp.color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// --- PARTICLES ---

export function createParticles(x: number, y: number, count: number, color: string): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 250;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.5,
      maxLife: 0.8,
      color,
      size: 1.5 + Math.random() * 3,
      active: true,
      type: 'spark',
      gravity: 100 + Math.random() * 150,
    });
  }
  return particles;
}

// Debris chunks — slower, bigger, rotating pieces
export function createDebris(x: number, y: number, count: number, color: string): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 120;
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30, // slight upward bias
      life: 0.5 + Math.random() * 0.8,
      maxLife: 1.3,
      color,
      size: 2 + Math.random() * 4,
      active: true,
      type: 'debris',
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 15,
      gravity: 200 + Math.random() * 100,
    });
  }
  return particles;
}

// Flash sparks — very fast, short-lived white streaks
export function createFlashSparks(x: number, y: number, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 200 + Math.random() * 400;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.08 + Math.random() * 0.15,
      maxLife: 0.23,
      color: '#ffffff',
      size: 1 + Math.random() * 1.5,
      active: true,
      type: 'flash',
    });
  }
  return particles;
}

export function updateParticle(p: Particle, dt: number) {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  // Gravity pulls particles down
  if (p.gravity) p.vy += p.gravity * dt;
  // Friction on debris
  if (p.type === 'debris') {
    p.vx *= 0.97;
    p.vy *= 0.97;
    if (p.rotation !== undefined && p.rotSpeed !== undefined) {
      p.rotation += p.rotSpeed * dt;
    }
  }
  p.life -= dt;
  if (p.life <= 0) p.active = false;
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  if (!p.active) return;
  ctx.save();
  const alpha = Math.max(0, p.life / p.maxLife);

  if (p.type === 'flash') {
    // Fast white streak
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = p.size;
    const tailX = p.x - p.vx * 0.02;
    const tailY = p.y - p.vy * 0.02;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  } else if (p.type === 'debris') {
    // Rotating rectangle chunk
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation ?? 0);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    // Bright edge
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, 1);
  } else {
    // Spark: bright core + trail
    const tailLen = Math.min(8, Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.015);
    const tailX = p.x - p.vx * 0.01 * tailLen;
    const tailY = p.y - p.vy * 0.01 * tailLen;

    // Trail
    ctx.globalAlpha = alpha * 0.3;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.size * 0.8;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // Core
    ctx.globalAlpha = alpha;
    ctx.fillStyle = alpha > 0.5 ? '#ffffff' : p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// --- COMPOSITE EXPLOSION HELPERS ---

export function createBurstExplosion(
  x: number, y: number, size: number, color: string
): { explosions: ExplosionData[]; particles: Particle[] } {
  const explosions: ExplosionData[] = [
    createExplosion(x, y, size, color),
    createRingExplosion(x, y, size * 1.5, color, 0.03),
  ];
  const particles = [
    ...createParticles(x, y, 10, color),
    ...createFlashSparks(x, y, 6),
    ...createDebris(x, y, 3, color),
  ];
  return { explosions, particles };
}

export function createMegaExplosion(
  x: number, y: number
): { explosions: ExplosionData[]; particles: Particle[] } {
  const explosions: ExplosionData[] = [];
  const particles: Particle[] = [];
  const colors = ['#ff8844', '#ffaa22', '#ff4422', '#ffcc44'];

  // Central blast
  explosions.push(createExplosion(x, y, 45, '#ffffff'));
  explosions.push(createRingExplosion(x, y, 60, '#ff8844', 0.05));
  explosions.push(createRingExplosion(x, y, 80, '#ffaa22', 0.12));

  // Scattered secondary blasts
  for (let i = 0; i < 6; i++) {
    const ox = (Math.random() - 0.5) * 50;
    const oy = (Math.random() - 0.5) * 50;
    const c = colors[Math.floor(Math.random() * colors.length)];
    explosions.push(createExplosion(x + ox, y + oy, 20 + Math.random() * 20, c));
    if (i < 3) explosions.push(createRingExplosion(x + ox, y + oy, 30, c, 0.08 + i * 0.06));
  }

  // Tons of particles
  particles.push(...createParticles(x, y, 20, '#ffaa44'));
  particles.push(...createFlashSparks(x, y, 15));
  particles.push(...createDebris(x, y, 8, '#ff8844'));
  particles.push(...createDebris(x, y, 4, '#aaaaaa'));

  return { explosions, particles };
}
