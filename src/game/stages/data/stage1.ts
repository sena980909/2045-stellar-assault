import { StageDefinition } from '../../types';

const stage1: StageDefinition = {
  name: 'STAGE 1',
  subtitle: 'ORBITAL PERIMETER',
  waves: [
    // === Phase 1: Quick intro + early fighter (0~7s) ===
    { time: 2, enemies: [{ type: 'scout', count: 3, delay: 0.35 }] },
    { time: 4, enemies: [{ type: 'scout', count: 3, delay: 0.3 }, { type: 'fighter', count: 1, delay: 0 }] },
    // === Phase 2: Fighter mix intensifies (7~20s) ===
    { time: 7, enemies: [{ type: 'fighter', count: 2, delay: 0.5 }, { type: 'scout', count: 4, delay: 0.25 }] },
    { time: 11, enemies: [{ type: 'fighter', count: 3, delay: 0.45 }, { type: 'scout', count: 5, delay: 0.2 }] },
    { time: 15, enemies: [{ type: 'scout', count: 5, delay: 0.18 }, { type: 'fighter', count: 4, delay: 0.4 }] },
    // -- short rest (20~22s) --
    { time: 22, enemies: [{ type: 'scout', count: 3, delay: 0.25 }] },
    // === Phase 3: density increase, fighter-heavy (24~35s) ===
    { time: 24, enemies: [{ type: 'fighter', count: 4, delay: 0.35 }, { type: 'scout', count: 4, delay: 0.2 }] },
    { time: 28, enemies: [{ type: 'fighter', count: 5, delay: 0.3 }, { type: 'scout', count: 3, delay: 0.2 }] },
    { time: 32, enemies: [{ type: 'scout', count: 8, delay: 0.1 }, { type: 'fighter', count: 4, delay: 0.35 }] },
    // === Phase 4: Pre-boss rush (36~42s) ===
    { time: 36, enemies: [{ type: 'scout', count: 10, delay: 0.08 }, { type: 'fighter', count: 5, delay: 0.25 }] },
    { time: 44, enemies: [] }, // boss trigger
  ],
  boss: {
    name: 'SENTINEL MK-I',
    hp: 800,
    width: 64,
    height: 48,
    score: 5000,
    color: '#ff4444',
    glowColor: '#ff0000',
    enterY: 60,
    phases: [
      { hpThreshold: 1.0, pattern: 'spread', shootInterval: 0.8, speed: 110 },
      { hpThreshold: 0.5, pattern: 'aimed', shootInterval: 0.5, speed: 140 },
      { hpThreshold: 0.2, pattern: 'spiral', shootInterval: 0.15, speed: 160 },
    ],
  },
  bgColor1: '#000011',
  bgColor2: '#000522',
  starSpeed: 1,
};

export default stage1;
