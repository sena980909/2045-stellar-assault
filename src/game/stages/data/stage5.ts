import { StageDefinition } from '../../types';
import { registerEnemyType } from '../../entities/Enemy';
import { registerBossPattern } from '../../entities/Boss';

// === Register "bomber" enemy type ===
registerEnemyType('bomber', {
  name: 'Bomber',
  hp: 6,
  speed: 100,
  width: 34,
  height: 34,
  score: 450,
  color: '#4488ff',
  glowColor: '#2266cc',
  pattern: 'slow',
  canShoot: true,
  shootInterval: 1.4,
  bulletCount: 5,
});

// === Register "freeze" boss pattern: ring that expands slowly then accelerates ===
registerBossPattern('freeze', (boss, _px, _py, mk) => {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const count = 12;
  const bullets = [];
  const baseAngle = boss.patternTimer * 0.8;
  for (let i = 0; i < count; i++) {
    const angle = baseAngle + (Math.PI * 2 * i) / count;
    const speed = 120;
    const vx = Math.cos(angle) * speed;
    const vy = Math.max(80, Math.sin(angle) * speed * 0.6 + 140);
    bullets.push(mk(cx, cy, vx, vy, '#88ccff'));
  }
  return bullets;
});

const stage5: StageDefinition = {
  name: 'STAGE 5',
  subtitle: 'FROZEN FRONTIER',
  waves: [
    // === Phase 1: Opening salvo (2~10s) ===
    { time: 2, enemies: [{ type: 'scout', count: 6, delay: 0.15 }, { type: 'fighter', count: 3, delay: 0.35 }] },
    { time: 6, enemies: [{ type: 'bomber', count: 2, delay: 0.7 }, { type: 'kamikaze', count: 3, delay: 0.25 }] },
    { time: 10, enemies: [{ type: 'fighter', count: 4, delay: 0.3 }, { type: 'bomber', count: 2, delay: 0.6 }] },
    // === Phase 2: Bomber-kamikaze combos (14~24s) ===
    { time: 14, enemies: [{ type: 'bomber', count: 3, delay: 0.5 }, { type: 'kamikaze', count: 4, delay: 0.2 }] },
    { time: 18, enemies: [{ type: 'heavy', count: 2, delay: 0.5 }, { type: 'scout', count: 6, delay: 0.1 }, { type: 'kamikaze', count: 3, delay: 0.2 }] },
    { time: 22, enemies: [{ type: 'bomber', count: 3, delay: 0.45 }, { type: 'fighter', count: 4, delay: 0.25 }] },
    // === Phase 3: Brief breathing room then escalation (27~38s) ===
    { time: 27, enemies: [{ type: 'kamikaze', count: 5, delay: 0.15 }, { type: 'sniper', count: 2, delay: 0.7 }] },
    { time: 31, enemies: [{ type: 'bomber', count: 3, delay: 0.4 }, { type: 'heavy', count: 2, delay: 0.5 }, { type: 'kamikaze', count: 4, delay: 0.18 }] },
    { time: 35, enemies: [{ type: 'fighter', count: 5, delay: 0.2 }, { type: 'bomber', count: 2, delay: 0.5 }, { type: 'scout', count: 5, delay: 0.12 }] },
    // === Phase 4: Full assault (39~48s) ===
    { time: 39, enemies: [{ type: 'heavy', count: 3, delay: 0.35 }, { type: 'bomber', count: 3, delay: 0.4 }, { type: 'kamikaze', count: 5, delay: 0.15 }] },
    { time: 43, enemies: [{ type: 'bomber', count: 4, delay: 0.35 }, { type: 'fighter', count: 4, delay: 0.25 }, { type: 'scout', count: 4, delay: 0.1 }] },
    // === Phase 5: Pre-boss kamikaze + bomber rush (47~51s) ===
    { time: 47, enemies: [{ type: 'kamikaze', count: 6, delay: 0.12 }, { type: 'bomber', count: 2, delay: 0.5 }] },
    { time: 51, enemies: [{ type: 'kamikaze', count: 5, delay: 0.1 }, { type: 'scout', count: 4, delay: 0.1 }] },
    // === Boss trigger ===
    { time: 56, enemies: [] },
  ],
  boss: {
    name: 'CRYO SENTINEL',
    hp: 1050,
    width: 104,
    height: 72,
    score: 40000,
    color: '#44aaff',
    glowColor: '#2288ee',
    enterY: 42,
    phases: [
      { hpThreshold: 1.0, pattern: 'spread', shootInterval: 0.45, speed: 110 },
      { hpThreshold: 0.55, pattern: 'freeze', shootInterval: 0.6, speed: 140 },
      { hpThreshold: 0.2, pattern: 'fury', shootInterval: 0.15, speed: 190 },
    ],
  },
  bgColor1: '#000a1a',
  bgColor2: '#001a2a',
  starSpeed: 1.4,
  difficulty: { enemyHpMultiplier: 1.15, enemySpeedMultiplier: 1.1 },
  itemDrop: { dropChance: 0.13, weights: { power: 4, bomb: 3, speed: 2, hp: 2 } },
  victoryText: ['THE ICE SHATTERS. THE FRONTIER IS CLEAR.', 'WARMTH RETURNS TO THE VOID.'],
};

export default stage5;
