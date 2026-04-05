import { StageDefinition } from '../../types';

const stage2: StageDefinition = {
  name: 'STAGE 2',
  subtitle: 'ASTEROID FIELD',
  waves: [
    // === Phase 1: review + kamikaze intro (2~10s) ===
    { time: 2, enemies: [{ type: 'scout', count: 5, delay: 0.25 }, { type: 'fighter', count: 3, delay: 0.5 }] },
    { time: 6, enemies: [{ type: 'scout', count: 6, delay: 0.15 }] },
    { time: 9, enemies: [{ type: 'kamikaze', count: 3, delay: 0.35 }] },
    // === Phase 2: heavy intro, varied combos (13~24s) ===
    { time: 13, enemies: [{ type: 'heavy', count: 1, delay: 0 }, { type: 'fighter', count: 4, delay: 0.4 }] },
    { time: 17, enemies: [{ type: 'scout', count: 8, delay: 0.1 }] },
    { time: 20, enemies: [{ type: 'kamikaze', count: 4, delay: 0.25 }, { type: 'fighter', count: 3, delay: 0.45 }] },
    { time: 24, enemies: [{ type: 'heavy', count: 2, delay: 0.7 }, { type: 'scout', count: 4, delay: 0.2 }] },
    // -- rest (28~31s) --
    { time: 31, enemies: [{ type: 'scout', count: 3, delay: 0.3 }] },
    // === Phase 3: sharp density increase (33~44s) ===
    { time: 33, enemies: [{ type: 'fighter', count: 5, delay: 0.3 }, { type: 'kamikaze', count: 3, delay: 0.3 }] },
    { time: 37, enemies: [{ type: 'heavy', count: 2, delay: 0.5 }, { type: 'scout', count: 6, delay: 0.12 }] },
    { time: 41, enemies: [{ type: 'fighter', count: 4, delay: 0.35 }, { type: 'kamikaze', count: 4, delay: 0.2 }] },
    // === Phase 4: Pre-boss rush (44~50s) ===
    { time: 44, enemies: [{ type: 'scout', count: 10, delay: 0.08 }, { type: 'kamikaze', count: 5, delay: 0.18 }, { type: 'heavy', count: 1, delay: 0 }] },
    { time: 52, enemies: [] }, // boss trigger
  ],
  boss: {
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
      { hpThreshold: 0.6, pattern: 'spiral', shootInterval: 0.2, speed: 130 },
      { hpThreshold: 0.25, pattern: 'aimed', shootInterval: 0.35, speed: 170 },
    ],
  },
  bgColor1: '#001100',
  bgColor2: '#001122',
  starSpeed: 1.3,
};

export default stage2;
