// ===== BOSS ENTITIES =====

import { BossData, BossTemplate, BulletData } from '../types';

export function createBoss(template: BossTemplate, canvasWidth: number): BossData {
  return {
    x: canvasWidth / 2 - template.width / 2,
    y: -template.height - 10,
    width: template.width,
    height: template.height,
    hp: template.hp,
    maxHp: template.hp,
    name: template.name,
    phases: template.phases,
    currentPhase: 0,
    shootTimer: 1,
    patternTimer: 0,
    moveDir: 1,
    score: template.score,
    color: template.color,
    glowColor: template.glowColor,
    active: true,
    entering: true,
    enterY: template.enterY,
    hitFlash: 0,
  };
}

export function updateBoss(boss: BossData, dt: number, canvasWidth: number) {
  if (boss.entering) {
    boss.y += 60 * dt;
    if (boss.y >= boss.enterY) {
      boss.y = boss.enterY;
      boss.entering = false;
    }
    return;
  }

  // Update phase - pick the highest index whose threshold we've crossed
  const hpRatio = boss.hp / boss.maxHp;
  const prevPhase = boss.currentPhase;
  for (let i = boss.phases.length - 1; i >= 0; i--) {
    if (hpRatio <= boss.phases[i].hpThreshold) {
      boss.currentPhase = i;
      break;
    }
  }
  // Reset shoot timer on phase change to prevent burst fire
  if (boss.currentPhase !== prevPhase) {
    boss.shootTimer = boss.phases[boss.currentPhase].shootInterval;
  }

  const phase = boss.phases[boss.currentPhase];
  boss.patternTimer += dt;

  // Movement
  boss.x += boss.moveDir * phase.speed * dt;
  if (boss.x <= 10) { boss.moveDir = 1; boss.x = 10; }
  if (boss.x + boss.width >= canvasWidth - 10) { boss.moveDir = -1; boss.x = canvasWidth - 10 - boss.width; }

  boss.shootTimer -= dt;
  if (boss.hitFlash > 0) boss.hitFlash -= dt;
}

// ===== BOSS PATTERN REGISTRY =====
// To add a new pattern: call registerBossPattern('name', handler) from your stage data file.

type BossPatternHandler = (boss: BossData, playerX: number, playerY: number, makeBullet: typeof makeBossBullet) => BulletData[];

const BOSS_PATTERNS: Record<string, BossPatternHandler> = {};

export function registerBossPattern(name: string, handler: BossPatternHandler) {
  BOSS_PATTERNS[name] = handler;
}

// Built-in patterns
registerBossPattern('spread', (boss, _px, _py, mk) => {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const speed = 320;
  const bullets: BulletData[] = [];
  for (let i = -2; i <= 2; i++) {
    const angle = Math.PI / 2 + (i * Math.PI / 10);
    bullets.push(mk(cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed, boss.color));
  }
  return bullets;
});

registerBossPattern('aimed', (boss, px, py, mk) => {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const speed = 320;
  const dx = (px + 16) - cx;
  const dy = (py + 16) - cy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const bullets: BulletData[] = [];
  for (let i = -1; i <= 1; i++) {
    const spread = i * 30;
    bullets.push(mk(cx + spread, cy, (dx / dist) * speed * 1.3, (dy / dist) * speed * 1.3, '#ff8888'));
  }
  return bullets;
});

registerBossPattern('spiral', (boss, _px, _py, mk) => {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const speed = 320;
  const angle = boss.patternTimer * 5;
  const vx1 = Math.cos(angle) * speed * 0.7;
  const vy1 = Math.abs(Math.sin(angle)) * speed * 0.6 + 150;
  return [mk(cx, cy, vx1, vy1, boss.color), mk(cx, cy, -vx1, vy1, boss.color)];
});

registerBossPattern('radial', (boss, _px, _py, mk) => {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const speed = 320;
  const count = 8;
  const bullets: BulletData[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * i) / (count - 1) + boss.patternTimer * 0.5;
    bullets.push(mk(cx, cy, Math.cos(angle) * speed * 0.7, Math.abs(Math.sin(angle)) * speed * 0.7 + 60, boss.glowColor));
  }
  return bullets;
});

registerBossPattern('fury', (boss, px, py, mk) => {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const speed = 320;
  const fanAngle = boss.patternTimer * 3;
  // Clamp angle to [0.25, PI-0.25] to prevent near-horizontal stray bullets
  const rawAngle = fanAngle % Math.PI;
  const angle1 = Math.max(0.25, Math.min(Math.PI - 0.25, rawAngle));
  const bullets: BulletData[] = [
    mk(cx, cy, Math.cos(angle1) * speed * 1.0, Math.abs(Math.sin(angle1)) * speed * 0.8 + 120, '#ffff44'),
  ];
  if (Math.floor(boss.patternTimer * 14) % 3 === 0) {
    const dx = (px + 16) - cx;
    const dy = (py + 16) - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    bullets.push(mk(cx, cy, (dx / dist) * speed * 1.4, (dy / dist) * speed * 1.4, '#ff0000'));
  }
  return bullets;
});

export function bossShoot(boss: BossData, playerX: number, playerY: number): BulletData[] {
  if (boss.entering || boss.shootTimer > 0) return [];

  const phase = boss.phases[boss.currentPhase];
  boss.shootTimer = phase.shootInterval;

  const handler = BOSS_PATTERNS[phase.pattern];
  if (!handler) return [];
  return handler(boss, playerX, playerY, makeBossBullet);
}

function makeBossBullet(x: number, y: number, vx: number, vy: number, color: string): BulletData {
  return {
    x: x - 5,
    y,
    width: 10,
    height: 10,
    vx,
    vy,
    damage: 1,
    isPlayer: false,
    active: true,
    color,
  };
}

export function drawBoss(ctx: CanvasRenderingContext2D, boss: BossData, time: number) {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;

  ctx.save();

  // Warning glow
  ctx.shadowColor = boss.glowColor;
  ctx.shadowBlur = 20 + 10 * Math.sin(time * 3);

  // Body
  ctx.fillStyle = '#0a0a1a';
  ctx.strokeStyle = boss.color;
  ctx.lineWidth = 2;

  // Main hull - hexagonal shape
  ctx.beginPath();
  ctx.moveTo(cx, boss.y);
  ctx.lineTo(boss.x + boss.width, boss.y + boss.height * 0.3);
  ctx.lineTo(boss.x + boss.width - 5, boss.y + boss.height);
  ctx.lineTo(boss.x + 5, boss.y + boss.height);
  ctx.lineTo(boss.x, boss.y + boss.height * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hit flash overlay
  if (boss.hitFlash > 0) {
    ctx.globalAlpha = Math.min(boss.hitFlash * 10, 1.0);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Inner details
  ctx.strokeStyle = boss.glowColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 4);
  ctx.beginPath();
  ctx.moveTo(cx, boss.y + 8);
  ctx.lineTo(cx + 15, cy);
  ctx.lineTo(cx, boss.y + boss.height - 8);
  ctx.lineTo(cx - 15, cy);
  ctx.closePath();
  ctx.stroke();

  // Core
  ctx.globalAlpha = 1;
  const coreSize = 6 + 2 * Math.sin(time * 6);
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.4, boss.color);
  coreGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
  ctx.fill();

  // HP Bar
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  const barWidth = boss.width + 20;
  const barX = boss.x - 10;
  const barY = boss.y - 14;
  ctx.fillStyle = '#222';
  ctx.fillRect(barX, barY, barWidth, 6);

  const hpRatio = boss.hp / boss.maxHp;
  const hpColor = hpRatio > 0.5 ? boss.color : hpRatio > 0.25 ? '#ffaa00' : '#ff0000';
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barWidth * hpRatio, 6);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, 6);

  // Boss name
  ctx.fillStyle = boss.color;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(boss.name, cx, barY - 4);

  ctx.restore();
}
