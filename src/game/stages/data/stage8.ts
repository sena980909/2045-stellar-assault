import { StageDefinition } from '../../types';
import { registerEnemyType, registerEnemyPattern } from '../../entities/Enemy';
import { registerBossPattern } from '../../entities/Boss';

// === Register "warp" movement pattern: straight down but teleports every 2 seconds ===
registerEnemyPattern('warp', (enemy) => {
  enemy.vy = enemy.type.speed;
  enemy.vx = 0;
  // Every 2 seconds, teleport to a random x position
  if (enemy.patternTimer % 2 < 0.05) {
    enemy.x = Math.random() * (400 - enemy.width);
  }
});

// === Register "warper" enemy type ===
registerEnemyType('warper', {
  name: 'Warper',
  hp: 2,
  speed: 180,
  width: 20,
  height: 20,
  score: 250,
  color: '#00ffcc',
  glowColor: '#00aa88',
  pattern: 'warp',
  canShoot: false,
  shootInterval: 0,
  bulletCount: 0,
});

// === Register "barrage" boss pattern: rapid aimed shots with random spread ===
registerBossPattern('barrage', (boss, px, py, mk) => {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const speed = 380;
  const bullets = [];
  // Fire 2 bullets aimed at player with ±30px random spread
  for (let i = 0; i < 2; i++) {
    const targetX = px + 16 + (Math.random() * 60 - 30);
    const targetY = py + 16 + (Math.random() * 60 - 30);
    const dx = targetX - cx;
    const dy = targetY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    bullets.push(mk(cx, cy, (dx / dist) * speed, (dy / dist) * speed, '#00ffee'));
  }
  return bullets;
});

const stage8: StageDefinition = {
  name: 'STAGE 8',
  subtitle: 'WARP CORRIDOR',
  waves: [
    // === Phase 1: Hyperspace entry (2~10s) — warpers appear immediately ===
    { time: 2, enemies: [{ type: 'warper', count: 4, delay: 0.3 }, { type: 'scout', count: 5, delay: 0.15 }] },
    { time: 5, enemies: [{ type: 'fighter', count: 3, delay: 0.35 }, { type: 'warper', count: 3, delay: 0.25 }] },
    { time: 9, enemies: [{ type: 'warper', count: 5, delay: 0.2 }, { type: 'kamikaze', count: 4, delay: 0.2 }] },
    // === Phase 2: Warper swarms with support (13~22s) ===
    { time: 13, enemies: [{ type: 'warper', count: 6, delay: 0.18 }, { type: 'fighter', count: 3, delay: 0.3 }] },
    { time: 17, enemies: [{ type: 'heavy', count: 2, delay: 0.5 }, { type: 'warper', count: 4, delay: 0.22 }, { type: 'scout', count: 5, delay: 0.12 }] },
    { time: 21, enemies: [{ type: 'warper', count: 5, delay: 0.2 }, { type: 'fighter', count: 4, delay: 0.25 }] },
    // === Phase 3: Escalating chaos (25~34s) ===
    { time: 25, enemies: [{ type: 'kamikaze', count: 5, delay: 0.15 }, { type: 'warper', count: 4, delay: 0.25 }] },
    { time: 29, enemies: [{ type: 'heavy', count: 3, delay: 0.4 }, { type: 'warper', count: 5, delay: 0.18 }, { type: 'scout', count: 6, delay: 0.1 }] },
    { time: 33, enemies: [{ type: 'fighter', count: 5, delay: 0.2 }, { type: 'warper', count: 4, delay: 0.22 }] },
    // === Phase 4: Corridor destabilizing (37~46s) ===
    { time: 37, enemies: [{ type: 'warper', count: 7, delay: 0.15 }, { type: 'kamikaze', count: 4, delay: 0.18 }, { type: 'fighter', count: 3, delay: 0.3 }] },
    { time: 41, enemies: [{ type: 'heavy', count: 2, delay: 0.45 }, { type: 'warper', count: 5, delay: 0.2 }, { type: 'scout', count: 8, delay: 0.08 }] },
    { time: 45, enemies: [{ type: 'warper', count: 6, delay: 0.15 }, { type: 'fighter', count: 4, delay: 0.22 }] },
    // === Phase 5: Pre-boss warp storm (49~56s) ===
    { time: 49, enemies: [{ type: 'warper', count: 8, delay: 0.12 }, { type: 'kamikaze', count: 5, delay: 0.15 }] },
    { time: 53, enemies: [{ type: 'warper', count: 6, delay: 0.14 }, { type: 'scout', count: 5, delay: 0.1 }] },
    // === Boss trigger ===
    { time: 60, enemies: [] },
  ],
  boss: {
    name: 'WARP KING',
    hp: 1800,
    width: 96,
    height: 68,
    score: 70000,
    color: '#00ffff',
    glowColor: '#ffffff',
    enterY: 45,
    phases: [
      { hpThreshold: 1.0, pattern: 'spread', shootInterval: 0.5, speed: 110 },
      { hpThreshold: 0.7, pattern: 'barrage', shootInterval: 0.12, speed: 140 },
      { hpThreshold: 0.4, pattern: 'spiral', shootInterval: 0.08, speed: 170 },
      { hpThreshold: 0.15, pattern: 'fury', shootInterval: 0.06, speed: 200 },
    ],
  },
  bgColor1: '#001a1a',
  bgColor2: '#002020',
  starSpeed: 2.5,
  difficulty: { enemyHpMultiplier: 1.6, enemySpeedMultiplier: 1.2 },
  itemDrop: { dropChance: 0.16, weights: { power: 4, bomb: 3, speed: 3 } },
  victoryText: ['THE WARP CORRIDOR STABILIZES.', 'NORMAL SPACE BECKONS AHEAD.'],
};

export default stage8;
