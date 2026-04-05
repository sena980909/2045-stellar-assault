// ===== PLAYER ENTITY =====

import { PlayerState, BulletData } from '../types';

export function createPlayer(canvasWidth: number, canvasHeight: number): PlayerState {
  return {
    x: canvasWidth / 2 - 16,
    y: canvasHeight - 80,
    width: 32,
    height: 32,
    lives: 3,
    power: 1,
    bombs: 3,
    speed: 4.5,
    score: 0,
    invincible: false,
    invincibleTimer: 0,
    shootTimer: 0,
    shooting: false,
    focused: false,
  };
}

export function updatePlayer(
  player: PlayerState,
  dx: number,
  dy: number,
  shooting: boolean,
  dt: number,
  canvasWidth: number,
  canvasHeight: number,
  focused: boolean = false
) {
  player.focused = focused;
  const speedMult = focused ? 0.4 : 1.0;
  const speed = player.speed * 60 * dt * speedMult;
  player.x += dx * speed;
  player.y += dy * speed;

  // Clamp to canvas
  player.x = Math.max(0, Math.min(canvasWidth - player.width, player.x));
  player.y = Math.max(0, Math.min(canvasHeight - player.height, player.y));

  player.shooting = shooting;

  if (player.invincible) {
    player.invincibleTimer -= dt;
    if (player.invincibleTimer <= 0) {
      player.invincible = false;
      player.invincibleTimer = 0;
    }
  }

  player.shootTimer -= dt;
}

export function playerShoot(player: PlayerState): BulletData[] {
  if (player.shootTimer > 0 || !player.shooting) return [];
  player.shootTimer = 0.12; // fire rate

  const bullets: BulletData[] = [];
  const cx = player.x + player.width / 2;
  const bulletSpeed = -600;

  if (player.power >= 1) {
    bullets.push(createBullet(cx - 3, player.y, 0, bulletSpeed));
  }
  if (player.power >= 2) {
    bullets.push(createBullet(cx - 10, player.y + 5, -20, bulletSpeed));
    bullets.push(createBullet(cx + 4, player.y + 5, 20, bulletSpeed));
  }
  if (player.power >= 3) {
    bullets.push(createBullet(cx - 16, player.y + 10, -45, bulletSpeed * 0.95));
    bullets.push(createBullet(cx + 10, player.y + 10, 45, bulletSpeed * 0.95));
  }
  if (player.power >= 4) {
    bullets.push(createBullet(cx - 22, player.y + 8, -75, bulletSpeed * 0.9));
    bullets.push(createBullet(cx + 16, player.y + 8, 75, bulletSpeed * 0.9));
  }

  return bullets;
}

function createBullet(x: number, y: number, vx: number, vy: number): BulletData {
  return {
    x,
    y,
    width: 6,
    height: 14,
    vx,
    vy,
    damage: 1,
    isPlayer: true,
    active: true,
    color: '#00ffff',
  };
}

export function getPlayerHitbox(player: PlayerState): { x: number; y: number; width: number; height: number } {
  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;
  const size = player.focused ? 6 : 12;
  return { x: cx - size / 2, y: cy - size / 2, width: size, height: size };
}

// Returns true if no lives left (game over)
export function killPlayer(player: PlayerState, canvasWidth: number, canvasHeight: number): boolean {
  player.lives--;
  if (player.lives <= 0) {
    player.lives = 0;
    return true; // game over
  }
  // Respawn: partial power reset, keep score/bombs, become invincible
  player.power = Math.max(player.power - 2, 1); // lose 2 levels, min 1
  player.speed = 4.5;
  player.x = canvasWidth / 2 - player.width / 2;
  player.y = canvasHeight - 80;
  player.invincible = true;
  player.invincibleTimer = 2.5; // longer invincibility on respawn
  return false;
}

export function drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerState, time: number) {
  if (player.invincible && Math.floor(time * 10) % 2 === 0) return;

  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;

  ctx.save();

  // Engine glow
  const glowGradient = ctx.createRadialGradient(cx, player.y + player.height + 5, 0, cx, player.y + player.height + 5, 20);
  glowGradient.addColorStop(0, 'rgba(0, 200, 255, 0.8)');
  glowGradient.addColorStop(0.5, 'rgba(0, 100, 255, 0.3)');
  glowGradient.addColorStop(1, 'rgba(0, 50, 255, 0)');
  ctx.fillStyle = glowGradient;
  ctx.fillRect(cx - 20, player.y + player.height - 5, 40, 30);

  // Ship body - futuristic triangle
  ctx.fillStyle = '#1a1a2e';
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(cx, player.y);
  ctx.lineTo(player.x + player.width + 4, player.y + player.height);
  ctx.lineTo(cx, player.y + player.height - 8);
  ctx.lineTo(player.x - 4, player.y + player.height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Core glow
  ctx.fillStyle = `rgba(0, 255, 255, ${0.5 + 0.3 * Math.sin(time * 5)})`;
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Wing accents
  ctx.strokeStyle = '#0088ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 2, player.y + 8);
  ctx.lineTo(player.x - 2, player.y + player.height - 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 2, player.y + 8);
  ctx.lineTo(player.x + player.width + 2, player.y + player.height - 2);
  ctx.stroke();

  // Focus mode hitbox indicator
  if (player.focused) {
    const hitbox = getPlayerHitbox(player);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + 0.3 * Math.sin(time * 10)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, hitbox.width / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
    // Center dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
