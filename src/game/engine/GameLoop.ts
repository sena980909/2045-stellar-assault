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
import { checkCollision, checkCollisionWithHitbox, isOutOfBounds } from './CollisionSystem';
import { createPlayer, updatePlayer, playerShoot, hitPlayer, drawPlayer, getPlayerHitbox } from '../entities/Player';
import { createEnemy, updateEnemy, enemyShoot, drawEnemy } from '../entities/Enemy';
import { createBoss, updateBoss, bossShoot, drawBoss } from '../entities/Boss';
import { updateBullet, drawBullet } from '../entities/Bullet';
import { createItem, randomItemType, updateItem, drawItem } from '../entities/Item';
import { createExplosion, updateExplosion, drawExplosion, createParticles, updateParticle, drawParticle } from '../effects/Explosion';
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
  bombActive = false;
  bombTimer = 0;
  stageTransitionTimer = 0;
  stageTransitionPhase: 'none' | 'clear' | 'name' | 'go' = 'none';

  // Combo system
  comboCount = 0;
  comboTimer = 0;
  maxCombo = 0;
  comboDisplayTimer = 0;

  // Scoreboard
  scoreBoard: ScoreEntry[] = [];
  // Name entry state
  nameChars = [0, 0, 0]; // A=0, B=1, ...Z=25
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

  init() {
    this.input.init(this.canvas);
    this.sound.init();
    this.lastTime = performance.now();
    this.loop(performance.now());
  }

  private loop = (now: number) => {
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 1 / 30); // cap at ~30fps min
    this.lastTime = now;
    this.time += dt;

    // FPS counter
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
      case 'menu':
        this.updateMenu(dt);
        break;
      case 'playing':
        this.updatePlaying(dt);
        break;
      case 'paused':
        this.updatePaused();
        break;
      case 'stageClear':
        this.updateStageClear(dt);
        break;
      case 'gameOver':
        this.updateGameOver();
        break;
      case 'victory':
        this.updateVictory();
        break;
      case 'enterName':
        this.updateEnterName();
        break;
    }

    this.render();
    this.animFrame = requestAnimationFrame(this.loop);
  };

  private handleDebugKeys() {
    if (this.input.wasPressed('F1')) this.debug.showHitboxes = !this.debug.showHitboxes;
    if (this.input.wasPressed('F2')) { this.stageManager.skipToStage(0); this.startGame(); }
    if (this.input.wasPressed('F3')) { this.stageManager.skipToStage(1); this.startGame(); }
    if (this.input.wasPressed('F4')) { this.stageManager.skipToStage(2); this.startGame(); }
    if (this.input.wasPressed('F5')) this.debug.invincible = !this.debug.invincible;
    if (this.input.wasPressed('F6')) this.debug.showObjectCount = !this.debug.showObjectCount;
    if (this.input.wasPressed('KeyM')) this.sound.toggleMute();
  }

  private startGame() {
    this.state = 'playing';
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
    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.comboDisplayTimer = 0;
    this.stageManager.reset();
  }

  // ===== MENU =====
  private updateMenu(dt: number) {
    this.bg.update(dt);
    if (this.input.wasPressed('Space') || this.input.wasPressed('Enter')) {
      this.sound.init(); // iOS: init on user gesture
      this.stageManager.restartFromBeginning();
      this.startGame();
    }
    // Sound toggle from menu too
    if (this.input.wasPressed('KeyM')) {
      this.sound.init();
      this.sound.toggleMute();
    }
  }

  // ===== PLAYING =====
  private updatePlaying(dt: number) {
    if (this.input.wasPressed('Escape') || this.input.wasPressed('KeyP')) {
      this.state = 'paused';
      return;
    }

    this.bg.update(dt, this.stageManager.currentStage.starSpeed);

    // Player
    if (this.debug.invincible) {
      this.player.invincible = true;
      this.player.invincibleTimer = 999;
    }
    // Auto-shoot always on
    updatePlayer(this.player, this.input.moveX, this.input.moveY, true, dt, this.width, this.height, this.input.isFocused);

    const newBullets = playerShoot(this.player);
    if (newBullets.length > 0) {
      this.bullets.push(...newBullets);
      this.sound.playShoot();
    }

    // Bomb
    const bombPressed = this.input.isBombing;
    if (bombPressed) this.input.touchBomb = false; // consume touch bomb
    if (bombPressed && this.player.bombs > 0 && !this.bombActive) {
      this.player.bombs--;
      this.bombActive = true;
      this.bombTimer = 0.8;
      this.screenShake = 0.5;
      this.sound.playBomb();
      // Kill all enemy bullets
      for (const b of this.bullets) {
        if (!b.isPlayer) b.active = false;
      }
      // Damage all enemies
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
      if (this.boss) {
        const bombDmg = Math.max(10, Math.floor(this.boss.maxHp * 0.03));
        this.boss.hp -= bombDmg;
        this.boss.hitFlash = 0.1;
      }
    }
    if (this.bombActive) {
      this.bombTimer -= dt;
      if (this.bombTimer <= 0) this.bombActive = false;
    }

    // Screen shake
    if (this.screenShake > 0) this.screenShake -= dt * 2;

    // Stage spawning
    const stageResult = this.stageManager.update(dt, this.width);
    for (const spawn of stageResult.spawns) {
      this.enemies.push(createEnemy(spawn.type, spawn.x, -30));
    }
    if (stageResult.spawnBoss && !this.boss) {
      this.boss = createBoss(this.stageManager.currentStage.bossName, this.width);
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

      // Enemy shooting
      const eBullets = enemyShoot(enemy, this.player.x, this.player.y);
      this.bullets.push(...eBullets);

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
    // Update floating texts
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

    // Check boss death
    if (this.boss && this.boss.hp <= 0) {
      const bossMult = this.getComboMultiplier();
      this.player.score += Math.floor(this.boss.score * bossMult);
      this.spawnBigExplosion(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2);
      this.sound.playBossExplosion();
      this.screenShake = 1;
      this.boss = null;

      // Clear all enemy bullets
      for (const b of this.bullets) {
        if (!b.isPlayer) b.active = false;
      }

      if (this.stageManager.isLastStage) {
        this.state = 'victory';
        this.saveHighScore();
      } else {
        this.state = 'stageClear';
        this.stageTransitionTimer = 0;
        this.stageTransitionPhase = 'clear';
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
          enemy.hitFlash = 0.08;
          if (enemy.hp <= 0) {
            enemy.active = false;
            // Combo system
            this.comboCount++;
            this.comboTimer = 2.0;
            this.comboDisplayTimer = 1.5;
            if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;
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
            // Item drop (12% chance)
            if (Math.random() < 0.12) {
              this.items.push(createItem(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, randomItemType()));
            }
          }
          break;
        }
      }

      // Player bullets vs boss (skip if bullet already used on an enemy)
      if (bullet.active && this.boss && this.boss.active && !this.boss.entering && checkCollision(bullet, this.boss)) {
        bullet.active = false;
        this.boss.hp -= bullet.damage;
        this.boss.hitFlash = 0.06;
        // Small hit spark
        this.particles.push(...createParticles(bullet.x, bullet.y, 2, this.boss.color));
      }
    }

    // Enemy bullets vs player (use hitbox)
    if (!this.player.invincible && !this.bombActive && this.state === 'playing') {
      for (const bullet of this.bullets) {
        if (!bullet.active || bullet.isPlayer) continue;
        if (checkCollisionWithHitbox(bullet, playerHitbox)) {
          bullet.active = false;
          const dead = hitPlayer(this.player, bullet.damage);
          this.sound.playHit();
          this.screenShake = 0.3;
          if (dead) {
            this.spawnBigExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
            this.state = 'gameOver';
            this.saveHighScore();
            return;
          }
          break;
        }
      }
    }

    // Enemies colliding with player (use hitbox)
    if (!this.player.invincible && !this.bombActive && this.state === 'playing') {
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        if (checkCollisionWithHitbox(enemy, playerHitbox)) {
          enemy.active = false;
          this.spawnExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.type.color);
          const dead = hitPlayer(this.player, 1);
          this.sound.playHit();
          this.screenShake = 0.3;
          if (dead) {
            this.spawnBigExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
            this.state = 'gameOver';
            this.saveHighScore();
            return;
          }
          break;
        }
      }
    }

    // Items vs player (use full ship size for generous pickup)
    for (const item of this.items) {
      if (!item.active) continue;
      if (checkCollision(item, this.player)) {
        item.active = false;
        this.sound.playPowerUp();
        const ix = item.x + item.width / 2;
        const iy = item.y + item.height / 2;
        switch (item.type) {
          case 'power':
            if (this.player.power >= 4) {
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
              this.player.score += 300;
              this.spawnFloatingText(ix, iy, '+300', '#ff88ff');
            } else {
              this.player.hp++;
              this.spawnFloatingText(ix, iy, '+HP!', '#ff88ff');
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
    this.explosions.push(createExplosion(x, y, 25, color));
    this.particles.push(...createParticles(x, y, 8, color));
  }

  private spawnBigExplosion(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      const ox = (Math.random() - 0.5) * 40;
      const oy = (Math.random() - 0.5) * 40;
      this.explosions.push(createExplosion(x + ox, y + oy, 40, '#ff8844'));
    }
    this.particles.push(...createParticles(x, y, 30, '#ffaa44'));
  }

  // ===== PAUSED =====
  private updatePaused() {
    if (this.input.wasPressed('Escape') || this.input.wasPressed('KeyP')) {
      this.state = 'playing';
    }
  }

  // ===== STAGE CLEAR =====
  private updateStageClear(dt: number) {
    this.bg.update(dt);
    this.stageTransitionTimer += dt;

    if (this.stageTransitionTimer > 3) {
      // Stage clear rewards
      this.player.hp = Math.min(this.player.hp + 1, this.player.maxHp);
      this.player.bombs = Math.min(this.player.bombs + 1, 4);

      this.stageManager.nextStage();
      this.state = 'playing';
      this.boss = null;
      this.bullets = [];
      this.enemies = [];
      this.items = [];
      this.explosions = [];
      this.particles = [];
      this.floatingTexts = [];
      this.stageTransitionPhase = 'none';
    }
  }

  // ===== GAME OVER =====
  gameOverTapCount = 0;
  gameOverTapTimer = 0;

  private updateGameOver() {
    this.gameOverTapTimer += 1 / 60;

    if (this.input.wasPressed('Space') || this.input.wasPressed('Enter')) {
      if (this.isScoreTopTen()) {
        this.enterNameEntry('gameOver');
        return;
      }
      // Mobile double-tap: first tap = retry, or if tapped twice quickly = menu
      this.gameOverTapCount++;
      if (this.gameOverTapCount === 1) {
        this.gameOverTapTimer = 0;
      }
      if (this.gameOverTapCount >= 2 && this.gameOverTapTimer < 0.5) {
        // Double tap = menu
        this.clearAllObjects();
        this.state = 'menu';
        this.gameOverTapCount = 0;
        return;
      }
    }
    // Single tap after delay = retry
    if (this.gameOverTapCount === 1 && this.gameOverTapTimer > 0.5) {
      this.gameOverTapCount = 0;
      this.stageManager.restartFromBeginning();
      this.startGame();
      return;
    }
    if (this.input.wasPressed('Escape')) {
      this.clearAllObjects();
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

  private updateEnterName() {
    this.nameTapTimer += 1 / 60;

    // Keyboard controls
    if (this.input.wasPressed('ArrowLeft') || this.input.wasPressed('KeyA')) {
      this.namePos = Math.max(0, this.namePos - 1);
    }
    if (this.input.wasPressed('ArrowRight') || this.input.wasPressed('KeyD')) {
      this.namePos = Math.min(2, this.namePos + 1);
    }
    if (this.input.wasPressed('ArrowUp') || this.input.wasPressed('KeyW')) {
      this.nameChars[this.namePos] = (this.nameChars[this.namePos] + 1) % 26;
    }
    if (this.input.wasPressed('ArrowDown') || this.input.wasPressed('KeyS')) {
      this.nameChars[this.namePos] = (this.nameChars[this.namePos] + 25) % 26;
    }

    if (this.input.wasPressed('Space') || this.input.wasPressed('Enter')) {
      if (this.input.isMobile) {
        // Mobile: tap cycles letter, double-tap confirms and advances
        if (this.nameTapTimer < 0.4) {
          // Double tap = confirm this slot and advance
          if (this.namePos < 2) {
            this.namePos++;
          } else {
            this.confirmName();
          }
        } else {
          // Single tap = cycle letter forward
          this.nameChars[this.namePos] = (this.nameChars[this.namePos] + 1) % 26;
        }
        this.nameTapTimer = 0;
      } else {
        // Keyboard: Space/Enter advances position, then confirms
        if (this.namePos < 2) {
          this.namePos++;
        } else {
          this.confirmName();
        }
      }
    }

    // Mobile touch: use joystick Y for letter change (drag up/down)
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
        // Joystick X for position change
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
    if (this.nameFrom === 'gameOver') {
      this.stageManager.restartFromBeginning();
      this.startGame();
    } else {
      this.clearAllObjects();
      this.state = 'menu';
    }
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

  private getComboMultiplier(): number {
    if (this.comboCount < 5) return 1.0;
    if (this.comboCount < 10) return 1.5;
    if (this.comboCount < 20) return 2.0;
    if (this.comboCount < 30) return 3.0;
    if (this.comboCount < 50) return 4.0;
    return 5.0;
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
    this.screenShake = 0;
  }

  private saveHighScore() {
    if (this.player.score > this.highScore) {
      this.highScore = this.player.score;
      try {
        localStorage.setItem('2045_highscore', String(this.highScore));
      } catch { /* ignore */ }
    }
  }

  // ===== RENDER =====
  private render() {
    const ctx = this.ctx;

    // === Shaken layer: game world only ===
    ctx.save();
    // Clip to canvas bounds so shake never bleeds outside
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();

    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake * 10;
      const shakeY = (Math.random() - 0.5) * this.screenShake * 10;
      ctx.translate(shakeX, shakeY);
    }

    // Background
    this.bg.draw(ctx, this.time);

    switch (this.state) {
      case 'menu':
        this.renderMenu(ctx);
        break;
      case 'playing':
      case 'paused':
        this.renderGameWorld(ctx);
        break;
      case 'stageClear':
        this.renderGameWorld(ctx);
        break;
      case 'gameOver':
        this.renderGameWorld(ctx);
        break;
      case 'victory':
        this.renderGameWorld(ctx);
        break;
      case 'enterName':
        this.renderGameWorld(ctx);
        break;
    }

    // Bomb flash (inside shake scope is fine - it covers full screen)
    if (this.bombActive) {
      const bombAlpha = Math.pow(this.bombTimer / 0.8, 2) * 0.3;
      ctx.fillStyle = `rgba(255, 255, 255, ${bombAlpha})`;
      ctx.fillRect(-10, -10, this.width + 20, this.height + 20);
    }

    ctx.restore();
    // === End shaken layer ===

    // === Stable UI layer: no shake applied ===
    switch (this.state) {
      case 'playing':
      case 'paused':
        this.renderHUD(ctx);
        if (this.state === 'paused') this.renderPause(ctx);
        break;
      case 'stageClear':
        this.renderHUD(ctx);
        this.renderStageClear(ctx);
        break;
      case 'gameOver':
        this.renderHUD(ctx);
        this.renderGameOver(ctx);
        break;
      case 'victory':
        this.renderHUD(ctx);
        this.renderVictory(ctx);
        break;
      case 'enterName':
        this.renderHUD(ctx);
        this.renderEnterName(ctx);
        break;
    }

    // Mobile virtual controls (stable layer, no shake)
    if (this.state === 'playing') {
      this.input.drawMobileUI(ctx, this.time);
    }

    // Debug info (stable, no shake)
    if (this.debug.showFps) {
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`FPS: ${this.fps}`, 5, this.height - 5);
    }
    if (this.debug.showObjectCount) {
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`B:${this.bullets.length} E:${this.enemies.length} P:${this.particles.length}`, 5, this.height - 18);
    }
  }

  private renderMenu(ctx: CanvasRenderingContext2D) {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Title
    ctx.save();
    ctx.textAlign = 'center';

    // Glow effect for title
    ctx.shadowColor = '#00aaff';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#00ccff';
    ctx.font = 'bold 72px monospace';
    ctx.fillText('2045', cx, cy - 60);

    ctx.shadowBlur = 10;
    ctx.fillStyle = '#0088cc';
    ctx.font = '16px monospace';
    ctx.fillText('STELLAR ASSAULT', cx, cy - 20);

    // Blinking start
    ctx.shadowBlur = 0;
    if (Math.floor(this.time * 2) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px monospace';
      ctx.fillText(this.input.isMobile ? 'TAP TO START' : 'PRESS SPACE TO START', cx, cy + 40);
    }

    // Controls
    ctx.fillStyle = '#556688';
    ctx.font = '12px monospace';
    if (this.input.isMobile) {
      ctx.fillText('DRAG - MOVE  |  AUTO SHOOT', cx, cy + 90);
      ctx.fillText('B BUTTON - BOMB', cx, cy + 108);
      ctx.fillText('F BUTTON - FOCUS (SLOW + SMALL HIT)', cx, cy + 126);
    } else {
      ctx.fillText('WASD / ARROWS - MOVE', cx, cy + 90);
      ctx.fillText('X - BOMB  |  SHIFT - FOCUS', cx, cy + 108);
      ctx.fillText('P / ESC - PAUSE  |  AUTO SHOOT', cx, cy + 126);
    }

    // Scoreboard
    if (this.scoreBoard.length > 0) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('─── TOP SCORES ───', cx, cy + 160);

      const maxShow = Math.min(this.scoreBoard.length, 5);
      for (let i = 0; i < maxShow; i++) {
        const entry = this.scoreBoard[i];
        const y = cy + 180 + i * 18;
        ctx.fillStyle = i === 0 ? '#ffcc00' : '#99886e';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${(i + 1).toString().padStart(2, ' ')}. ${entry.name}  ${entry.score.toLocaleString().padStart(10, ' ')}  ST${entry.stage}`,
          cx, y
        );
      }
    } else if (this.highScore > 0) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = '14px monospace';
      ctx.fillText(`HIGH SCORE: ${this.highScore.toLocaleString()}`, cx, cy + 165);
    }

    // Sound indicator
    ctx.fillStyle = '#334455';
    ctx.font = '11px monospace';
    ctx.fillText(this.sound.muted ? '[M] SOUND OFF' : '[M] SOUND ON', cx, this.height - 30);

    ctx.restore();
  }

  private renderGameWorld(ctx: CanvasRenderingContext2D) {
    // Items
    for (const item of this.items) {
      if (item.active) drawItem(ctx, item, this.time);
    }

    // Explosions
    for (const exp of this.explosions) {
      drawExplosion(ctx, exp);
    }

    // Particles
    for (const p of this.particles) {
      drawParticle(ctx, p);
    }

    // Bullets
    for (const bullet of this.bullets) {
      if (bullet.active) drawBullet(ctx, bullet, this.time);
    }

    // Enemies
    for (const enemy of this.enemies) {
      if (enemy.active) drawEnemy(ctx, enemy, this.time);
    }

    // Boss
    if (this.boss && this.boss.active) {
      drawBoss(ctx, this.boss, this.time);
    }

    // Player
    if (this.state !== 'gameOver') {
      drawPlayer(ctx, this.player, this.time);
    }

    // Floating texts
    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      const scale = 1 + (1 - alpha) * 0.3;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(ft.x, ft.y);
      ctx.scale(scale, scale);
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    }

    // Debug hitboxes
    if (this.debug.showHitboxes) {
      ctx.save();
      const hitbox = getPlayerHitbox(this.player);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.player.x, this.player.y, this.player.width, this.player.height);
      ctx.strokeStyle = '#ffff00';
      ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      for (const e of this.enemies) {
        if (e.active) { ctx.strokeStyle = '#ff4444'; ctx.strokeRect(e.x, e.y, e.width, e.height); }
      }
      for (const b of this.bullets) {
        if (b.active) { ctx.strokeStyle = b.isPlayer ? '#00ff00' : '#ff6600'; ctx.strokeRect(b.x, b.y, b.width, b.height); }
      }
      if (this.boss?.active) { ctx.strokeStyle = '#ff00ff'; ctx.strokeRect(this.boss.x, this.boss.y, this.boss.width, this.boss.height); }
      for (const i of this.items) {
        if (i.active) { ctx.strokeStyle = '#00ffff'; ctx.strokeRect(i.x, i.y, i.width, i.height); }
      }
      ctx.restore();
    }
  }

  private renderHUD(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Score
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`SCORE ${this.player.score.toLocaleString()}`, 10, 24);

    // Stage
    ctx.textAlign = 'right';
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText(`${this.stageManager.currentStage.name}`, this.width - 10, 20);

    // HP bar
    const hpBarX = 10;
    const hpBarY = 32;
    const hpBarW = 100;
    const hpBarH = 8;
    ctx.fillStyle = '#222';
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
    const hpRatio = this.player.hp / this.player.maxHp;
    const hpColor = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('HP', hpBarX + hpBarW + 5, hpBarY + 8);

    // Bombs
    ctx.fillStyle = '#ff4444';
    ctx.font = '14px monospace';
    for (let i = 0; i < this.player.bombs; i++) {
      ctx.fillText('*', 10 + i * 16, 56);
    }

    // Power level
    ctx.fillStyle = '#00ccff';
    ctx.font = '10px monospace';
    ctx.fillText(`PWR ${this.player.power}/4`, 10, 70);

    // Sound mute indicator / button
    if (this.input.isMobile) {
      const mb = this.input.muteBtn;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = this.sound.muted ? '#ff4444' : '#336';
      ctx.beginPath();
      ctx.arc(mb.x, mb.y, mb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.sound.muted ? 'X' : 'S', mb.x, mb.y);
      ctx.globalAlpha = 1;
    } else {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#555';
      ctx.font = '10px monospace';
      ctx.fillText(this.sound.muted ? 'MUTE [M]' : 'SND [M]', this.width - 10, 34);
    }

    // Combo display
    if (this.comboDisplayTimer > 0 && this.comboCount >= 3) {
      const comboAlpha = Math.min(this.comboDisplayTimer / 0.5, 1.0);
      ctx.save();
      ctx.globalAlpha = comboAlpha;
      ctx.textAlign = 'right';
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = this.comboCount >= 20 ? '#ff4444' : this.comboCount >= 10 ? '#ffaa00' : '#ffff00';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fillText(`${this.comboCount} COMBO`, this.width - 10, 56);
      const mult = this.getComboMultiplier();
      if (mult > 1) {
        ctx.font = '12px monospace';
        ctx.fillText(`x${mult.toFixed(1)}`, this.width - 10, 72);
      }
      ctx.restore();
    }

    // Boss HP bar (top center, stable layer)
    if (this.boss && this.boss.active) {
      const bossBarW = this.width - 80;
      const bossBarX = 40;
      const bossBarY = 82;
      const bossBarH = 8;

      ctx.save();
      // Boss name
      ctx.textAlign = 'center';
      ctx.fillStyle = this.boss.color;
      ctx.font = 'bold 11px monospace';
      ctx.shadowColor = this.boss.color;
      ctx.shadowBlur = 6;
      ctx.fillText(this.boss.name, this.width / 2, bossBarY - 4);
      ctx.shadowBlur = 0;

      // Bar background
      ctx.fillStyle = '#222';
      ctx.fillRect(bossBarX, bossBarY, bossBarW, bossBarH);

      // Bar fill
      const bossHpRatio = Math.max(0, this.boss.hp / this.boss.maxHp);
      const bossHpColor = bossHpRatio > 0.5 ? this.boss.color : bossHpRatio > 0.25 ? '#ffaa00' : '#ff0000';
      ctx.fillStyle = bossHpColor;
      ctx.fillRect(bossBarX, bossBarY, bossBarW * bossHpRatio, bossBarH);

      // Bar border
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(bossBarX, bossBarY, bossBarW, bossBarH);
      ctx.restore();
    }

    ctx.restore();
  }

  private renderEnterName(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    ctx.save();
    ctx.textAlign = 'center';

    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('NEW HIGH SCORE!', cx, this.height / 2 - 80);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px monospace';
    ctx.fillText(`${this.player.score.toLocaleString()}`, cx, this.height / 2 - 50);

    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
    ctx.fillText('ENTER YOUR NAME', cx, this.height / 2 - 15);

    // Draw 3 letter slots
    const slotW = 40;
    const slotGap = 10;
    const startX = cx - (slotW * 3 + slotGap * 2) / 2;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (slotW + slotGap);
      const y = this.height / 2 + 10;
      const letter = String.fromCharCode(65 + this.nameChars[i]);
      const isActive = i === this.namePos;

      // Slot background
      ctx.fillStyle = isActive ? '#003366' : '#111122';
      ctx.fillRect(x, y, slotW, 50);
      ctx.strokeStyle = isActive ? '#00ccff' : '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, slotW, 50);

      // Arrow hints
      if (isActive) {
        ctx.fillStyle = '#00ccff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▲', x + slotW / 2, y - 4);
        ctx.fillText('▼', x + slotW / 2, y + 64);
      }

      // Letter
      ctx.fillStyle = isActive ? '#00ccff' : '#ffffff';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(letter, x + slotW / 2, y + 37);
    }

    // Instructions
    ctx.fillStyle = '#556';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    if (this.input.isMobile) {
      ctx.fillText('TAP=CHANGE  DOUBLE TAP=NEXT', cx, this.height / 2 + 90);
      ctx.fillText('OR DRAG UP/DOWN & LEFT/RIGHT', cx, this.height / 2 + 106);
    } else {
      ctx.fillText('↑↓ CHANGE  ←→ MOVE  SPACE CONFIRM', cx, this.height / 2 + 95);
    }

    ctx.restore();
  }

  private renderPause(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ccff';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('PAUSED', this.width / 2, this.height / 2 - 20);

    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
    ctx.fillText('Press P or ESC to resume', this.width / 2, this.height / 2 + 20);
  }

  private renderStageClear(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 32px monospace';
    ctx.fillText('STAGE CLEAR', this.width / 2, this.height / 2 - 30);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText(`SCORE: ${this.player.score.toLocaleString()}`, this.width / 2, this.height / 2 + 10);

    // Stage clear rewards display
    if (this.stageTransitionTimer > 1.0) {
      ctx.fillStyle = '#00ccff';
      ctx.font = '12px monospace';
      ctx.fillText('+1 HP  +1 BOMB', this.width / 2, this.height / 2 + 35);
    }

    if (this.stageTransitionTimer > 1.5) {
      ctx.fillStyle = '#888';
      ctx.font = '14px monospace';
      ctx.fillText('NEXT STAGE...', this.width / 2, this.height / 2 + 60);
    }
  }

  private renderGameOver(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 40px monospace';
    ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 50);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px monospace';
    ctx.fillText(`SCORE: ${this.player.score.toLocaleString()}`, this.width / 2, this.height / 2);

    if (this.player.score >= this.highScore && this.highScore > 0) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = '14px monospace';
      ctx.fillText('NEW HIGH SCORE!', this.width / 2, this.height / 2 + 25);
    }

    if (Math.floor(this.time * 2) % 2 === 0) {
      ctx.fillStyle = '#888';
      ctx.font = '14px monospace';
      if (this.input.isMobile) {
        ctx.fillText('TAP TO RETRY', this.width / 2, this.height / 2 + 60);
        ctx.fillText('DOUBLE TAP FOR MENU', this.width / 2, this.height / 2 + 80);
      } else {
        ctx.fillText('PRESS SPACE TO RETRY', this.width / 2, this.height / 2 + 60);
        ctx.fillText('PRESS ESC FOR MENU', this.width / 2, this.height / 2 + 80);
      }
    }
  }

  private renderVictory(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0, 0, 20, 0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    ctx.textAlign = 'center';

    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('MISSION COMPLETE', cx, this.height / 2 - 70);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00ccff';
    ctx.font = '20px monospace';
    ctx.fillText('2045', cx, this.height / 2 - 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px monospace';
    ctx.fillText(`FINAL SCORE: ${this.player.score.toLocaleString()}`, cx, this.height / 2 + 10);

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '12px monospace';
    ctx.fillText('THE NEXUS THREAT HAS BEEN NEUTRALIZED.', cx, this.height / 2 + 45);
    ctx.fillText('HUMANITY IS SAFE... FOR NOW.', cx, this.height / 2 + 63);

    if (Math.floor(this.time * 2) % 2 === 0) {
      ctx.fillStyle = '#888';
      ctx.font = '14px monospace';
      ctx.fillText('PRESS SPACE', cx, this.height / 2 + 100);
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
    cancelAnimationFrame(this.animFrame);
    this.input.destroy();
  }
}
