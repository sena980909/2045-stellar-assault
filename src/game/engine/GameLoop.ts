// ===== MAIN GAME LOOP =====

import {
  GameState,
  BulletData,
  EnemyData,
  BossData,
  ItemData,
  ExplosionData,
  Particle,
  DebugState,
  FloatingText,
  ScoreEntry,
} from '../types';
import { InputManager } from './InputManager';
import { render } from './Renderer';
import { checkCollision, checkCollisionWithHitbox, isOutOfBounds } from './CollisionSystem';
import { createPlayer, updatePlayer, playerShoot, getPlayerHitbox } from '../entities/Player';
import { createEnemy, updateEnemy, enemyShoot, registerEnemyTypes } from '../entities/Enemy';
import { createBoss, updateBoss, bossShoot } from '../entities/Boss';
import { updateBullet } from '../entities/Bullet';
import { createItem, randomItemType, updateItem } from '../entities/Item';
import { updateExplosion, updateParticle, createBurstExplosion, createMegaExplosion, createParticles, createFlashSparks } from '../effects/Explosion';
import { Background } from '../effects/Background';
import { SoundManager } from '../effects/SoundManager';
import { StageManager } from '../stages/StageManager';

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input = new InputManager();
  sound = new SoundManager();
  bg: Background;
  stageManager = new StageManager();

  state: GameState = 'menu';
  player = createPlayer(0, 0);
  bullets: BulletData[] = [];
  enemies: EnemyData[] = [];
  boss: BossData | null = null;
  items: ItemData[] = [];
  explosions: ExplosionData[] = [];
  particles: Particle[] = [];
  floatingTexts: FloatingText[] = [];

  time = 0;
  lastTime = 0;
  animFrame = 0;
  screenShake = 0;
  screenFlash = 0;
  bombActive = false;
  bombTimer = 0;
  stageTransitionTimer = 0;
  stageTransitionPhase: 'none' | 'clear' | 'name' | 'go' = 'none';
  slowMo = 0;
  bossWarningTimer = 0;

  // Combo system
  comboCount = 0;
  comboTimer = 0;
  maxCombo = 0;
  comboDisplayTimer = 0;

  // Scoreboard
  scoreBoard: ScoreEntry[] = [];
  nameChars = [0, 0, 0];
  namePos = 0;
  nameFrom: 'gameOver' | 'victory' = 'gameOver';

  debug: DebugState = {
    showHitboxes: false,
    showFps: false,
    invincible: false,
    showObjectCount: false,
  };
  fps = 0;
  frameCount = 0;
  fpsTimer = 0;

  highScore = 0;
  private destroyed = false;

  width: number;
  height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.bg = new Background(this.width, this.height);

    try {
      const saved = localStorage.getItem('2045_highscore');
      if (saved) this.highScore = parseInt(saved, 10);
      const board = localStorage.getItem('2045_scoreboard');
      if (board) this.scoreBoard = JSON.parse(board);
    } catch { /* ignore */ }
  }

  private onVisibilityChange = () => {
    if (document.hidden && this.state === 'playing') {
      this.state = 'paused';
      this.sound.pauseBgm();
    }
  };

  init() {
    this.input.init(this.canvas);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.lastTime = performance.now();
    this.loop(performance.now());
  }

  private loop = (now: number) => {
    if (this.destroyed) return;
    const rawDt = Math.max(0, (now - this.lastTime) / 1000);
    let dt = Math.min(rawDt, 1 / 30);
    this.lastTime = now;
    if (this.slowMo > 0) {
      this.slowMo -= rawDt;
      dt *= 0.3;
    }
    this.time += dt;

    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    this.input.update();
    this.handleDebugKeys();

    switch (this.state) {
      case 'menu': this.updateMenu(dt); break;
      case 'playing': this.updatePlaying(dt); break;
      case 'paused': this.updatePaused(); break;
      case 'stageClear': this.updateStageClear(dt); break;
      case 'gameOver': this.updateGameOver(dt); break;
      case 'victory': this.updateVictory(); break;
      case 'enterName': this.updateEnterName(dt); break;
    }

    render(this);
    this.animFrame = requestAnimationFrame(this.loop);
  };

  private handleDebugKeys() {
    if (this.input.wasPressed('KeyM')) this.sound.toggleMute();
    if (this.input.wasPressed('Minus') || this.input.wasPressed('NumpadSubtract')) this.sound.volumeDown();
    if (this.input.wasPressed('Equal') || this.input.wasPressed('NumpadAdd')) this.sound.volumeUp();

    // Debug keys ONLY in development mode — never in production (Vercel)
    if (process.env.NODE_ENV !== 'production') {
      if (this.input.wasPressed('F1')) this.debug.showHitboxes = !this.debug.showHitboxes;
      if (this.input.wasPressed('F3')) this.debug.invincible = !this.debug.invincible;
      if (this.input.wasPressed('F4')) this.debug.showObjectCount = !this.debug.showObjectCount;
      // Stage skip only from menu or playing states (not enterName/gameOver/victory)
      if (this.state !== 'menu' && this.state !== 'playing') return;
      // Dynamic stage skip: Digit1-9 + Digit0 for stage 10
      for (let i = 1; i <= 9; i++) {
        if (this.input.wasPressed(`Digit${i}`) && i <= this.stageManager.totalStages) {
          this.stageManager.skipToStage(i - 1);
          this.startGame();
          return;
        }
      }
      if (this.input.wasPressed('Digit0') && this.stageManager.totalStages >= 10) {
        this.stageManager.skipToStage(9);
        this.startGame();
        return;
      }
    }
  }

  private startGame() {
    this.state = 'playing';
    // Always reset debug invincible on game start
    this.debug.invincible = false;
    this.player = createPlayer(this.width, this.height);
    this.bullets = [];
    this.enemies = [];
    this.boss = null;
    this.items = [];
    this.explosions = [];
    this.particles = [];
    this.floatingTexts = [];
    this.bombActive = false;
    this.bombTimer = 0;
    this.screenShake = 0;
    this.screenFlash = 0;
    this.slowMo = 0;
    this.bossWarningTimer = 0;
    this.stageTransitionTimer = 0;
    this.stageTransitionPhase = 'none';
    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.comboDisplayTimer = 0;
    this.gameOverTapCount = 0;
    this.gameOverTapTimer = 0;
    this.stageManager.reset();
    // Register stage-specific enemy types
    const stageEnemies = this.stageManager.currentStage.enemyTypes;
    if (stageEnemies) registerEnemyTypes(stageEnemies);
  }

  // ===== MENU =====
  private updateMenu(dt: number) {
    this.bg.update(dt);
    if (this.input.wasPressed('Space') || this.input.wasPressed('Enter')) {
      this.sound.init();
      this.sound.playMenuSelect();
      this.stageManager.restartFromBeginning();
      this.startGame();
      this.sound.startBgm('stage');
    }
    if (this.input.wasPressed('KeyM')) {
      this.sound.init();
      this.sound.toggleMute();
    }
  }

  // ===== PLAYING =====
  private updatePlaying(dt: number) {
    if (this.input.wasPressed('Escape') || this.input.wasPressed('KeyP') || this.input.touchPause) {
      if (this.input.touchPause) this.input.touchPause = false;
      this.state = 'paused';
      this.sound.playPause();
      this.sound.pauseBgm();
      return;
    }

    this.bg.update(dt, this.stageManager.currentStage.starSpeed);

    // Boss warning timer
    if (this.bossWarningTimer > 0) this.bossWarningTimer -= dt;

    // Player
    if (this.debug.invincible) {
      this.player.invincible = true;
      this.player.invincibleTimer = 999;
    }
    updatePlayer(this.player, this.input.moveX, this.input.moveY, true, dt, this.width, this.height, this.input.isFocused);

    const newBullets = playerShoot(this.player);
    if (newBullets.length > 0) {
      this.bullets.push(...newBullets);
      this.sound.playShoot();
    }

    // Bomb
    const bombPressed = this.input.isBombing;
    if (bombPressed && this.player.bombs > 0 && !this.bombActive) {
      this.player.bombs--;
      this.bombActive = true;
      this.bombTimer = 0.8;
      this.screenShake = 0.5;
      this.sound.playBomb();
      // Bomb shockwave particles from player center
      const bx = this.player.x + this.player.width / 2;
      const by = this.player.y + this.player.height / 2;
      this.particles.push(...createFlashSparks(bx, by, 20));
      this.particles.push(...createParticles(bx, by, 12, '#00ccff'));
      for (const b of this.bullets) {
        if (!b.isPlayer) b.active = false;
      }
      for (const e of this.enemies) {
        e.hp -= 5;
        if (e.hp <= 0) {
          e.active = false;
          this.comboCount++;
          this.comboTimer = 2.0;
          if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;
          this.player.score += Math.floor(e.score * this.getComboMultiplier());
          this.spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, e.type.color);
        }
      }
      if (this.boss && !this.boss.entering) {
        const prevHpRatio = this.boss.hp / this.boss.maxHp;
        const bombDmg = Math.max(10, Math.floor(this.boss.maxHp * 0.03));
        this.boss.hp -= bombDmg;
        this.boss.hitFlash = 0.1;
        // Check item drop thresholds for bomb damage too
        if (this.boss.hp > 0) {
          const newHpRatio = this.boss.hp / this.boss.maxHp;
          const prevSlice = Math.floor(prevHpRatio * 7);
          const newSlice = Math.floor(newHpRatio * 7);
          for (let s = 0; s < prevSlice - newSlice; s++) {
            const itemType = this.player.power <= 1 ? 'power' as const : this.getItemType();
            this.items.push(createItem(
              this.boss.x + this.boss.width / 2 + (Math.random() - 0.5) * 40,
              this.boss.y + this.boss.height,
              itemType
            ));
          }
        }
      }
    }
    if (this.bombActive) {
      this.bombTimer -= dt;
      if (this.bombTimer <= 0) this.bombActive = false;
    }

    // Screen shake & flash decay
    if (this.screenShake > 0) this.screenShake -= dt * 2;
    if (this.screenFlash > 0) this.screenFlash -= dt * 3;

    // Stage spawning (with difficulty modifiers)
    const stageResult = this.stageManager.update(dt, this.width);
    const diff = this.stageManager.currentStage.difficulty;
    for (const spawn of stageResult.spawns) {
      const enemy = createEnemy(spawn.type, spawn.x, -30);
      if (diff) {
        if (diff.enemyHpMultiplier) { enemy.hp = Math.round(enemy.hp * diff.enemyHpMultiplier); enemy.maxHp = enemy.hp; }
        if (diff.enemySpeedMultiplier) {
          enemy.type = { ...enemy.type, speed: enemy.type.speed * diff.enemySpeedMultiplier };
          enemy.vy = enemy.type.speed;
        }
      }
      this.enemies.push(enemy);
    }
    if (stageResult.spawnBoss && !this.boss) {
      this.boss = createBoss(this.stageManager.currentStage.boss, this.width);
      if (diff?.bossHpMultiplier) { this.boss.hp = Math.round(this.boss.hp * diff.bossHpMultiplier); this.boss.maxHp = this.boss.hp; }
      this.bossWarningTimer = 2.5;
      this.sound.playBossWarning();
      this.sound.startBgm('boss');
    }

    // Update bullets
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      updateBullet(bullet, dt);
      if (isOutOfBounds(bullet, this.width, this.height)) {
        bullet.active = false;
      }
    }

    // Update enemies
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      updateEnemy(enemy, dt, this.player.x, this.player.y, this.width);
      const eBullets = enemyShoot(enemy, this.player.x, this.player.y);
      if (eBullets.length > 0) {
        this.bullets.push(...eBullets);
        this.sound.playEnemyShoot();
      }
      if (isOutOfBounds(enemy, this.width, this.height, 100)) {
        enemy.active = false;
      }
    }

    // Update boss
    if (this.boss && this.boss.active) {
      updateBoss(this.boss, dt, this.width);
      const bossBullets = bossShoot(this.boss, this.player.x, this.player.y);
      this.bullets.push(...bossBullets);
    }

    // Update items
    for (const item of this.items) {
      if (!item.active) continue;
      updateItem(item, dt);
      if (isOutOfBounds(item, this.width, this.height)) {
        item.active = false;
      }
    }

    // Update effects
    for (const exp of this.explosions) {
      if (exp.active) updateExplosion(exp, dt);
    }
    for (const p of this.particles) {
      if (p.active) updateParticle(p, dt);
    }
    for (const ft of this.floatingTexts) {
      ft.y -= 40 * dt;
      ft.life -= dt;
    }
    this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }
    if (this.comboDisplayTimer > 0) this.comboDisplayTimer -= dt;

    // === COLLISION ===
    this.handleCollisions();

    // Cleanup
    this.bullets = this.bullets.filter(b => b.active);
    this.enemies = this.enemies.filter(e => e.active);
    this.items = this.items.filter(i => i.active);
    this.explosions = this.explosions.filter(e => e.active);
    this.particles = this.particles.filter(p => p.active);
    // Cap particles for mobile performance
    if (this.particles.length > 120) this.particles = this.particles.slice(-120);

    // Check boss death (skip if player already dead)
    if (this.boss && this.boss.hp <= 0 && this.boss.active && this.state === 'playing') {
      this.boss.active = false;
      const bossMult = this.getComboMultiplier();
      this.player.score += Math.floor(this.boss.score * bossMult);
      this.spawnBigExplosion(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2);
      this.sound.playBossExplosion();
      this.screenShake = 1;
      this.slowMo = 0.6;
      this.bombActive = false;
      this.boss = null;

      for (const b of this.bullets) {
        if (!b.isPlayer) b.active = false;
      }

      if (this.stageManager.isLastStage) {
        this.state = 'victory';
        this.saveHighScore();
        this.sound.stopBgm();
        this.sound.playVictory();
      } else {
        this.state = 'stageClear';
        this.stageTransitionTimer = 0;
        this.stageTransitionPhase = 'clear';
        this.sound.stopBgm();
        this.sound.playStageClear();
      }
    }
  }

  private handleCollisions() {
    const playerHitbox = getPlayerHitbox(this.player);

    // Player bullets vs enemies
    for (const bullet of this.bullets) {
      if (!bullet.active || !bullet.isPlayer) continue;

      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        if (checkCollision(bullet, enemy)) {
          bullet.active = false;
          enemy.hp -= bullet.damage;
          enemy.hitFlash = 0.04;
          if (enemy.hp <= 0) {
            enemy.active = false;
            this.comboCount++;
            this.comboTimer = 2.0;
            this.comboDisplayTimer = 1.5;
            if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;
            if (this.comboCount === 5 || this.comboCount === 10 || this.comboCount === 20 || this.comboCount === 30 || this.comboCount === 50) {
              this.sound.playComboMilestone(Math.floor(this.comboCount / 10));
            }
            const comboMult = this.getComboMultiplier();
            const earnedScore = Math.floor(enemy.score * comboMult);
            this.player.score += earnedScore;
            if (comboMult > 1) {
              this.spawnFloatingText(
                enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 - 15,
                `x${comboMult.toFixed(1)}`, '#ffff00'
              );
            }
            this.spawnExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.type.color);
            this.sound.playExplosion();
            const dropCfg = this.stageManager.currentStage.itemDrop;
            const dropChance = dropCfg?.dropChance ?? 0.15;
            if (Math.random() < dropChance) {
              this.items.push(createItem(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, this.getItemType()));
            }
          }
          break;
        }
      }

      // Player bullets vs boss
      if (bullet.active && this.boss && this.boss.active && !this.boss.entering && checkCollision(bullet, this.boss)) {
        bullet.active = false;
        const prevHpRatio = this.boss.hp / this.boss.maxHp;
        this.boss.hp -= bullet.damage;
        this.boss.hitFlash = 0.04;
        this.particles.push(...createParticles(bullet.x, bullet.y, 4, '#ffffff'));
        // Drop item at every ~12% HP threshold (8 slices = 7 drops per boss)
        // Guarantee power items when player is underpowered (breaks death spiral)
        if (this.boss.hp > 0) {
          const newHpRatio = this.boss.hp / this.boss.maxHp;
          if (Math.floor(prevHpRatio * 8) > Math.floor(newHpRatio * 8)) {
            const itemType = this.player.power <= 2 ? 'power' as const : this.getItemType();
            this.items.push(createItem(
              this.boss.x + this.boss.width / 2 + (Math.random() - 0.5) * 40,
              this.boss.y + this.boss.height,
              itemType
            ));
          }
        }
      }
    }

    // Enemy bullets vs player
    if (!this.player.invincible && !this.bombActive && this.state === 'playing') {
      for (const bullet of this.bullets) {
        if (!bullet.active || bullet.isPlayer) continue;
        if (checkCollisionWithHitbox(bullet, playerHitbox)) {
          bullet.active = false;
          this.onPlayerHit();
          return;
        }
      }
    }

    // Enemies colliding with player
    if (!this.player.invincible && !this.bombActive && this.state === 'playing') {
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        if (checkCollisionWithHitbox(enemy, playerHitbox)) {
          enemy.active = false;
          this.player.score += enemy.score;
          this.spawnExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.type.color);
          // Drop item on collision kill
          const dropCfg = this.stageManager.currentStage.itemDrop;
          const dropChance = dropCfg?.dropChance ?? 0.15;
          if (Math.random() < dropChance) {
            this.items.push(createItem(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, this.getItemType()));
          }
          this.onPlayerHit();
          return;
        }
      }
    }

    // Boss body vs player
    if (!this.player.invincible && !this.bombActive && this.state === 'playing' && this.boss && this.boss.active && !this.boss.entering) {
      if (checkCollisionWithHitbox(this.boss, playerHitbox)) {
        this.onPlayerHit();
        return;
      }
    }

    // Items vs player
    for (const item of this.items) {
      if (!item.active) continue;
      if (checkCollision(item, this.player)) {
        item.active = false;
        this.sound.playPowerUp();
        const ix = item.x + item.width / 2;
        const iy = item.y + item.height / 2;
        switch (item.type) {
          case 'power':
            if (this.player.power >= 5) {
              this.player.score += 500;
              this.spawnFloatingText(ix, iy, '+500', '#00ffff');
            } else {
              this.player.power++;
              this.spawnFloatingText(ix, iy, '+POWER!', '#00ffff');
            }
            break;
          case 'bomb':
            if (this.player.bombs >= 4) {
              this.player.score += 500;
              this.spawnFloatingText(ix, iy, '+500', '#ff4444');
            } else {
              this.player.bombs++;
              this.spawnFloatingText(ix, iy, '+BOMB!', '#ff4444');
            }
            break;
          case 'speed':
            if (this.player.speed >= 7) {
              this.player.score += 300;
              this.spawnFloatingText(ix, iy, '+300', '#44ff44');
            } else {
              this.player.speed = Math.min(this.player.speed + 0.4, 7);
              this.spawnFloatingText(ix, iy, '+SPEED!', '#44ff44');
            }
            break;
          case 'hp':
            if (this.player.hp >= this.player.maxHp) {
              this.player.score += 500;
              this.spawnFloatingText(ix, iy, '+500', '#ff66aa');
            } else {
              this.player.hp = Math.min(this.player.hp + 1, this.player.maxHp);
              this.spawnFloatingText(ix, iy, '+HP!', '#ff66aa');
            }
            break;
        }
      }
    }
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string) {
    this.floatingTexts.push({ x, y, text, color, life: 0.8, maxLife: 0.8 });
  }

  private spawnExplosion(x: number, y: number, color: string) {
    const { explosions, particles } = createBurstExplosion(x, y, 25, color);
    this.explosions.push(...explosions);
    this.particles.push(...particles);
  }

  private spawnBigExplosion(x: number, y: number) {
    const { explosions, particles } = createMegaExplosion(x, y);
    this.explosions.push(...explosions);
    this.particles.push(...particles);
  }

  // ===== PLAYER HIT =====
  private onPlayerHit() {
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;

    this.sound.playHit();
    this.screenShake = 0.3;
    this.screenFlash = 0.3;
    this.particles.push(...createParticles(px, py, 8, '#ff4444'));

    this.player.hp--;
    // Hard power penalty: reset to 1 on hit
    if (this.player.power > 1) {
      this.player.power = 1;
      this.spawnFloatingText(px, py - 20, `-1 HP  PWR LOST!`, '#ff4444');
    } else {
      this.spawnFloatingText(px, py - 20, `-1 HP`, '#ff4444');
    }

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.spawnBigExplosion(px, py);
      this.sound.playExplosion();
      this.state = 'gameOver';
      this.gameOverTapTimer = 0;
      this.saveHighScore();
      this.sound.stopBgm();
      this.sound.playGameOver();
    } else {
      // Brief invincibility after hit
      this.player.invincible = true;
      this.player.invincibleTimer = 2.0;
    }
  }

  // ===== PAUSED =====
  private updatePaused() {
    if (this.input.wasPressed('Escape') || this.input.wasPressed('KeyP') || this.input.wasPressed('Space') || this.input.touchPause) {
      if (this.input.touchPause) this.input.touchPause = false;
      this.state = 'playing';
      this.sound.playPause();
      this.sound.resumeBgm();
    }
  }

  // ===== STAGE CLEAR =====
  private updateStageClear(dt: number) {
    this.bg.update(dt);
    this.stageTransitionTimer += dt;

    if (this.stageTransitionTimer > 3) {
      // Stage clear bonus: 5000 × stageNumber + HP restore + bomb
      const clearBonus = 5000 * (this.stageManager.currentStageIndex + 1);
      this.player.score += clearBonus;
      this.player.bombs = Math.min(this.player.bombs + 1, 4);
      this.player.hp = Math.min(this.player.hp + 4, this.player.maxHp);
      this.stageManager.nextStage();
      // Register new stage's custom enemy types
      const stageEnemies = this.stageManager.currentStage.enemyTypes;
      if (stageEnemies) registerEnemyTypes(stageEnemies);
      this.state = 'playing';
      this.boss = null;
      this.bullets = [];
      this.enemies = [];
      this.items = [];
      this.explosions = [];
      this.particles = [];
      this.floatingTexts = [];
      this.stageTransitionPhase = 'none';
      this.bombActive = false;
      this.bombTimer = 0;
      this.slowMo = 0;
      this.screenShake = 0;
      this.screenFlash = 0;
      this.comboCount = 0;
      this.comboTimer = 0;
      this.comboDisplayTimer = 0;
      this.bossWarningTimer = 0;
      this.sound.startBgm('stage');
    }
  }

  // ===== GAME OVER =====
  gameOverTapCount = 0;
  gameOverTapTimer = 0;

  private updateGameOver(dt: number) {
    this.gameOverTapTimer += dt;

    // Wait a brief moment before accepting input (prevent accidental skip)
    if (this.gameOverTapTimer < 0.5) return;

    if (this.input.wasPressed('Space') || this.input.wasPressed('Enter') || this.input.wasPressed('Escape')) {
      if (this.isScoreTopTen()) {
        this.enterNameEntry('gameOver');
        return;
      }
      this.clearAllObjects();
      this.stageManager.restartFromBeginning();
      this.state = 'menu';
    }
  }

  // ===== VICTORY =====
  private updateVictory() {
    if (this.input.wasPressed('Space') || this.input.wasPressed('Enter')) {
      if (this.isScoreTopTen()) {
        this.enterNameEntry('victory');
      } else {
        this.clearAllObjects();
        this.state = 'menu';
      }
    }
  }

  // ===== NAME ENTRY =====
  private enterNameEntry(from: 'gameOver' | 'victory') {
    this.nameFrom = from;
    this.nameChars = [0, 0, 0];
    this.namePos = 0;
    this.state = 'enterName';
  }

  nameTapTimer = 0;

  private updateEnterName(dt: number) {
    this.nameTapTimer += dt;

    if (this.input.wasPressed('ArrowLeft') || this.input.wasPressed('KeyA')) {
      this.namePos = Math.max(0, this.namePos - 1);
    }
    if (this.input.wasPressed('ArrowRight') || this.input.wasPressed('KeyD')) {
      this.namePos = Math.min(2, this.namePos + 1);
    }
    if (this.input.wasPressed('ArrowUp') || this.input.wasPressed('KeyW')) {
      this.nameChars[this.namePos] = (this.nameChars[this.namePos] + 1) % 26;
      this.sound.playLetterChange();
    }
    if (this.input.wasPressed('ArrowDown') || this.input.wasPressed('KeyS')) {
      this.nameChars[this.namePos] = (this.nameChars[this.namePos] + 25) % 26;
      this.sound.playLetterChange();
    }

    if (this.input.wasPressed('Space') || this.input.wasPressed('Enter')) {
      if (this.input.isMobile) {
        if (this.nameTapTimer < 0.5) {
          if (this.namePos < 2) {
            this.namePos++;
          } else {
            this.confirmName();
          }
        } else {
          this.nameChars[this.namePos] = (this.nameChars[this.namePos] + 1) % 26;
        }
        this.nameTapTimer = 0;
      } else {
        if (this.namePos < 2) {
          this.namePos++;
        } else {
          this.confirmName();
        }
      }
    }

    if (this.input.isMobile && this.input.hasJoystick) {
      const joy = this.input.joystickPos;
      if (joy) {
        const dy = joy.currentY - joy.startY;
        if (dy < -25) {
          this.nameChars[this.namePos] = (this.nameChars[this.namePos] + 1) % 26;
          joy.startY = joy.currentY;
        } else if (dy > 25) {
          this.nameChars[this.namePos] = (this.nameChars[this.namePos] + 25) % 26;
          joy.startY = joy.currentY;
        }
        const dx = joy.currentX - joy.startX;
        if (dx > 40) {
          this.namePos = Math.min(2, this.namePos + 1);
          joy.startX = joy.currentX;
        } else if (dx < -40) {
          this.namePos = Math.max(0, this.namePos - 1);
          joy.startX = joy.currentX;
        }
      }
    }
  }

  private confirmName() {
    const name = this.nameChars.map(c => String.fromCharCode(65 + c)).join('');
    this.addScoreEntry(name);
    this.clearAllObjects();
    this.stageManager.restartFromBeginning();
    this.state = 'menu';
  }

  private isScoreTopTen(): boolean {
    if (this.scoreBoard.length < 10) return true;
    return this.player.score > this.scoreBoard[this.scoreBoard.length - 1].score;
  }

  private addScoreEntry(name: string) {
    const entry: ScoreEntry = {
      name,
      score: this.player.score,
      stage: this.stageManager.currentStageIndex + 1,
      combo: this.maxCombo,
      date: new Date().toLocaleDateString(),
    };
    this.scoreBoard.push(entry);
    this.scoreBoard.sort((a, b) => b.score - a.score);
    this.scoreBoard = this.scoreBoard.slice(0, 10);
    try {
      localStorage.setItem('2045_scoreboard', JSON.stringify(this.scoreBoard));
    } catch { /* ignore */ }
  }

  getComboMultiplier(): number {
    if (this.comboCount < 5) return 1.0;
    if (this.comboCount < 10) return 1.5;
    if (this.comboCount < 20) return 2.0;
    if (this.comboCount < 30) return 3.0;
    if (this.comboCount < 50) return 4.0;
    return 5.0;
  }

  private getItemType(): import('../types').ItemType {
    const w = this.stageManager.currentStage.itemDrop?.weights;
    if (!w) return randomItemType();
    const hpW = (w as Record<string, number>).hp ?? 0;
    const total = w.power + w.bomb + w.speed + hpW;
    const roll = Math.random() * total;
    if (roll < w.power) return 'power';
    if (roll < w.power + w.bomb) return 'bomb';
    if (roll < w.power + w.bomb + w.speed) return 'speed';
    return 'hp';
  }

  private clearAllObjects() {
    this.bullets = [];
    this.enemies = [];
    this.boss = null;
    this.items = [];
    this.explosions = [];
    this.particles = [];
    this.floatingTexts = [];
    this.bombActive = false;
    this.bombTimer = 0;
    this.screenShake = 0;
    this.screenFlash = 0;
    this.slowMo = 0;
    this.bossWarningTimer = 0;
    this.stageTransitionTimer = 0;
    this.stageTransitionPhase = 'none';
    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.comboDisplayTimer = 0;
    this.gameOverTapCount = 0;
    this.gameOverTapTimer = 0;
  }

  private saveHighScore() {
    if (this.player.score > this.highScore) {
      this.highScore = this.player.score;
      try {
        localStorage.setItem('2045_highscore', String(this.highScore));
      } catch { /* ignore */ }
    }
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.bg.resize(width, height);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.animFrame);
    this.input.destroy();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }
}
