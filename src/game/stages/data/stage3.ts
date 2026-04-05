import { StageDefinition } from '../../types';

const stage3: StageDefinition = {
  name: 'STAGE 3',
  subtitle: 'NEXUS CORE',
  waves: [
    // === Phase 1: combat from the start (2~10s) ===
    { time: 2, enemies: [{ type: 'fighter', count: 4, delay: 0.35 }, { type: 'kamikaze', count: 3, delay: 0.3 }] },
    { time: 6, enemies: [{ type: 'scout', count: 6, delay: 0.15 }, { type: 'fighter', count: 3, delay: 0.4 }] },
    { time: 10, enemies: [{ type: 'heavy', count: 2, delay: 0.5 }, { type: 'kamikaze', count: 4, delay: 0.25 }] },
    // === Phase 2: multiple heavies (14~24s) ===
    { time: 14, enemies: [{ type: 'heavy', count: 3, delay: 0.4 }, { type: 'scout', count: 8, delay: 0.1 }] },
    { time: 18, enemies: [{ type: 'fighter', count: 5, delay: 0.25 }, { type: 'kamikaze', count: 5, delay: 0.2 }] },
    { time: 22, enemies: [{ type: 'heavy', count: 2, delay: 0.5 }, { type: 'fighter', count: 4, delay: 0.3 }, { type: 'scout', count: 5, delay: 0.15 }] },
    // === Phase 3: high-density continuous (27~38s) ===
    { time: 27, enemies: [{ type: 'kamikaze', count: 6, delay: 0.15 }, { type: 'fighter', count: 4, delay: 0.3 }] },
    { time: 31, enemies: [{ type: 'heavy', count: 3, delay: 0.35 }, { type: 'scout', count: 8, delay: 0.08 }] },
    { time: 35, enemies: [{ type: 'fighter', count: 6, delay: 0.2 }, { type: 'kamikaze', count: 4, delay: 0.2 }] },
    // === Phase 4: Hell wave - all types (40~48s) ===
    { time: 40, enemies: [{ type: 'heavy', count: 3, delay: 0.3 }, { type: 'fighter', count: 6, delay: 0.2 }, { type: 'kamikaze', count: 5, delay: 0.15 }, { type: 'scout', count: 6, delay: 0.1 }] },
    // === Phase 5: Pre-boss kamikaze rush (47~53s) ===
    { time: 47, enemies: [{ type: 'kamikaze', count: 5, delay: 0.12 }, { type: 'scout', count: 5, delay: 0.1 }] },
    { time: 50, enemies: [{ type: 'kamikaze', count: 5, delay: 0.12 }, { type: 'scout', count: 3, delay: 0.1 }] },
    { time: 56, enemies: [] }, // boss trigger
  ],
  boss: {
    name: 'NEXUS PRIME',
    hp: 1000,
    width: 96,
    height: 64,
    score: 20000,
    color: '#ffaa00',
    glowColor: '#ff8800',
    enterY: 50,
    phases: [
      { hpThreshold: 1.0, pattern: 'radial', shootInterval: 0.6, speed: 90 },
      { hpThreshold: 0.7, pattern: 'spiral', shootInterval: 0.2, speed: 120 },
      { hpThreshold: 0.4, pattern: 'aimed', shootInterval: 0.3, speed: 160 },
      { hpThreshold: 0.15, pattern: 'fury', shootInterval: 0.12, speed: 180 },
    ],
  },
  bgColor1: '#110000',
  bgColor2: '#110011',
  starSpeed: 1.6,
};

export default stage3;
