import { StageDefinition } from '../../types';
import { registerEnemyType } from '../../entities/Enemy';
import { registerBossPattern } from '../../entities/Boss';

// === Register "drone_swarm" enemy type — tiny, fast, swarming ===
registerEnemyType('drone_swarm', {
  name: 'Drone',
  hp: 1,
  speed: 280,
  width: 14,
  height: 14,
  score: 80,
  color: '#44ff44',
  glowColor: '#22cc22',
  pattern: 'chase',
  canShoot: false,
  shootInterval: 0,
  bulletCount: 0,
});

// === Register "hive_spawn" boss pattern: hexagonal spiral of 6 bullets ===
registerBossPattern('hive_spawn', (boss, _px, _py, mk) => {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const speed = 240;
  const bullets = [];
  const rotation = boss.patternTimer * 2.5;
  // 6 bullets in hexagonal pattern (60 degree intervals), spiraling outward
  for (let i = 0; i < 6; i++) {
    const angle = rotation + (Math.PI * 2 * i) / 6;
    const vx = Math.cos(angle) * speed * 0.7;
    const vy = Math.max(60, Math.sin(angle) * speed * 0.5 + 120);
    bullets.push(mk(cx, cy, vx, vy, '#66ff66'));
  }
  return bullets;
});

const stage9: StageDefinition = {
  name: 'STAGE 9',
  subtitle: 'MACHINE HIVE',
  waves: [
    // === Phase 1: Drone scouts (2~9s) ===
    { time: 2, enemies: [{ type: 'drone_swarm', count: 5, delay: 0.12 }, { type: 'fighter', count: 2, delay: 0.4 }] },
    { time: 5, enemies: [{ type: 'drone_swarm', count: 6, delay: 0.1 }, { type: 'scout', count: 4, delay: 0.15 }] },
    { time: 8, enemies: [{ type: 'heavy', count: 2, delay: 0.5 }, { type: 'drone_swarm', count: 5, delay: 0.12 }] },
    // === Phase 2: Hive awakens (12~22s) ===
    { time: 12, enemies: [{ type: 'drone_swarm', count: 6, delay: 0.1 }, { type: 'fighter', count: 3, delay: 0.3 }] },
    { time: 15, enemies: [{ type: 'heavy', count: 2, delay: 0.4 }, { type: 'drone_swarm', count: 6, delay: 0.1 }] },
    { time: 19, enemies: [{ type: 'drone_swarm', count: 7, delay: 0.1 }, { type: 'heavy', count: 2, delay: 0.5 }, { type: 'kamikaze', count: 3, delay: 0.2 }] },
    // === Phase 3: Relentless tide (24~34s) ===
    { time: 24, enemies: [{ type: 'drone_swarm', count: 7, delay: 0.1 }, { type: 'fighter', count: 3, delay: 0.25 }] },
    { time: 27, enemies: [{ type: 'heavy', count: 2, delay: 0.4 }, { type: 'drone_swarm', count: 6, delay: 0.1 }, { type: 'scout', count: 4, delay: 0.12 }] },
    { time: 31, enemies: [{ type: 'drone_swarm', count: 7, delay: 0.1 }, { type: 'kamikaze', count: 3, delay: 0.2 }] },
    { time: 34, enemies: [{ type: 'heavy', count: 2, delay: 0.45 }, { type: 'drone_swarm', count: 6, delay: 0.12 }, { type: 'fighter', count: 3, delay: 0.3 }] },
    // === Phase 4: Hive overload (38~50s) ===
    { time: 38, enemies: [{ type: 'drone_swarm', count: 7, delay: 0.1 }, { type: 'heavy', count: 2, delay: 0.4 }, { type: 'fighter', count: 3, delay: 0.25 }] },
    { time: 42, enemies: [{ type: 'drone_swarm', count: 7, delay: 0.1 }, { type: 'kamikaze', count: 4, delay: 0.18 }] },
    { time: 46, enemies: [{ type: 'heavy', count: 2, delay: 0.4 }, { type: 'drone_swarm', count: 6, delay: 0.1 }, { type: 'scout', count: 4, delay: 0.12 }] },
    // === Phase 5: Pre-boss swarm flood (50~58s) ===
    { time: 50, enemies: [{ type: 'drone_swarm', count: 8, delay: 0.1 }, { type: 'fighter', count: 3, delay: 0.25 }] },
    { time: 55, enemies: [{ type: 'drone_swarm', count: 7, delay: 0.1 }, { type: 'heavy', count: 2, delay: 0.5 }] },
    // === Boss trigger ===
    { time: 63, enemies: [] },
  ],
  boss: {
    name: 'HIVE QUEEN',
    hp: 1350,
    width: 100,
    height: 72,
    score: 80000,
    color: '#44ff44',
    glowColor: '#22cc22',
    enterY: 40,
    phases: [
      { hpThreshold: 1.0, pattern: 'hive_spawn', shootInterval: 0.45, speed: 100 },
      { hpThreshold: 0.7, pattern: 'radial', shootInterval: 0.5, speed: 130 },
      { hpThreshold: 0.4, pattern: 'aimed', shootInterval: 0.25, speed: 160 },
      { hpThreshold: 0.15, pattern: 'spiral', shootInterval: 0.15, speed: 190 },
    ],
  },
  bgColor1: '#001a00',
  bgColor2: '#0a1a08',
  starSpeed: 1.0,
  difficulty: { enemyHpMultiplier: 1.40, enemySpeedMultiplier: 1.1, bossHpMultiplier: 1.0 },
  itemDrop: { dropChance: 0.18, weights: { power: 2, bomb: 1, speed: 2, hp: 3 } },
  victoryText: ['THE HIVE FALLS SILENT.', 'THE MACHINES RUST AND CRUMBLE.'],
};

export default stage9;
