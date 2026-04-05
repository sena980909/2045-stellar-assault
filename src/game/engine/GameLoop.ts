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
    this.stageManager.reset();
  }

  // ===== MENU =====
  private updateMenu(dt: number) {
    this.bg.update(dt);
    if (this.input.wasPressed('Space') || this.input.wasPressed('Enter')) {
      this.sound.init();
      this.stageManager.restartFromBeginning();
      this.startGame();
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
    if (this.input.isBombing && this.player.bombs > 0 && !this.bombActive) {
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
          this.player.score += e.score;
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
      this.player.score += this.boss.score;
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
            this.player.score += enemy.score;
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
  private updateGameOver() {
    if (this.input.wasPressed('Space') || this.input.wasPressed('Enter')) {
      this.stageManager.restartFromBeginning();
      this.startGame();
    }
    if (this.input.wasPressed('Escape')) {
      this.clearAllObjects();
      this.state = 'menu';
    }
  }

  // ===== VICTORY =====
  private updateVictory() {
    if (this.input.wasPressed('Space') || this.input.wasPressed('Enter')) {
      this.clearAllObjects();
      this.state = 'menu';
    }
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
    ctx.save();

    // Screen shake
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
        this.renderGame(ctx);
        if (this.state === 'paused') this.renderPause(ctx);
        break;
      case 'stageClear':
        this.renderGame(ctx);
        this.renderStageClear(ctx);
        break;
      case 'gameOver':
        this.renderGame(ctx);
        this.renderGameOver(ctx);
        break;
      case 'victory':
        this.renderGame(ctx);
        this.renderVictory(ctx);
        break;
    }

    // Bomb flash
    if (this.bombActive) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.bombTimer * 0.5})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Debug info
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

    ctx.restore();
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
      ctx.fillText('PRESS SPACE TO START', cx, cy + 40);
    }

    // Controls
    ctx.fillStyle = '#556688';
    ctx.font = '12px monospace';
    ctx.fillText('WASD / ARROWS - MOVE', cx, cy + 90);
    ctx.fillText('X - BOMB  |  SHIFT - FOCUS', cx, cy + 108);
    ctx.fillText('P / ESC - PAUSE  |  AUTO SHOOT', cx, cy + 126);

    // High score
    if (this.highScore > 0) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = '14px monospace';
      ctx.fillText(`HIGH SCORE: ${this.highScore.toLocaleString()}`, cx, cy + 165);
    }

    // Mobile hint
    ctx.fillStyle = '#334455';
    ctx.font = '11px monospace';
    ctx.fillText('TOUCH TO PLAY ON MOBILE', cx, this.height - 30);

    ctx.restore();
  }

  private renderGame(ctx: CanvasRenderingContext2D) {
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
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // Debug hitboxes
    if (this.debug.showHitboxes) {
      const hitbox = getPlayerHitbox(this.player);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.player.x, this.player.y, this.player.width, this.player.height);
      // Actual collision hitbox in yellow
      ctx.strokeStyle = '#ffff00';
      ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      for (const e of this.enemies) {
        if (e.active) ctx.strokeRect(e.x, e.y, e.width, e.height);
      }
      for (const b of this.bullets) {
        if (b.active) ctx.strokeRect(b.x, b.y, b.width, b.height);
      }
      if (this.boss?.active) ctx.strokeRect(this.boss.x, this.boss.y, this.boss.width, this.boss.height);
      for (const i of this.items) {
        if (i.active) ctx.strokeRect(i.x, i.y, i.width, i.height);
      }
    }

    // HUD
    this.renderHUD(ctx);
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
      ctx.fillText('PRESS SPACE TO RETRY', this.width / 2, this.height / 2 + 60);
      ctx.fillText('PRESS ESC FOR MENU', this.width / 2, this.height / 2 + 80);
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
