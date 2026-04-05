import { StageDefinition } from '../../types';
import { registerEnemyType, registerEnemyPattern } from '../../entities/Enemy';
import { registerBossPattern } from '../../entities/Boss';

// === Register "orbiter" enemy type ===
registerEnemyType('orbiter', {
  name: 'Orbiter',
  hp: 3,
  speed: 150,
  width: 20,
  height: 20,
  score: 200,
  color: '#aa44ff',
  glowColor: '#8800ff',
  pattern: 'orbit',
  canShoot: true,
  shootInterval: 2.0,
  bulletCount: 1,
});

// === Register "orbit" enemy movement pattern ===
// Circles around spawn area with slight downward drift
registerEnemyPattern('orbit', (enemy) => {
  enemy.vx = Math.cos(enemy.patternTimer * 2) * 80;
  enemy.vy = Math.sin(enemy.patternTimer * 2) * 80 + 30;
});

// === Register "gravity" boss pattern ===
// Bullets spawn in a ring and accelerate toward the player's position
registerBossPattern('gravity', (boss, px, py, mk) => {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const bullets = [];
  const ringCount = 6;
  const ringRadius = 40;
  const speed = 200;

  for (let i = 0; i < ringCount; i++) {
    const angle = (Math.PI * 2 * i) / ringCount + boss.patternTimer * 0.8;
    const spawnX = cx + Math.cos(angle) * ringRadius;
    const spawnY = cy + Math.sin(angle) * ringRadius;

    // Aim toward player
    const dx = (px + 16) - spawnX;
    const dy = (py + 16) - spawnY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    bullets.push(mk(spawnX, spawnY, (dx / dist) * speed, (dy / dist) * speed, '#bb66ff'));
  }

  return bullets;
});

const stage7: StageDefinition = {
  name: 'STAGE 7',
  subtitle: 'GRAVITY WELL',
  bgColor1: '#0a0018',
  bgColor2: '#120020',
  starSpeed: 0.8,
  difficulty: {
    enemyHpMultiplier: 1.35,
    enemySpeedMultiplier: 1.15,
    bossHpMultiplier: 1.1,
  },
  itemDrop: {
    dropChance: 0.15,
    weights: { power: 4, bomb: 3, speed: 3 },
  },
  victoryText: [
    'THE SINGULARITY COLLAPSES.',
    'SPACETIME RESTORES ITSELF... BARELY.',
  ],
  waves: [
    // === Phase 1: Gravitational pull begins (2~10s) - moderate start ===
    { time: 2, enemies: [
      { type: 'orbiter', count: 3, delay: 0.4 },
      { type: 'fighter', count: 2, delay: 0.45 },
    ]},
    { time: 5, enemies: [
      { type: 'orbiter', count: 4, delay: 0.3 },
      { type: 'scout', count: 4, delay: 0.15 },
    ]},
    { time: 9, enemies: [
      { type: 'kamikaze', count: 4, delay: 0.25 },
      { type: 'orbiter', count: 3, delay: 0.35 },
    ]},

    // === Phase 2: Increasing distortion (13~23s) ===
    { time: 13, enemies: [
      { type: 'orbiter', count: 5, delay: 0.25 },
      { type: 'fighter', count: 3, delay: 0.35 },
    ]},
    { time: 17, enemies: [
      { type: 'kamikaze', count: 5, delay: 0.2 },
      { type: 'orbiter', count: 4, delay: 0.25 },
    ]},
    { time: 20, enemies: [
      { type: 'fighter', count: 4, delay: 0.3 },
      { type: 'orbiter', count: 3, delay: 0.3 },
      { type: 'kamikaze', count: 3, delay: 0.2 },
    ]},

    // === Phase 3: Brief calm in the eye of the well (26~28s) then surge ===
    { time: 26, enemies: [
      { type: 'scout', count: 6, delay: 0.1 },
    ]},
    { time: 29, enemies: [
      { type: 'orbiter', count: 6, delay: 0.18 },
      { type: 'fighter', count: 4, delay: 0.25 },
      { type: 'kamikaze', count: 3, delay: 0.2 },
    ]},
    { time: 33, enemies: [
      { type: 'orbiter', count: 5, delay: 0.2 },
      { type: 'heavy', count: 2, delay: 0.45 },
      { type: 'kamikaze', count: 4, delay: 0.18 },
    ]},

    // === Phase 4: Event horizon - swarm density (37~48s) ===
    { time: 37, enemies: [
      { type: 'orbiter', count: 6, delay: 0.15 },
      { type: 'kamikaze', count: 5, delay: 0.15 },
      { type: 'fighter', count: 4, delay: 0.25 },
    ]},
    { time: 42, enemies: [
      { type: 'orbiter', count: 5, delay: 0.15 },
      { type: 'fighter', count: 5, delay: 0.2 },
      { type: 'heavy', count: 2, delay: 0.4 },
    ]},
    { time: 46, enemies: [
      { type: 'kamikaze', count: 6, delay: 0.12 },
      { type: 'orbiter', count: 4, delay: 0.2 },
    ]},

    // === Phase 5: Pre-boss spaghettification (50~57s) ===
    { time: 50, enemies: [
      { type: 'orbiter', count: 5, delay: 0.12 },
      { type: 'kamikaze', count: 5, delay: 0.12 },
    ]},
    { time: 54, enemies: [
      { type: 'orbiter', count: 4, delay: 0.15 },
      { type: 'fighter', count: 3, delay: 0.2 },
    ]},

    // Boss trigger
    { time: 60, enemies: [] },
  ],
  boss: {
    name: 'SINGULARITY',
    hp: 1600,
    width: 104,
    height: 72,
    score: 40000,
    color: '#9933ff',
    glowColor: '#6600cc',
    enterY: 45,
    phases: [
      { hpThreshold: 1.0, pattern: 'gravity', shootInterval: 1.0, speed: 70 },
      { hpThreshold: 0.65, pattern: 'spiral', shootInterval: 0.65, speed: 100 },
      { hpThreshold: 0.35, pattern: 'radial', shootInterval: 0.5, speed: 130 },
      { hpThreshold: 0.15, pattern: 'aimed', shootInterval: 0.22, speed: 160 },
    ],
  },
};

export default stage7;
