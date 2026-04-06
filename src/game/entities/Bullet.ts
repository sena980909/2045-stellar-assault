// ===== BULLET RENDERING & UPDATE =====

import { BulletData } from '../types';

export function updateBullet(bullet: BulletData, dt: number) {
  bullet.x += bullet.vx * dt;
  bullet.y += bullet.vy * dt;
}

export function drawBullet(ctx: CanvasRenderingContext2D, bullet: BulletData, _time: number) {
  ctx.save();
  // No shadowBlur for mobile performance

  if (bullet.isPlayer) {
    // Player bullet - thin laser line
    ctx.fillStyle = bullet.color;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    // Bright core
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bullet.x + 1, bullet.y + 2, bullet.width - 2, bullet.height - 4);
  } else {
    // Enemy bullet - simple glowing orb (no radialGradient for perf)
    const cx = bullet.x + bullet.width / 2;
    const cy = bullet.y + bullet.height / 2;
    const r = bullet.width / 2;

    // Outer glow layer
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
