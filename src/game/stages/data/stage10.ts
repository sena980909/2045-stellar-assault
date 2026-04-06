import { StageDefinition, BossData, BulletData, EnemyData } from '../../types';
import { registerEnemyType, registerEnemyPattern } from '../../entities/Enemy';
import { registerBossPattern } from '../../entities/Boss';

// === Register "elite" enemy type ===
registerEnemyType('elite', {
  name: 'Elite Fighter',
  hp: 6,
  speed: 140,
  width: 30,
  height: 30,
  score: 400,
  color: '#ff2222',
  glowColor: '#cc0000',
  pattern: 'elite_zigzag',
  canShoot: true,
  shootInterval: 0.9,
  bulletCount: 3,
});

// === Register "elite_zigzag" movement pattern ===
// Like zigzag but with wider amplitude and shooting capability
registerEnemyPattern('elite_zigzag', (enemy: EnemyData, _dt: number, _playerX: number, _playerY: number) => {
  enemy.vx = Math.sin(enemy.patternTimer * 2.5) * 160;
  enemy.vy = enemy.type.speed;
});

// === Register "omega_burst" boss pattern ===
// 12 bullets in a full circle (every 30 degrees), rotation offset by patternTimer,
// upward bullets are slowed to bias the pattern downward
registerBossPattern('omega_burst', (boss: BossData, _px: number, _py: number, mk: (x: number, y: number, vx: number, vy: number, color: string) => BulletData) => {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const speed = 250;
  const bullets: BulletData[] = [];
  const baseAngle = boss.patternTimer * 1.5; // slow rotation over time
  for (let i = 0; i < 12; i++) {
    const angle = baseAngle + (Math.PI * 2 * i) / 12;
    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    // Ensure all bullets move downward
    vy = Math.max(30, vy);
    bullets.push(mk(cx, cy, vx, vy, '#ff3333'));
  }
  return bullets;
});

// === Register "omega_rain" boss pattern ===
// Rapid stream of bullets raining down from boss position
// 3 bullets per call, spread across boss width, straight down with slight random spread
registerBossPattern('omega_rain', (boss: BossData, _px: number, _py: number, mk: (x: number, y: number, vx: number, vy: number, color: string) => BulletData) => {
  const cy = boss.y + boss.height;
  const bullets: BulletData[] = [];
  for (let i = 0; i < 3; i++) {
    const x = boss.x + (boss.width * (i + 0.5)) / 3;
    const vx = (Math.random() - 0.5) * 80; // +/- 40
    const vy = 400 + Math.random() * 100;
    bullets.push(mk(x, cy, vx, vy, '#ff0000'));
  }
  return bullets;
});

// =============================================================================
//  STAGE 10 — OMEGA CORE — THE GRAND FINALE
// =============================================================================

const stage10: StageDefinition = {
  name: 'STAGE 10',
  subtitle: 'OMEGA CORE',
  bgColor1: '#1a0000',
  bgColor2: '#200005',
  starSpeed: 2.0,
  difficulty: {
    enemyHpMultiplier: 1.50,
    enemySpeedMultiplier: 1.2,
    bossHpMultiplier: 1.05,
  },
  itemDrop: {
    dropChance: 0.20,
    weights: { power: 1, bomb: 3, speed: 2, hp: 3 },
  },
  victoryText: [
    'THE OMEGA CORE IS DESTROYED.',
    'THE ENEMY FLEET CRUMBLES TO DUST.',
    'PEACE RETURNS TO THE GALAXY. YOU ARE A LEGEND.',
  ],
  waves: [
    // =====================================================================
    //  Phase 1: Warm-up — familiar foes (2~8s)
    // =====================================================================
    { time: 2, enemies: [
      { type: 'fighter', count: 4, delay: 0.35 },
      { type: 'scout', count: 5, delay: 0.15 },
    ]},
    { time: 5, enemies: [
      { type: 'fighter', count: 3, delay: 0.4 },
      { type: 'scout', count: 6, delay: 0.12 },
    ]},
    { time: 8, enemies: [
      { type: 'fighter', count: 5, delay: 0.25 },
      { type: 'kamikaze', count: 3, delay: 0.3 },
    ]},

    // =====================================================================
    //  Phase 2: The elite arrive (10~18s)
    // =====================================================================
    { time: 10, enemies: [
      { type: 'elite', count: 2, delay: 0.6 },
      { type: 'fighter', count: 3, delay: 0.35 },
    ]},
    { time: 13, enemies: [
      { type: 'elite', count: 3, delay: 0.5 },
      { type: 'scout', count: 6, delay: 0.1 },
      { type: 'kamikaze', count: 3, delay: 0.25 },
    ]},
    { time: 16, enemies: [
      { type: 'elite', count: 3, delay: 0.45 },
      { type: 'heavy', count: 2, delay: 0.5 },
    ]},
    { time: 18, enemies: [
      { type: 'kamikaze', count: 5, delay: 0.18 },
      { type: 'elite', count: 2, delay: 0.5 },
    ]},

    // =====================================================================
    //  Phase 3: Escalation — all types mixed (21~33s)
    // =====================================================================
    { time: 21, enemies: [
      { type: 'heavy', count: 3, delay: 0.4 },
      { type: 'elite', count: 3, delay: 0.35 },
      { type: 'scout', count: 5, delay: 0.1 },
    ]},
    { time: 25, enemies: [
      { type: 'fighter', count: 5, delay: 0.2 },
      { type: 'kamikaze', count: 4, delay: 0.2 },
      { type: 'elite', count: 2, delay: 0.5 },
    ]},
    { time: 29, enemies: [
      { type: 'heavy', count: 2, delay: 0.45 },
      { type: 'elite', count: 4, delay: 0.35 },
      { type: 'kamikaze', count: 3, delay: 0.2 },
    ]},
    { time: 33, enemies: [
      { type: 'scout', count: 8, delay: 0.08 },
      { type: 'fighter', count: 4, delay: 0.25 },
    ]},

    // =====================================================================
    //  Phase 4: Brief respite — just scouts (35s)
    // =====================================================================
    { time: 35, enemies: [
      { type: 'scout', count: 4, delay: 0.15 },
    ]},

    // =====================================================================
    //  Phase 5: Hell wave — elite + heavy + kamikaze together (40~48s)
    // =====================================================================
    { time: 40, enemies: [
      { type: 'elite', count: 3, delay: 0.4 },
      { type: 'heavy', count: 2, delay: 0.45 },
      { type: 'kamikaze', count: 4, delay: 0.18 },
    ]},
    { time: 44, enemies: [
      { type: 'elite', count: 3, delay: 0.3 },
      { type: 'heavy', count: 2, delay: 0.5 },
      { type: 'fighter', count: 5, delay: 0.2 },
      { type: 'kamikaze', count: 4, delay: 0.18 },
    ]},
    { time: 48, enemies: [
      { type: 'elite', count: 4, delay: 0.25 },
      { type: 'kamikaze', count: 5, delay: 0.12 },
      { type: 'heavy', count: 2, delay: 0.45 },
    ]},

    // =====================================================================
    //  Phase 6: Pre-boss mega rush — waves of everything (55~65s)
    // =====================================================================
    { time: 55, enemies: [
      { type: 'elite', count: 4, delay: 0.25 },
      { type: 'fighter', count: 5, delay: 0.2 },
      { type: 'kamikaze', count: 4, delay: 0.15 },
    ]},
    { time: 59, enemies: [
      { type: 'heavy', count: 3, delay: 0.35 },
      { type: 'elite', count: 4, delay: 0.25 },
      { type: 'scout', count: 8, delay: 0.08 },
    ]},
    { time: 63, enemies: [
      { type: 'kamikaze', count: 8, delay: 0.1 },
      { type: 'elite', count: 3, delay: 0.3 },
      { type: 'fighter', count: 4, delay: 0.2 },
    ]},

    // =====================================================================
    //  Boss trigger
    // =====================================================================
    { time: 70, enemies: [] },
  ],
  boss: {
    name: 'OMEGA PRIME',
    hp: 1875,
    width: 110,
    height: 80,
    score: 100000,
    color: '#ff0000',
    glowColor: '#cc0000',
    enterY: 40,
    phases: [
      { hpThreshold: 1.0,  pattern: 'omega_burst', shootInterval: 0.5,  speed: 80  },
      { hpThreshold: 0.75, pattern: 'spread',      shootInterval: 0.6,  speed: 100 },
      { hpThreshold: 0.5,  pattern: 'omega_rain',  shootInterval: 0.25, speed: 120 },
      { hpThreshold: 0.25, pattern: 'aimed',        shootInterval: 0.25, speed: 150 },
      { hpThreshold: 0.1,  pattern: 'fury',         shootInterval: 0.15, speed: 170 },
    ],
  },
};

export default stage10;
