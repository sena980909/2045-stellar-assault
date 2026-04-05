// ===== STAGE MANAGER =====

import { StageDefinition, WaveDefinition } from '../types';

const STAGES: StageDefinition[] = [
  {
    name: 'STAGE 1',
    subtitle: 'ORBITAL PERIMETER',
    waves: [
      // === Phase 1: Intro - scout only (0~8s) - 적응 시간 ===
      { time: 2, enemies: [{ type: 'scout', count: 4, delay: 0.4 }] },
      { time: 5, enemies: [{ type: 'scout', count: 5, delay: 0.35 }] },
      // === Phase 2: Fighter 등장, 점진적 혼합 (10~22s) ===
      { time: 10, enemies: [{ type: 'scout', count: 3, delay: 0.3 }, { type: 'fighter', count: 2, delay: 0.6 }] },
      { time: 14, enemies: [{ type: 'fighter', count: 3, delay: 0.5 }, { type: 'scout', count: 4, delay: 0.25 }] },
      { time: 18, enemies: [{ type: 'scout', count: 5, delay: 0.2 }, { type: 'fighter', count: 3, delay: 0.45 }] },
      // -- 잠깐 이완 (22~25s) --
      { time: 25, enemies: [{ type: 'scout', count: 4, delay: 0.3 }] },
      // === Phase 3: 밀도 증가, fighter 위주 (27~38s) ===
      { time: 27, enemies: [{ type: 'fighter', count: 4, delay: 0.4 }, { type: 'scout', count: 3, delay: 0.25 }] },
      { time: 31, enemies: [{ type: 'fighter', count: 5, delay: 0.35 }] },
      { time: 35, enemies: [{ type: 'scout', count: 6, delay: 0.12 }, { type: 'fighter', count: 3, delay: 0.4 }] },
      // === Phase 4: Pre-boss scout 러시 + fighter 압박 (39~45s) ===
      { time: 39, enemies: [{ type: 'scout', count: 8, delay: 0.09 }, { type: 'fighter', count: 4, delay: 0.3 }] },
      { time: 47, enemies: [] }, // boss trigger  (총 ~66마리, ~47초)
    ],
    bossName: 'stage1',
    bgColor1: '#000011',
    bgColor2: '#000522',
    starSpeed: 1,
  },
  {
    name: 'STAGE 2',
    subtitle: 'ASTEROID FIELD',
    waves: [
      // === Phase 1: 기존 적 복습 + kamikaze 첫 등장 (2~10s) ===
      { time: 2, enemies: [{ type: 'scout', count: 5, delay: 0.25 }, { type: 'fighter', count: 3, delay: 0.5 }] },
      { time: 6, enemies: [{ type: 'scout', count: 6, delay: 0.15 }] },
      { time: 9, enemies: [{ type: 'kamikaze', count: 3, delay: 0.35 }] },
      // === Phase 2: heavy 등장, 다양한 조합 (13~24s) ===
      { time: 13, enemies: [{ type: 'heavy', count: 1, delay: 0 }, { type: 'fighter', count: 4, delay: 0.4 }] },
      { time: 17, enemies: [{ type: 'scout', count: 8, delay: 0.1 }] },
      { time: 20, enemies: [{ type: 'kamikaze', count: 4, delay: 0.25 }, { type: 'fighter', count: 3, delay: 0.45 }] },
      { time: 24, enemies: [{ type: 'heavy', count: 2, delay: 0.7 }, { type: 'scout', count: 4, delay: 0.2 }] },
      // -- 쉬는 구간 (28~31s) + 경고 웨이브 --
      { time: 31, enemies: [{ type: 'scout', count: 3, delay: 0.3 }] },
      // === Phase 3: 급격한 밀도 증가 (33~44s) ===
      { time: 33, enemies: [{ type: 'fighter', count: 5, delay: 0.3 }, { type: 'kamikaze', count: 3, delay: 0.3 }] },
      { time: 37, enemies: [{ type: 'heavy', count: 2, delay: 0.5 }, { type: 'scout', count: 6, delay: 0.12 }] },
      { time: 41, enemies: [{ type: 'fighter', count: 4, delay: 0.35 }, { type: 'kamikaze', count: 4, delay: 0.2 }] },
      // === Phase 4: Pre-boss 러시 (44~50s) ===
      { time: 44, enemies: [{ type: 'scout', count: 10, delay: 0.08 }, { type: 'kamikaze', count: 5, delay: 0.18 }, { type: 'heavy', count: 1, delay: 0 }] },
      { time: 52, enemies: [] }, // boss trigger  (총 ~86마리, ~52초)
    ],
    bossName: 'stage2',
    bgColor1: '#001100',
    bgColor2: '#001122',
    starSpeed: 1.3,
  },
  {
    name: 'STAGE 3',
    subtitle: 'NEXUS CORE',
    waves: [
      // === Phase 1: 시작부터 전투 (2~10s) ===
      { time: 2, enemies: [{ type: 'fighter', count: 4, delay: 0.35 }, { type: 'kamikaze', count: 3, delay: 0.3 }] },
      { time: 6, enemies: [{ type: 'scout', count: 6, delay: 0.15 }, { type: 'fighter', count: 3, delay: 0.4 }] },
      { time: 10, enemies: [{ type: 'heavy', count: 2, delay: 0.5 }, { type: 'kamikaze', count: 4, delay: 0.25 }] },
      // === Phase 2: heavy 다수 동시 출현 (14~24s) ===
      { time: 14, enemies: [{ type: 'heavy', count: 3, delay: 0.4 }, { type: 'scout', count: 8, delay: 0.1 }] },
      { time: 18, enemies: [{ type: 'fighter', count: 5, delay: 0.25 }, { type: 'kamikaze', count: 5, delay: 0.2 }] },
      { time: 22, enemies: [{ type: 'heavy', count: 2, delay: 0.5 }, { type: 'fighter', count: 4, delay: 0.3 }, { type: 'scout', count: 5, delay: 0.15 }] },
      // === Phase 3: 고밀도 연속 공격 (27~38s) ===
      { time: 27, enemies: [{ type: 'kamikaze', count: 6, delay: 0.15 }, { type: 'fighter', count: 4, delay: 0.3 }] },
      { time: 31, enemies: [{ type: 'heavy', count: 3, delay: 0.35 }, { type: 'scout', count: 8, delay: 0.08 }] },
      { time: 35, enemies: [{ type: 'fighter', count: 6, delay: 0.2 }, { type: 'kamikaze', count: 4, delay: 0.2 }] },
      // === Phase 4: Hell wave - 전 유형 총출격 (40~48s) ===
      { time: 40, enemies: [{ type: 'heavy', count: 3, delay: 0.3 }, { type: 'fighter', count: 6, delay: 0.2 }, { type: 'kamikaze', count: 5, delay: 0.15 }, { type: 'scout', count: 6, delay: 0.1 }] },
      // === Phase 5: 보스 직전 kamikaze 대량 러시 (47~53s) - 2파로 분할 ===
      { time: 47, enemies: [{ type: 'kamikaze', count: 5, delay: 0.12 }, { type: 'scout', count: 5, delay: 0.1 }] },
      { time: 50, enemies: [{ type: 'kamikaze', count: 5, delay: 0.12 }, { type: 'scout', count: 3, delay: 0.1 }] },
      { time: 56, enemies: [] }, // boss trigger
    ],
    bossName: 'stage3',
    bgColor1: '#110000',
    bgColor2: '#110011',
    starSpeed: 1.6,
  },
];

export class StageManager {
  currentStageIndex = 0;
  stageTime = 0;
  waveIndex = 0;
  bossSpawned = false;
  stageComplete = false;
  pendingSpawns: { type: string; delay: number; elapsed: number; x?: number }[] = [];

  get currentStage(): StageDefinition {
    return STAGES[this.currentStageIndex];
  }

  get totalStages(): number {
    return STAGES.length;
  }

  get isLastStage(): boolean {
    return this.currentStageIndex >= STAGES.length - 1;
  }

  reset() {
    this.stageTime = 0;
    this.waveIndex = 0;
    this.bossSpawned = false;
    this.stageComplete = false;
    this.pendingSpawns = [];
  }

  nextStage() {
    this.currentStageIndex++;
    this.reset();
  }

  restartFromBeginning() {
    this.currentStageIndex = 0;
    this.reset();
  }

  skipToStage(index: number) {
    if (index >= 0 && index < STAGES.length) {
      this.currentStageIndex = index;
      this.reset();
    }
  }

  update(dt: number, canvasWidth: number): { spawns: { type: string; x: number }[]; spawnBoss: boolean } {
    this.stageTime += dt;
    const stage = this.currentStage;
    const result: { spawns: { type: string; x: number }[]; spawnBoss: boolean } = { spawns: [], spawnBoss: false };

    // Check waves
    while (this.waveIndex < stage.waves.length && this.stageTime >= stage.waves[this.waveIndex].time) {
      const wave = stage.waves[this.waveIndex];
      if (wave.enemies.length === 0) {
        // Boss wave
        if (!this.bossSpawned) {
          result.spawnBoss = true;
          this.bossSpawned = true;
        }
      } else {
        for (const group of wave.enemies) {
          for (let i = 0; i < group.count; i++) {
            this.pendingSpawns.push({
              type: group.type,
              delay: i * group.delay,
              elapsed: 0,
              x: group.x,
            });
          }
        }
      }
      this.waveIndex++;
    }

    // Process pending spawns
    const remaining: typeof this.pendingSpawns = [];
    for (const spawn of this.pendingSpawns) {
      spawn.elapsed += dt;
      if (spawn.elapsed >= spawn.delay) {
        const margin = 40;
        const x = spawn.x ?? margin + Math.random() * (canvasWidth - margin * 2);
        result.spawns.push({ type: spawn.type, x });
      } else {
        remaining.push(spawn);
      }
    }
    this.pendingSpawns = remaining;

    return result;
  }
}
