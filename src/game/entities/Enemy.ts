// ===== ENEMY ENTITIES =====

import { EnemyType, EnemyData, BulletData } from '../types';

// ===== ENEMY TYPE REGISTRY =====
// To add custom enemy types per-stage, call registerEnemyType() or use stage.enemyTypes.

export function registerEnemyType(name: string, type: EnemyType) {
  ENEMY_TYPES[name] = type;
}

export function registerEnemyTypes(types: Record<string, EnemyType>) {
  for (const [name, type] of Object.entries(types)) {
    ENEMY_TYPES[name] = type;
  }
}

export const ENEMY_TYPES: Record<string, EnemyType> = {
  scout: {
    name: 'Scout Drone',
    hp: 1,
    speed: 200,
    width: 22,
    height: 22,
    score: 100,
    color: '#ff4444',
    glowColor: '#ff0000',
    pattern: 'straight',
    canShoot: false,
    shootInterval: 0,
    bulletCount: 0,
  },
  fighter: {
    name: 'Fighter',
    hp: 3,
    speed: 130,
    width: 26,
    height: 26,
    score: 250,
    color: '#ff8800',
    glowColor: '#ff6600',
    pattern: 'zigzag',
    canShoot: true,
    shootInterval: 1.3,
    bulletCount: 1,
  },
  heavy: {
    name: 'Heavy Cruiser',
    hp: 8,
    speed: 65,
    width: 38,
    height: 38,
    score: 500,
    color: '#cc44ff',
    glowColor: '#9900ff',
    pattern: 'slow',
    canShoot: true,
    shootInterval: 1.0,
    bulletCount: 3,
  },
  kamikaze: {
    name: 'Kamikaze',
    hp: 1,
    speed: 260,
    width: 18,
    height: 18,
    score: 150,
    color: '#ffff00',
    glowColor: '#ffcc00',
    pattern: 'chase',
    canShoot: false,
    shootInterval: 0,
    bulletCount: 0,
  },
};

export function createEnemy(typeName: string, x: number, y: number): EnemyData {
  const type = ENEMY_TYPES[typeName];
  return {
    x: x - type.width / 2,
    y,
    width: type.width,
    height: type.height,
    hp: type.hp,
    maxHp: type.hp,
    type,
    vx: 0,
    vy: type.speed,
    shootTimer: type.shootInterval * Math.random(),
    patternTimer: 0,
    score: type.score,
    active: true,
    hitFlash: 0,
  };
}

// ===== ENEMY MOVEMENT PATTERN REGISTRY =====
type EnemyPatternHandler = (enemy: EnemyData, dt: number, playerX: number, playerY: number) => void;

const ENEMY_PATTERNS: Record<string, EnemyPatternHandler> = {};

export function registerEnemyPattern(name: string, handler: EnemyPatternHandler) {
  ENEMY_PATTERNS[name] = handler;
}

// Built-in movement patterns
registerEnemyPattern('straight', (enemy) => {
  enemy.vy = enemy.type.speed;
});
registerEnemyPattern('zigzag', (enemy) => {
  enemy.vx = Math.sin(enemy.patternTimer * 3) * 120;
  enemy.vy = enemy.type.speed;
});
registerEnemyPattern('slow', (enemy) => {
  enemy.vy = enemy.type.speed;
  enemy.vx = Math.sin(enemy.patternTimer * 1.5) * 50;
});
registerEnemyPattern('chase', (enemy, _dt, playerX, playerY) => {
  const dx = (playerX + 16) - (enemy.x + enemy.width / 2);
  const dy = (playerY + 16) - (enemy.y + enemy.height / 2);
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  enemy.vx = (dx / dist) * enemy.type.speed;
  enemy.vy = (dy / dist) * enemy.type.speed;
});

export function updateEnemy(
  enemy: EnemyData,
  dt: number,
  playerX: number,
  playerY: number,
  canvasWidth: number
) {
  enemy.patternTimer += dt;

  const patternHandler = ENEMY_PATTERNS[enemy.type.pattern];
  if (patternHandler) {
    patternHandler(enemy, dt, playerX, playerY);
  } else {
    enemy.vy = enemy.type.speed; // fallback: straight down
  }

  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;

  // Clamp x
  if (enemy.x < 0) enemy.x = 0;
  if (enemy.x + enemy.width > canvasWidth) enemy.x = canvasWidth - enemy.width;

  enemy.shootTimer -= dt;
  if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
}

export function enemyShoot(enemy: EnemyData, playerX: number, playerY: number): BulletData[] {
  if (!enemy.type.canShoot || enemy.shootTimer > 0 || enemy.y + enemy.height < 0) return [];
  enemy.shootTimer = enemy.type.shootInterval;

  const cx = enemy.x + enemy.width / 2;
  const cy = enemy.y + enemy.height / 2;
  const bullets: BulletData[] = [];
  const speed = 350;

  if (enemy.type.bulletCount === 1) {
    const dx = (playerX + 16) - cx;
    const dy = (playerY + 16) - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    bullets.push({
      x: cx - 3,
      y: cy,
      width: 8,
      height: 8,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      damage: 1,
      isPlayer: false,
      active: true,
      color: '#ff6644',
    });
  } else if (enemy.type.bulletCount === 3) {
    for (let i = -1; i <= 1; i++) {
      const angle = Math.PI / 2 + (i * Math.PI / 8);
      bullets.push({
        x: cx - 3,
        y: cy,
        width: 6,
        height: 6,
        vx: Math.cos(angle) * speed * 0.3,
        vy: Math.sin(angle) * speed,
        damage: 1,
        isPlayer: false,
        active: true,
        color: '#ff44ff',
      });
    }
  } else if (enemy.type.bulletCount === 5) {
    for (let i = -2; i <= 2; i++) {
      const angle = Math.PI / 2 + (i * Math.PI / 10);
      bullets.push({
        x: cx - 3,
        y: cy,
        width: 7,
        height: 7,
        vx: Math.cos(angle) * speed * 0.35,
        vy: Math.sin(angle) * speed * 0.9,
        damage: 1,
        isPlayer: false,
        active: true,
        color: '#66aaff',
      });
    }
  }

  return bullets;
}

export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: EnemyData, time: number) {
  const cx = enemy.x + enemy.width / 2;
  const cy = enemy.y + enemy.height / 2;
  const hw = enemy.width / 2;
  const hh = enemy.height / 2;

  ctx.save();

  // Body (no shadowBlur for mobile performance)
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = enemy.type.color;
  ctx.lineWidth = 2;

  if (enemy.type.pattern === 'chase') {
    // Kamikaze - circle
    ctx.beginPath();
    ctx.arc(cx, cy, hw, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Hit flash removed — was causing visible blinking
    // Pulsing core
    ctx.fillStyle = `rgba(255, 255, 0, ${0.5 + 0.5 * Math.sin(time * 15)})`;
    ctx.beginPath();
    ctx.arc(cx, cy, hw * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Inverted triangle (facing down)
    ctx.beginPath();
    ctx.moveTo(cx, enemy.y + enemy.height);
    ctx.lineTo(enemy.x, enemy.y);
    ctx.lineTo(enemy.x + enemy.width, enemy.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Hit flash removed — was causing visible blinking

    // Core
    ctx.fillStyle = enemy.type.color;
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(time * 4);
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // HP bar for enemies with more than 1 HP
  if (enemy.maxHp > 1) {
    ctx.globalAlpha = 1;
    const barWidth = enemy.width;
    const barHeight = 3;
    const barY = enemy.y - 6;
    ctx.fillStyle = '#333';
    ctx.fillRect(enemy.x, barY, barWidth, barHeight);
    ctx.fillStyle = enemy.type.color;
    ctx.fillRect(enemy.x, barY, barWidth * (enemy.hp / enemy.maxHp), barHeight);
  }

  ctx.restore();
}
