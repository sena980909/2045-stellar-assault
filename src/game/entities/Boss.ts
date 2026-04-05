// ===== BOSS ENTITIES =====

import { BossData, BossPhase, BulletData } from '../types';

interface BossTemplate {
  name: string;
  hp: number;
  width: number;
  height: number;
  score: number;
  color: string;
  glowColor: string;
  enterY: number;
  phases: BossPhase[];
}

const BOSS_TEMPLATES: Record<string, BossTemplate> = {
  stage1: {
    name: 'SENTINEL MK-I',
    hp: 500,
    width: 64,
    height: 48,
    score: 5000,
    color: '#ff4444',
    glowColor: '#ff0000',
    enterY: 60,
    phases: [
      { hpThreshold: 1.0, pattern: 'spread', shootInterval: 0.9, speed: 100 },
      { hpThreshold: 0.4, pattern: 'aimed', shootInterval: 0.55, speed: 150 },
    ],
  },
  stage2: {
    name: 'OVERLORD X-7',
    hp: 1000,
    width: 80,
    height: 56,
    score: 10000,
    color: '#cc44ff',
    glowColor: '#9900ff',
    enterY: 60,
    phases: [
      { hpThreshold: 1.0, pattern: 'spread', shootInterval: 0.75, speed: 110 },
      { hpThreshold: 0.6, pattern: 'spiral', shootInterval: 0.1, speed: 130 },
      { hpThreshold: 0.25, pattern: 'aimed', shootInterval: 0.35, speed: 170 },
    ],
  },
  stage3: {
    name: 'NEXUS PRIME',
    hp: 2000,
    width: 96,
    height: 64,
    score: 20000,
    color: '#ffaa00',
    glowColor: '#ff8800',
    enterY: 50,
    phases: [
      { hpThreshold: 1.0, pattern: 'radial', shootInterval: 0.6, speed: 90 },
      { hpThreshold: 0.7, pattern: 'spiral', shootInterval: 0.08, speed: 120 },
      { hpThreshold: 0.4, pattern: 'aimed', shootInterval: 0.3, speed: 160 },
      { hpThreshold: 0.15, pattern: 'fury', shootInterval: 0.07, speed: 180 },
    ],
  },
};

export function createBoss(stageName: string, canvasWidth: number): BossData {
  const t = BOSS_TEMPLATES[stageName];
  return {
    x: canvasWidth / 2 - t.width / 2,
    y: -t.height - 10,
    width: t.width,
    height: t.height,
    hp: t.hp,
    maxHp: t.hp,
    name: t.name,
    phases: t.phases,
    currentPhase: 0,
    shootTimer: 1,
    patternTimer: 0,
    moveDir: 1,
    score: t.score,
    color: t.color,
    glowColor: t.glowColor,
    active: true,
    entering: true,
    enterY: t.enterY,
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
  for (let i = boss.phases.length - 1; i >= 0; i--) {
    if (hpRatio <= boss.phases[i].hpThreshold) {
      boss.currentPhase = i;
      break;
    }
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

export function bossShoot(boss: BossData, playerX: number, playerY: number): BulletData[] {
  if (boss.entering || boss.shootTimer > 0) return [];

  const phase = boss.phases[boss.currentPhase];
  boss.shootTimer = phase.shootInterval;

  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const bullets: BulletData[] = [];
  const speed = 320;

  switch (phase.pattern) {
    case 'spread': {
      for (let i = -2; i <= 2; i++) {
        const angle = Math.PI / 2 + (i * Math.PI / 10);
        bullets.push(makeBossBullet(cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed, boss.color));
      }
      break;
    }
    case 'aimed': {
      const dx = (playerX + 16) - cx;
      const dy = (playerY + 16) - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      for (let i = -1; i <= 1; i++) {
        const spread = i * 30;
        bullets.push(makeBossBullet(cx + spread, cy, (dx / dist) * speed * 1.3, (dy / dist) * speed * 1.3, '#ff8888'));
      }
      break;
    }
    case 'spiral': {
      const angle = boss.patternTimer * 5;
      // Only fire downward half (toward player), bias vy positive
      const vx1 = Math.cos(angle) * speed * 0.7;
      const vy1 = Math.abs(Math.sin(angle)) * speed * 0.6 + 150;
      bullets.push(makeBossBullet(cx, cy, vx1, vy1, boss.color));
      bullets.push(makeBossBullet(cx, cy, -vx1, vy1, boss.color));
      break;
    }
    case 'radial': {
      // Only lower hemisphere (toward player) - 8 bullets in a fan
      const count = 8;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * i) / (count - 1) + boss.patternTimer * 0.5;
        bullets.push(makeBossBullet(cx, cy, Math.cos(angle) * speed * 0.7, Math.abs(Math.sin(angle)) * speed * 0.7 + 60, boss.glowColor));
      }
      break;
    }
    case 'fury': {
      // Deterministic rotating fan (no random)
      const fanAngle = boss.patternTimer * 4;
      const angle1 = fanAngle % Math.PI;
      bullets.push(makeBossBullet(cx, cy, Math.cos(angle1) * speed * 1.0, Math.abs(Math.sin(angle1)) * speed * 0.8 + 120, '#ffff44'));
      // alternating aimed burst every other shot
      if (Math.floor(boss.patternTimer * 14) % 3 === 0) {
        const dx = (playerX + 16) - cx;
        const dy = (playerY + 16) - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        bullets.push(makeBossBullet(cx, cy, (dx / dist) * speed * 1.4, (dy / dist) * speed * 1.4, '#ff0000'));
      }
      break;
    }
  }

  return bullets;
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
    ctx.globalAlpha = boss.hitFlash * 10;
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
