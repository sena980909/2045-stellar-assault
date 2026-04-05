// ===== EXPLOSION & PARTICLE EFFECTS =====

import { ExplosionData, Particle } from '../types';

export function createExplosion(x: number, y: number, size: number, color: string): ExplosionData {
  return {
    x,
    y,
    radius: 0,
    maxRadius: size,
    alpha: 1,
    color,
    active: true,
  };
}

export function updateExplosion(exp: ExplosionData, dt: number) {
  exp.radius += exp.maxRadius * 3 * dt;
  exp.alpha -= 2.5 * dt;
  if (exp.alpha <= 0) {
    exp.active = false;
  }
}

export function drawExplosion(ctx: CanvasRenderingContext2D, exp: ExplosionData) {
  if (!exp.active) return;
  ctx.save();
  ctx.globalAlpha = exp.alpha;
  const grad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, exp.color);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function createParticles(x: number, y: number, count: number, color: string): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 200;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.5,
      maxLife: 0.8,
      color,
      size: 1 + Math.random() * 3,
      active: true,
    });
  }
  return particles;
}

export function updateParticle(p: Particle, dt: number) {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.life -= dt;
  if (p.life <= 0) p.active = false;
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  if (!p.active) return;
  ctx.save();
  ctx.globalAlpha = p.life / p.maxLife;
  ctx.fillStyle = p.color;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 4;
  ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  ctx.restore();
}
