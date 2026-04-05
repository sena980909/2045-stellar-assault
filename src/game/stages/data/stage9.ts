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
    const vy = Math.sin(angle) * speed * 0.5 + 120;
    bullets.push(mk(cx, cy, vx, vy, '#66ff66'));
  }
  return bullets;
});

const stage9: StageDefinition = {
  name: 'STAGE 9',
  subtitle: 'MACHINE HIVE',
  waves: [
    // === Phase 1: Drone scouts (2~9s) — swarms from the start ===
    { time: 2, enemies: [{ type: 'drone_swarm', count: 10, delay: 0.06 }, { type: 'fighter', count: 2, delay: 0.4 }] },
    { time: 5, enemies: [{ type: 'drone_swarm', count: 12, delay: 0.05 }, { type: 'scout', count: 4, delay: 0.15 }] },
    { time: 8, enemies: [{ type: 'heavy', count: 2, delay: 0.5 }, { type: 'drone_swarm', count: 10, delay: 0.07 }] },
    // === Phase 2: Hive awakens (12~22s) — drones + heavies ===
    { time: 12, enemies: [{ type: 'drone_swarm', count: 14, delay: 0.05 }, { type: 'fighter', count: 3, delay: 0.3 }] },
    { time: 15, enemies: [{ type: 'heavy', count: 3, delay: 0.4 }, { type: 'drone_swarm', count: 12, delay: 0.06 }] },
    { time: 19, enemies: [{ type: 'drone_swarm', count: 15, delay: 0.05 }, { type: 'heavy', count: 2, delay: 0.5 }, { type: 'kamikaze', count: 3, delay: 0.2 }] },
    // === Phase 3: Relentless tide (24~34s) ===
    { time: 24, enemies: [{ type: 'drone_swarm', count: 13, delay: 0.06 }, { type: 'fighter', count: 4, delay: 0.25 }] },
    { time: 27, enemies: [{ type: 'heavy', count: 3, delay: 0.35 }, { type: 'drone_swarm', count: 12, delay: 0.05 }, { type: 'scout', count: 5, delay: 0.12 }] },
    { time: 31, enemies: [{ type: 'drone_swarm', count: 14, delay: 0.06 }, { type: 'kamikaze', count: 5, delay: 0.15 }] },
    { time: 34, enemies: [{ type: 'heavy', count: 2, delay: 0.45 }, { type: 'drone_swarm', count: 10, delay: 0.07 }, { type: 'fighter', count: 3, delay: 0.3 }] },
    // === Phase 4: Hive overload (38~50s) — massive drone waves ===
    { time: 38, enemies: [{ type: 'drone_swarm', count: 15, delay: 0.05 }, { type: 'heavy', count: 3, delay: 0.35 }, { type: 'fighter', count: 4, delay: 0.25 }] },
    { time: 42, enemies: [{ type: 'drone_swarm', count: 14, delay: 0.05 }, { type: 'kamikaze', count: 5, delay: 0.15 }] },
    { time: 46, enemies: [{ type: 'heavy', count: 4, delay: 0.3 }, { type: 'drone_swarm', count: 13, delay: 0.06 }, { type: 'scout', count: 6, delay: 0.1 }] },
    // === Phase 5: Pre-boss swarm flood (50~58s) ===
    { time: 50, enemies: [{ type: 'drone_swarm', count: 15, delay: 0.05 }, { type: 'drone_swarm', count: 12, delay: 0.06 }] },
    { time: 55, enemies: [{ type: 'drone_swarm', count: 14, delay: 0.05 }, { type: 'heavy', count: 2, delay: 0.5 }] },
    // === Boss trigger ===
    { time: 63, enemies: [] },
  ],
  boss: {
    name: 'HIVE QUEEN',
    hp: 5000,
    width: 100,
    height: 72,
    score: 80000,
    color: '#44ff44',
    glowColor: '#22cc22',
    enterY: 40,
    phases: [
      { hpThreshold: 1.0, pattern: 'hive_spawn', shootInterval: 0.45, speed: 100 },
      { hpThreshold: 0.7, pattern: 'radial', shootInterval: 0.35, speed: 130 },
      { hpThreshold: 0.4, pattern: 'aimed', shootInterval: 0.25, speed: 160 },
      { hpThreshold: 0.15, pattern: 'spiral', shootInterval: 0.06, speed: 190 },
    ],
  },
  bgColor1: '#001a00',
  bgColor2: '#0a1a08',
  starSpeed: 1.0,
  difficulty: { enemyHpMultiplier: 1.7, enemySpeedMultiplier: 1.2, bossHpMultiplier: 1.1 },
  itemDrop: { dropChance: 0.18, weights: { power: 2, bomb: 5, speed: 3 } },
  victoryText: ['THE HIVE FALLS SILENT.', 'THE MACHINES RUST AND CRUMBLE.'],
};

export default stage9;
