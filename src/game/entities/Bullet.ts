// ===== BULLET RENDERING & UPDATE =====

import { BulletData } from '../types';

export function updateBullet(bullet: BulletData, dt: number) {
  bullet.x += bullet.vx * dt;
  bullet.y += bullet.vy * dt;
}

export function drawBullet(ctx: CanvasRenderingContext2D, bullet: BulletData, time: number) {
  ctx.save();
  ctx.shadowColor = bullet.color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = bullet.color;

  if (bullet.isPlayer) {
    // Player bullet - thin laser line
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    // Bright core
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bullet.x + 1, bullet.y + 2, bullet.width - 2, bullet.height - 4);
  } else {
    // Enemy bullet - glowing orb
    const cx = bullet.x + bullet.width / 2;
    const cy = bullet.y + bullet.height / 2;
    const r = bullet.width / 2;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, bullet.color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
