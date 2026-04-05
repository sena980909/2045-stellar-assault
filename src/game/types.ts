// ===== 2045 SHOOTING GAME - TYPE DEFINITIONS =====

export type GameState = 'menu' | 'playing' | 'paused' | 'stageClear' | 'gameOver' | 'victory' | 'enterName';

export interface ScoreEntry {
  name: string;
  score: number;
  stage: number;
  combo: number;
  date: string;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}

export interface BulletData extends Entity {
  vx: number;
  vy: number;
  damage: number;
  isPlayer: boolean;
  color: string;
}

export interface EnemyType {
  name: string;
  hp: number;
  speed: number;
  width: number;
  height: number;
  score: number;
  color: string;
  glowColor: string;
  pattern: string;
  canShoot: boolean;
  shootInterval: number;
  bulletCount: number;
}

export interface EnemyData extends Entity {
  hp: number;
  maxHp: number;
  type: EnemyType;
  vx: number;
  vy: number;
  shootTimer: number;
  patternTimer: number;
  score: number;
  hitFlash: number;
}

export interface BossPhase {
  hpThreshold: number;
  pattern: string;
  shootInterval: number;
  speed: number;
}

export interface BossData extends Entity {
  hp: number;
  maxHp: number;
  name: string;
  phases: BossPhase[];
  currentPhase: number;
  shootTimer: number;
  patternTimer: number;
  moveDir: number;
  score: number;
  color: string;
  glowColor: string;
  entering: boolean;
  enterY: number;
  hitFlash: number;
}

export type ItemType = 'power' | 'bomb' | 'speed' | 'hp';

export interface ItemData extends Entity {
  type: ItemType;
  vy: number;
}

export interface ExplosionData {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  active: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  active: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  power: number;
  bombs: number;
  speed: number;
  score: number;
  invincible: boolean;
  invincibleTimer: number;
  shootTimer: number;
  shooting: boolean;
  focused: boolean;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface WaveDefinition {
  time: number;
  enemies: { type: string; count: number; delay: number; x?: number }[];
}

export interface BossTemplate {
  name: string;
  hp: number;
  width: number;
  height: number;
  score: number;
  color: string;
  glowColor: string;
  enterY: number;
  phases: BossPhase[];
}

export interface ItemDropConfig {
  dropChance: number;
  weights?: { power: number; bomb: number; speed: number; hp?: number };
}

export interface DifficultyModifiers {
  enemyHpMultiplier?: number;
  enemySpeedMultiplier?: number;
  bossHpMultiplier?: number;
  bossShootIntervalMultiplier?: number;
}

export interface StageDefinition {
  name: string;
  subtitle: string;
  waves: WaveDefinition[];
  boss: BossTemplate;
  bgColor1: string;
  bgColor2: string;
  starSpeed: number;
  // Extensibility fields (all optional with sensible defaults)
  difficulty?: DifficultyModifiers;
  itemDrop?: ItemDropConfig;
  victoryText?: string[];
  enemyTypes?: Record<string, EnemyType>;
}

export interface DebugState {
  showHitboxes: boolean;
  showFps: boolean;
  invincible: boolean;
  showObjectCount: boolean;
}
