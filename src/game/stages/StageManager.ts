// ===== STAGE MANAGER =====

import { StageDefinition } from '../types';
import { ALL_STAGES } from './data';

export class StageManager {
  private stages: StageDefinition[] = ALL_STAGES;
  currentStageIndex = 0;
  stageTime = 0;
  waveIndex = 0;
  bossSpawned = false;
  stageComplete = false;
  pendingSpawns: { type: string; delay: number; elapsed: number; x?: number }[] = [];

  get currentStage(): StageDefinition {
    return this.stages[this.currentStageIndex];
  }

  get totalStages(): number {
    return this.stages.length;
  }

  get isLastStage(): boolean {
    return this.currentStageIndex >= this.stages.length - 1;
  }

  reset() {
    this.stageTime = 0;
    this.waveIndex = 0;
    this.bossSpawned = false;
    this.stageComplete = false;
    this.pendingSpawns = [];
  }

  nextStage() {
    if (this.currentStageIndex < this.stages.length - 1) {
      this.currentStageIndex++;
    }
    this.reset();
  }

  restartFromBeginning() {
    this.currentStageIndex = 0;
    this.reset();
  }

  skipToStage(index: number) {
    if (index >= 0 && index < this.stages.length) {
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
