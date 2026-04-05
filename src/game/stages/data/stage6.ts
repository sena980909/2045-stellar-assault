import { StageDefinition } from '../../types';
import { registerEnemyType } from '../../entities/Enemy';
import { registerBossPattern } from '../../entities/Boss';

// === Register "phoenix" enemy type ===
registerEnemyType('phoenix', {
  name: 'Phoenix',
  hp: 4,
  speed: 220,
  width: 24,
  height: 24,
  score: 300,
  color: '#ff6600',
  glowColor: '#ff4400',
  pattern: 'zigzag',
  canShoot: true,
  shootInterval: 1.5,
  bulletCount: 1,
});

// === Register "solar_flare" boss pattern ===
// 3 rotating streams of bullets, all firing downward (vy > 0)
registerBossPattern('solar_flare', (boss, _px, _py, mk) => {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const speed = 280;
  const bullets = [];
  const baseAngle = boss.patternTimer * 1.2; // slow rotation

  for (let stream = 0; stream < 3; stream++) {
    const angle = baseAngle + (stream * Math.PI * 2) / 3;
    const vx = Math.cos(angle) * speed * 0.5;
    const rawVy = Math.sin(angle) * speed * 0.5;
    // Ensure bullets always move downward
    const vy = Math.abs(rawVy) + 120;
    bullets.push(mk(cx, cy, vx, vy, '#ff8800'));
  }

  return bullets;
});

const stage6: StageDefinition = {
  name: 'STAGE 6',
  subtitle: 'SOLAR STORM',
  bgColor1: '#1a0800',
  bgColor2: '#1a1000',
  starSpeed: 1.5,
  difficulty: {
    enemyHpMultiplier: 1.4,
    enemySpeedMultiplier: 1.1,
  },
  itemDrop: {
    dropChance: 0.14,
    weights: { power: 3, bomb: 4, speed: 2 },
  },
  victoryText: [
    'THE SOLAR STORM SUBSIDES.',
    'THE STAR BURNS ON, INDIFFERENT.',
  ],
  waves: [
    // === Phase 1: Opening heat (2~10s) - moderate introduction ===
    { time: 2, enemies: [
      { type: 'phoenix', count: 3, delay: 0.4 },
      { type: 'fighter', count: 2, delay: 0.5 },
    ]},
    { time: 5, enemies: [
      { type: 'phoenix', count: 4, delay: 0.3 },
      { type: 'scout', count: 4, delay: 0.15 },
    ]},
    { time: 9, enemies: [
      { type: 'fighter', count: 3, delay: 0.35 },
      { type: 'phoenix', count: 3, delay: 0.35 },
    ]},

    // === Phase 2: Building intensity (13~22s) ===
    { time: 13, enemies: [
      { type: 'heavy', count: 2, delay: 0.5 },
      { type: 'phoenix', count: 4, delay: 0.25 },
    ]},
    { time: 17, enemies: [
      { type: 'phoenix', count: 5, delay: 0.2 },
      { type: 'fighter', count: 4, delay: 0.3 },
    ]},
    { time: 20, enemies: [
      { type: 'heavy', count: 3, delay: 0.4 },
      { type: 'phoenix', count: 3, delay: 0.3 },
      { type: 'scout', count: 6, delay: 0.1 },
    ]},

    // === Phase 3: Brief respite then surge (25~35s) ===
    { time: 25, enemies: [
      { type: 'scout', count: 5, delay: 0.12 },
    ]},
    { time: 28, enemies: [
      { type: 'phoenix', count: 6, delay: 0.18 },
      { type: 'fighter', count: 5, delay: 0.25 },
    ]},
    { time: 32, enemies: [
      { type: 'heavy', count: 3, delay: 0.35 },
      { type: 'phoenix', count: 4, delay: 0.2 },
      { type: 'kamikaze', count: 4, delay: 0.2 },
    ]},

    // === Phase 4: Heat wave - maximum pressure (37~47s) ===
    { time: 37, enemies: [
      { type: 'phoenix', count: 6, delay: 0.15 },
      { type: 'heavy', count: 2, delay: 0.4 },
      { type: 'fighter', count: 5, delay: 0.2 },
    ]},
    { time: 42, enemies: [
      { type: 'phoenix', count: 5, delay: 0.15 },
      { type: 'kamikaze', count: 5, delay: 0.15 },
      { type: 'heavy', count: 2, delay: 0.5 },
    ]},

    // === Phase 5: Pre-boss rush (48~55s) ===
    { time: 48, enemies: [
      { type: 'phoenix', count: 6, delay: 0.12 },
      { type: 'kamikaze', count: 4, delay: 0.15 },
    ]},
    { time: 52, enemies: [
      { type: 'phoenix', count: 4, delay: 0.12 },
      { type: 'fighter', count: 3, delay: 0.2 },
    ]},

    // Boss trigger
    { time: 58, enemies: [] },
  ],
  boss: {
    name: 'HELIOS PRIME',
    hp: 1500,
    width: 100,
    height: 68,
    score: 35000,
    color: '#ff8800',
    glowColor: '#ffaa00',
    enterY: 45,
    phases: [
      { hpThreshold: 1.0, pattern: 'solar_flare', shootInterval: 1.0, speed: 80 },
      { hpThreshold: 0.6, pattern: 'spread', shootInterval: 0.6, speed: 100 },
      { hpThreshold: 0.3, pattern: 'aimed', shootInterval: 0.3, speed: 140 },
      { hpThreshold: 0.1, pattern: 'fury', shootInterval: 0.1, speed: 170 },
    ],
  },
};

export default stage6;
