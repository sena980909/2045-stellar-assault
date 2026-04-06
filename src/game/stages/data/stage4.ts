import { StageDefinition } from '../../types';
import { registerEnemyType, registerEnemyPattern } from '../../entities/Enemy';
import { registerBossPattern } from '../../entities/Boss';

// === Register "hover" movement pattern: descend to y=80 then stop ===
registerEnemyPattern('hover', (enemy) => {
  if (enemy.y < 80) {
    enemy.vy = enemy.type.speed;
    enemy.vx = 0;
  } else {
    enemy.vy = 0;
    enemy.vx = Math.sin(enemy.patternTimer * 2) * 30;
  }
});

// === Register "sniper" enemy type ===
registerEnemyType('sniper', {
  name: 'Sniper',
  hp: 5,
  speed: 60,
  width: 24,
  height: 24,
  score: 400,
  color: '#aa44ff',
  glowColor: '#8800cc',
  pattern: 'hover',
  canShoot: true,
  shootInterval: 1.6,
  bulletCount: 1,
});

// === Register "wave" boss pattern: sinusoidal wave of bullets ===
registerBossPattern('wave', (boss, _px, _py, mk) => {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const speed = 280;
  const bullets = [];
  const offset = boss.patternTimer * 3;
  for (let i = -3; i <= 3; i++) {
    const angle = Math.PI / 2 + Math.sin(offset + i * 0.8) * 0.4;
    bullets.push(mk(cx + i * 18, cy, Math.cos(angle) * speed, Math.sin(angle) * speed, '#bb66ff'));
  }
  return bullets;
});

const stage4: StageDefinition = {
  name: 'STAGE 4',
  subtitle: 'DARK NEBULA',
  waves: [
    // === Phase 1: Easing in (2~10s) ===
    { time: 2, enemies: [{ type: 'scout', count: 5, delay: 0.2 }, { type: 'fighter', count: 2, delay: 0.4 }] },
    { time: 6, enemies: [{ type: 'fighter', count: 3, delay: 0.35 }, { type: 'kamikaze', count: 3, delay: 0.25 }] },
    { time: 10, enemies: [{ type: 'sniper', count: 2, delay: 0.8 }, { type: 'scout', count: 4, delay: 0.15 }] },
    // === Phase 2: Sniper introduction ramps up (14~22s) ===
    { time: 14, enemies: [{ type: 'heavy', count: 2, delay: 0.5 }, { type: 'sniper', count: 2, delay: 0.7 }] },
    { time: 18, enemies: [{ type: 'fighter', count: 4, delay: 0.3 }, { type: 'kamikaze', count: 4, delay: 0.2 }] },
    { time: 22, enemies: [{ type: 'sniper', count: 3, delay: 0.6 }, { type: 'scout', count: 6, delay: 0.12 }] },
    // === Phase 3: Brief rest then tension (27~36s) ===
    { time: 27, enemies: [{ type: 'heavy', count: 2, delay: 0.45 }, { type: 'fighter', count: 3, delay: 0.3 }] },
    { time: 31, enemies: [{ type: 'kamikaze', count: 5, delay: 0.18 }, { type: 'sniper', count: 2, delay: 0.7 }] },
    { time: 35, enemies: [{ type: 'heavy', count: 3, delay: 0.4 }, { type: 'scout', count: 5, delay: 0.1 }, { type: 'fighter', count: 3, delay: 0.25 }] },
    // === Phase 4: Pre-boss rush (40~50s) ===
    { time: 40, enemies: [{ type: 'sniper', count: 3, delay: 0.5 }, { type: 'kamikaze', count: 5, delay: 0.15 }, { type: 'fighter', count: 4, delay: 0.25 }] },
    { time: 45, enemies: [{ type: 'heavy', count: 2, delay: 0.4 }, { type: 'kamikaze', count: 4, delay: 0.12 }, { type: 'scout', count: 6, delay: 0.1 }] },
    { time: 50, enemies: [{ type: 'kamikaze', count: 4, delay: 0.1 }, { type: 'sniper', count: 2, delay: 0.6 }] },
    // === Boss trigger ===
    { time: 55, enemies: [] },
  ],
  boss: {
    name: 'VOID WALKER',
    hp: 900,
    width: 100,
    height: 68,
    score: 30000,
    color: '#9944ff',
    glowColor: '#6600cc',
    enterY: 45,
    phases: [
      { hpThreshold: 1.0, pattern: 'wave', shootInterval: 0.5, speed: 100 },
      { hpThreshold: 0.6, pattern: 'aimed', shootInterval: 0.35, speed: 130 },
      { hpThreshold: 0.25, pattern: 'spiral', shootInterval: 0.18, speed: 170 },
    ],
  },
  bgColor1: '#0a0020',
  bgColor2: '#150030',
  starSpeed: 1.2,
  difficulty: { enemyHpMultiplier: 1.2 },
  itemDrop: { dropChance: 0.16, weights: { power: 1, bomb: 3, speed: 2, hp: 2 } },
  victoryText: ['THE VOID WALKER FADES INTO DARKNESS.', 'THE NEBULA GROWS SILENT...'],
};

export default stage4;
