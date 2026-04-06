// ===== RENDERER =====
// Extracted from GameLoop.ts for maintainability.
// All rendering methods read from Game state but never mutate it.

import type { Game } from './GameLoop';
import { drawPlayer, getPlayerHitbox } from '../entities/Player';
import { drawEnemy } from '../entities/Enemy';
import { drawBoss } from '../entities/Boss';
import { drawBullet } from '../entities/Bullet';
import { drawItem } from '../entities/Item';
import { drawExplosion, drawParticle } from '../effects/Explosion';

export function render(game: Game) {
  const ctx = game.ctx;

  // Clear canvas completely to prevent ghosting/flicker
  ctx.clearRect(0, 0, game.width, game.height);

  // === Shaken layer: game world only ===
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, game.width, game.height);
  ctx.clip();

  // Screen shake removed — was causing visual jitter

  // Background
  game.bg.draw(ctx, game.time);

  switch (game.state) {
    case 'menu':
      renderMenu(game, ctx);
      break;
    case 'devSelect':
      renderDevSelect(game, ctx);
      break;
    case 'playing':
    case 'paused':
    case 'stageClear':
    case 'gameOver':
    case 'victory':
    case 'enterName':
      renderGameWorld(game, ctx);
      break;
  }

  // Hit flash: brief red overlay when player takes damage
  if (game.screenFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.4, game.screenFlash);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, game.width, game.height);
    ctx.restore();
  }

  // Bomb shockwave effect
  if (game.bombActive) {
    const progress = 1 - game.bombTimer / 0.8; // 0 → 1
    const px = game.player.x + game.player.width / 2;
    const py = game.player.y + game.player.height / 2;
    const maxR = Math.max(game.width, game.height);
    const radius = progress * maxR;

    // Expanding shockwave ring
    ctx.save();
    const ringAlpha = Math.max(0, 1 - progress) * 0.7;
    ctx.globalAlpha = ringAlpha;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6 * (1 - progress) + 1;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Second inner ring (cyan)
    ctx.globalAlpha = ringAlpha * 0.6;
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 3 * (1 - progress) + 1;
    ctx.beginPath();
    ctx.arc(px, py, radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Screen-wide flash (quick, fades fast)
    if (progress < 0.15) {
      ctx.globalAlpha = (0.15 - progress) * 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-10, -10, game.width + 20, game.height + 20);
    }
    ctx.restore();
  }

  ctx.restore();
  // === End shaken layer ===

  // === Stable UI layer: no shake applied ===
  switch (game.state) {
    case 'playing':
    case 'paused':
      renderHUD(game, ctx);
      if (game.state === 'paused') renderPause(game, ctx);
      break;
    case 'stageClear':
      renderHUD(game, ctx);
      renderStageClear(game, ctx);
      break;
    case 'gameOver':
      renderHUD(game, ctx);
      renderGameOver(game, ctx);
      break;
    case 'victory':
      renderHUD(game, ctx);
      renderVictory(game, ctx);
      break;
    case 'enterName':
      renderHUD(game, ctx);
      renderEnterName(game, ctx);
      break;
  }

  // Mobile virtual controls
  if (game.state === 'playing') {
    game.input.drawMobileUI(ctx, game.time);
    // Mobile pause button
    if (game.input.isMobile) {
      const pb = game.input.pauseBtn;
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#334466';
      ctx.beginPath();
      ctx.arc(pb.x, pb.y, pb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6688aa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pb.x, pb.y, pb.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('II', pb.x, pb.y);
      ctx.globalAlpha = 1;
    }
  }

  // Debug info
  if (game.debug.showFps) {
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`FPS: ${game.fps}`, 5, game.height - 5);
  }
  if (game.debug.showObjectCount) {
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`B:${game.bullets.length} E:${game.enemies.length} P:${game.particles.length}`, 5, game.height - 18);
  }
}

function renderMenu(game: Game, ctx: CanvasRenderingContext2D) {
  const cx = game.width / 2;
  const cy = game.height / 2;

  ctx.save();
  ctx.textAlign = 'center';

  ctx.shadowColor = '#00aaff';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#00ccff';
  ctx.font = 'bold 72px monospace';
  ctx.fillText('2045', cx, cy - 60);

  ctx.shadowBlur = 10;
  ctx.fillStyle = '#0088cc';
  ctx.font = '16px monospace';
  ctx.fillText('STELLAR ASSAULT', cx, cy - 20);

  ctx.shadowBlur = 0;
  if (Math.floor(game.time * 2) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px monospace';
    ctx.fillText(game.input.isMobile ? 'TAP TO START' : 'PRESS SPACE TO START', cx, cy + 40);
  }

  ctx.fillStyle = '#556688';
  ctx.font = '12px monospace';
  if (game.input.isMobile) {
    ctx.fillText('DRAG - MOVE  |  AUTO SHOOT', cx, cy + 90);
    ctx.fillText('B BUTTON - BOMB', cx, cy + 108);
    ctx.fillText('F BUTTON - FOCUS (SLOW + SMALL HIT)', cx, cy + 126);
  } else {
    ctx.fillText('WASD / ARROWS - MOVE', cx, cy + 90);
    ctx.fillText('X - BOMB  |  SHIFT - FOCUS', cx, cy + 108);
    ctx.fillText('P / ESC - PAUSE  |  AUTO SHOOT', cx, cy + 126);
  }

  if (game.scoreBoard.length > 0) {
    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('─── TOP SCORES ───', cx, cy + 160);

    const maxShow = Math.min(game.scoreBoard.length, 5);
    for (let i = 0; i < maxShow; i++) {
      const entry = game.scoreBoard[i];
      const y = cy + 180 + i * 18;
      ctx.fillStyle = i === 0 ? '#ffcc00' : '#99886e';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${(i + 1).toString().padStart(2, ' ')}. ${entry.name}  ${entry.score.toLocaleString().padStart(10, ' ')}  ST${entry.stage}`,
        cx, y
      );
    }
  } else if (game.highScore > 0) {
    ctx.fillStyle = '#ffaa00';
    ctx.font = '14px monospace';
    ctx.fillText(`HIGH SCORE: ${game.highScore.toLocaleString()}`, cx, cy + 165);
  }

  // Volume control
  ctx.fillStyle = '#334455';
  ctx.font = '11px monospace';
  ctx.fillText(game.sound.muted ? '[M] SOUND OFF' : '[M] SOUND ON', cx, game.height - 45);

  // Volume bar
  const volPct = Math.round(game.sound.volume * 100);
  ctx.fillStyle = '#334455';
  ctx.fillText(`[-/+] VOL: ${volPct}%`, cx, game.height - 28);
  const barW = 100;
  const barH = 6;
  const barX = cx - barW / 2;
  const barY = game.height - 20;
  ctx.fillStyle = '#222';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = game.sound.muted ? '#555' : '#00aaff';
  ctx.fillRect(barX, barY, barW * game.sound.volume, barH);
  ctx.strokeStyle = '#446';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.restore();
}

function renderDevSelect(game: Game, ctx: CanvasRenderingContext2D) {
  const cx = game.width / 2;
  const total = game.stageManager.totalStages;

  ctx.save();
  ctx.textAlign = 'center';

  // Dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, game.width, game.height);

  // Title
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('DEV MODE', cx, 50);

  ctx.fillStyle = '#ff8844';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('STAGE SELECT', cx, 78);

  // Stage list
  const startY = 110;
  const lineH = 28;
  for (let i = 0; i < total; i++) {
    const y = startY + i * lineH;
    const selected = i === game.devSelectedStage;

    if (selected) {
      ctx.fillStyle = 'rgba(255, 68, 68, 0.2)';
      ctx.fillRect(30, y - 16, game.width - 60, lineH - 2);
    }

    ctx.fillStyle = selected ? '#ff4444' : '#888888';
    ctx.font = selected ? 'bold 14px monospace' : '13px monospace';

    const stage = game.stageManager.getStageInfo(i);
    const name = stage ? `${stage.name} - ${stage.subtitle}` : `STAGE ${i + 1}`;
    const prefix = selected ? '> ' : '  ';
    ctx.fillText(`${prefix}${name}`, cx, y);
  }

  // Controls hint
  const bottomY = game.height - 50;
  ctx.fillStyle = '#556688';
  ctx.font = '11px monospace';
  ctx.fillText('UP/DOWN - SELECT  |  SPACE - START  |  ESC - BACK', cx, bottomY);
  ctx.fillText('1-0 - QUICK SELECT', cx, bottomY + 16);

  ctx.restore();
}

function renderGameWorld(game: Game, ctx: CanvasRenderingContext2D) {
  for (const item of game.items) {
    if (item.active) drawItem(ctx, item, game.time);
  }
  for (const exp of game.explosions) {
    drawExplosion(ctx, exp);
  }
  for (const p of game.particles) {
    drawParticle(ctx, p);
  }
  for (const bullet of game.bullets) {
    if (bullet.active) drawBullet(ctx, bullet, game.time);
  }
  for (const enemy of game.enemies) {
    if (enemy.active) drawEnemy(ctx, enemy, game.time);
  }
  if (game.boss && game.boss.active) {
    drawBoss(ctx, game.boss, game.time);
  }
  if (game.state !== 'gameOver') {
    drawPlayer(ctx, game.player, game.time);
  }

  // Floating texts
  for (const ft of game.floatingTexts) {
    const alpha = ft.life / ft.maxLife;
    const scale = 1 + (1 - alpha) * 0.3;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(ft.x, ft.y);
    ctx.scale(scale, scale);
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, 0, 0);
    ctx.restore();
  }

  // Boss warning overlay
  if (game.bossWarningTimer > 0) {
    const t = game.bossWarningTimer;
    const flash = Math.sin(game.time * 12) * 0.5 + 0.5;
    ctx.save();
    // Red vignette
    ctx.globalAlpha = Math.min(t * 0.4, 0.3) * flash;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, game.width, game.height);
    // WARNING text
    ctx.globalAlpha = Math.min(t, 1.0);
    ctx.fillStyle = '#ff2222';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const shake = t > 1.5 ? (Math.random() - 0.5) * 4 : 0;
    ctx.fillText('⚠ WARNING ⚠', game.width / 2 + shake, game.height * 0.43 + shake);
    // Boss name subtitle
    if (game.boss && t < 2.0) {
      ctx.globalAlpha = Math.min((2.0 - t) * 2, 1.0) * 0.9;
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#ffaa00';
      ctx.fillText(game.boss.name, game.width / 2, game.height * 0.43 + 45);
    }
    ctx.restore();
  }

  // Debug hitboxes
  if (game.debug.showHitboxes) {
    ctx.save();
    const hitbox = getPlayerHitbox(game.player);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.strokeRect(game.player.x, game.player.y, game.player.width, game.player.height);
    ctx.strokeStyle = '#ffff00';
    ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
    for (const e of game.enemies) {
      if (e.active) { ctx.strokeStyle = '#ff4444'; ctx.strokeRect(e.x, e.y, e.width, e.height); }
    }
    for (const b of game.bullets) {
      if (b.active) { ctx.strokeStyle = b.isPlayer ? '#00ff00' : '#ff6600'; ctx.strokeRect(b.x, b.y, b.width, b.height); }
    }
    if (game.boss?.active) { ctx.strokeStyle = '#ff00ff'; ctx.strokeRect(game.boss.x, game.boss.y, game.boss.width, game.boss.height); }
    for (const i of game.items) {
      if (i.active) { ctx.strokeStyle = '#00ffff'; ctx.strokeRect(i.x, i.y, i.width, i.height); }
    }
    ctx.restore();
  }
}

function renderHUD(game: Game, ctx: CanvasRenderingContext2D) {
  ctx.save();

  // Score
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`SCORE ${game.player.score.toLocaleString()}`, 10, 24);

  // Stage
  ctx.textAlign = 'right';
  ctx.fillStyle = '#888';
  ctx.font = '12px monospace';
  ctx.fillText(`${game.stageManager.currentStage.name}`, game.width - 10, 20);

  // HP bar
  const hpRatio = game.player.hp / game.player.maxHp;
  const isLowHp = hpRatio <= 0.3;
  ctx.fillStyle = '#aaa';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('HP', 10, 40);
  // Bar background
  ctx.fillStyle = '#333';
  ctx.fillRect(32, 30, 90, 14);
  // Bar fill
  const hpColor = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.3 ? '#ffaa00' : '#ff4444';
  ctx.fillStyle = hpColor;
  ctx.fillRect(32, 30, 90 * hpRatio, 14);
  // Bar border
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.strokeRect(32, 30, 90, 14);
  // HP text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${game.player.hp}/${game.player.maxHp}`, 77, 42);
  // Low HP warning
  if (isLowHp && Math.floor(game.time * 4) % 2 === 0) {
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DANGER!', 128, 42);
  }

  // Bombs
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ff4444';
  ctx.font = '16px monospace';
  for (let i = 0; i < game.player.bombs; i++) {
    ctx.fillText('*', 10 + i * 18, 60);
  }

  // Power level
  ctx.fillStyle = '#00ccff';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`PWR ${Math.max(1, game.player.power)}/5`, 10, 74);

  // Sound mute indicator / button
  if (game.input.isMobile) {
    const mb = game.input.muteBtn;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = game.sound.muted ? '#ff4444' : '#334466';
    ctx.beginPath();
    ctx.arc(mb.x, mb.y, mb.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = game.sound.muted ? '#ff6666' : '#6688aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mb.x, mb.y, mb.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.sound.muted ? 'X' : 'S', mb.x, mb.y);
    ctx.globalAlpha = 1;
  } else {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.fillText(game.sound.muted ? 'MUTE [M]' : 'SND [M]', game.width - 10, 34);
  }

  // Combo display
  if (game.comboDisplayTimer > 0 && game.comboCount >= 3) {
    const comboAlpha = Math.min(game.comboDisplayTimer / 0.5, 1.0);
    ctx.save();
    ctx.globalAlpha = comboAlpha;
    ctx.textAlign = 'right';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = game.comboCount >= 20 ? '#ff4444' : game.comboCount >= 10 ? '#ffaa00' : '#ffff00';
    ctx.fillText(`${game.comboCount} COMBO`, game.width - 10, 56);
    const mult = game.getComboMultiplier();
    if (mult > 1) {
      ctx.font = '12px monospace';
      ctx.fillText(`x${mult.toFixed(1)}`, game.width - 10, 72);
    }
    ctx.restore();
  }

  // Boss HP bar
  if (game.boss && game.boss.active) {
    const bossBarW = game.width - 80;
    const bossBarX = 40;
    const bossBarY = 96;
    const bossBarH = 8;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = game.boss.color;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(game.boss.name, game.width / 2, bossBarY - 4);

    ctx.fillStyle = '#222';
    ctx.fillRect(bossBarX, bossBarY, bossBarW, bossBarH);

    const bossHpRatio = Math.max(0, game.boss.hp / game.boss.maxHp);
    const bossHpColor = bossHpRatio > 0.5 ? game.boss.color : bossHpRatio > 0.25 ? '#ffaa00' : '#ff0000';
    ctx.fillStyle = bossHpColor;
    ctx.fillRect(bossBarX, bossBarY, bossBarW * bossHpRatio, bossBarH);

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(bossBarX, bossBarY, bossBarW, bossBarH);
    ctx.restore();
  }

  ctx.restore();
}

function renderEnterName(game: Game, ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, game.width, game.height);

  const cx = game.width / 2;
  ctx.save();
  ctx.textAlign = 'center';

  ctx.shadowColor = '#ffaa00';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('NEW HIGH SCORE!', cx, game.height / 2 - 80);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.fillText(`${game.player.score.toLocaleString()}`, cx, game.height / 2 - 50);

  ctx.fillStyle = '#888';
  ctx.font = '14px monospace';
  ctx.fillText('ENTER YOUR NAME', cx, game.height / 2 - 15);

  const slotW = 40;
  const slotGap = 10;
  const startX = cx - (slotW * 3 + slotGap * 2) / 2;

  for (let i = 0; i < 3; i++) {
    const x = startX + i * (slotW + slotGap);
    const y = game.height / 2 + 10;
    const letter = String.fromCharCode(65 + game.nameChars[i]);
    const isActive = i === game.namePos;

    ctx.fillStyle = isActive ? '#003366' : '#111122';
    ctx.fillRect(x, y, slotW, 50);
    ctx.strokeStyle = isActive ? '#00ccff' : '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, slotW, 50);

    if (isActive) {
      ctx.fillStyle = '#00ccff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▲', x + slotW / 2, y - 4);
      ctx.fillText('▼', x + slotW / 2, y + 64);
    }

    ctx.fillStyle = isActive ? '#00ccff' : '#ffffff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(letter, x + slotW / 2, y + 37);
  }

  ctx.fillStyle = '#556';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  if (game.input.isMobile) {
    ctx.fillText('TAP=CHANGE  DOUBLE TAP=NEXT', cx, game.height / 2 + 90);
    ctx.fillText('OR DRAG UP/DOWN & LEFT/RIGHT', cx, game.height / 2 + 106);
  } else {
    ctx.fillText('↑↓ CHANGE  ←→ MOVE  SPACE CONFIRM', cx, game.height / 2 + 95);
  }

  ctx.restore();
}

function renderPause(game: Game, ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, game.width, game.height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#00ccff';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('PAUSED', game.width / 2, game.height / 2 - 20);

  ctx.fillStyle = '#888';
  ctx.font = '14px monospace';
  if (game.input.isMobile) {
    ctx.fillText('Tap to resume', game.width / 2, game.height / 2 + 20);
  } else {
    ctx.fillText('Press P or ESC to resume', game.width / 2, game.height / 2 + 20);
  }

  if (game.input.isMobile) {
    // Quit button for mobile
    const qx = game.width / 2;
    const qy = game.height / 2 + 110;
    ctx.fillStyle = 'rgba(255, 50, 50, 0.3)';
    ctx.fillRect(qx - 60, qy - 15, 120, 30);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.strokeRect(qx - 60, qy - 15, 120, 30);
    ctx.fillStyle = '#ff6666';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('QUIT TO MENU', qx, qy + 5);
  } else {
    ctx.fillStyle = '#ff6666';
    ctx.font = '13px monospace';
    ctx.fillText('Q - QUIT TO MENU', game.width / 2, game.height / 2 + 44);
  }

  // Volume control in pause menu
  const cx = game.width / 2;
  const volPct = Math.round(game.sound.volume * 100);
  ctx.fillStyle = '#667';
  ctx.font = '12px monospace';
  ctx.fillText(`[M] ${game.sound.muted ? 'UNMUTE' : 'MUTE'}   [-/+] VOL: ${volPct}%`, cx, game.height / 2 + 60);
  const barW = 120;
  const barH = 8;
  const barX = cx - barW / 2;
  const barY = game.height / 2 + 70;
  ctx.fillStyle = '#222';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = game.sound.muted ? '#555' : '#00aaff';
  ctx.fillRect(barX, barY, barW * game.sound.volume, barH);
  ctx.strokeStyle = '#446';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);
  ctx.restore();
}

function renderStageClear(game: Game, ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, game.width, game.height);

  ctx.textAlign = 'center';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 32px monospace';
  ctx.fillText('STAGE CLEAR', game.width / 2, game.height / 2 - 40);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#88ccaa';
  ctx.font = '14px monospace';
  const stageName = `${game.stageManager.currentStage.name} — ${game.stageManager.currentStage.subtitle}`;
  ctx.fillText(stageName, game.width / 2, game.height / 2 - 12);

  ctx.fillStyle = '#ffffff';
  ctx.font = '16px monospace';
  ctx.fillText(`SCORE: ${game.player.score.toLocaleString()}`, game.width / 2, game.height / 2 + 10);

  if (game.stageTransitionTimer > 1.0) {
    const clearBonus = 5000 * (game.stageManager.currentStageIndex + 1);
    ctx.fillStyle = '#ffcc00';
    ctx.font = '12px monospace';
    ctx.fillText(`CLEAR BONUS +${clearBonus.toLocaleString()}`, game.width / 2, game.height / 2 + 32);
    ctx.fillStyle = '#00ccff';
    ctx.fillText('+1 BOMB', game.width / 2, game.height / 2 + 48);
    ctx.fillStyle = '#ff66aa';
    ctx.fillText('+4 HP', game.width / 2, game.height / 2 + 64);
  }

  if (game.stageTransitionTimer > 1.5) {
    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
    ctx.fillText('NEXT STAGE...', game.width / 2, game.height / 2 + 86);
  }
  ctx.restore();
}

function renderGameOver(game: Game, ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, game.width, game.height);

  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 40px monospace';
  ctx.fillText('GAME OVER', game.width / 2, game.height / 2 - 50);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px monospace';
  ctx.fillText(`SCORE: ${game.player.score.toLocaleString()}`, game.width / 2, game.height / 2);

  if (game.player.score >= game.highScore && game.highScore > 0) {
    ctx.fillStyle = '#ffaa00';
    ctx.font = '14px monospace';
    ctx.fillText('NEW HIGH SCORE!', game.width / 2, game.height / 2 + 25);
  }

  if (Math.floor(game.time * 2) % 2 === 0) {
    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
    if (game.input.isMobile) {
      ctx.fillText('TAP TO CONTINUE', game.width / 2, game.height / 2 + 60);
    } else {
      ctx.fillText('PRESS SPACE TO CONTINUE', game.width / 2, game.height / 2 + 60);
    }
  }
  ctx.restore();
}

function renderVictory(game: Game, ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 20, 0.85)';
  ctx.fillRect(0, 0, game.width, game.height);

  const cx = game.width / 2;
  ctx.textAlign = 'center';

  ctx.shadowColor = '#ffaa00';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('MISSION COMPLETE', cx, game.height / 2 - 70);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#00ccff';
  ctx.font = '20px monospace';
  ctx.fillText('2045', cx, game.height / 2 - 30);

  ctx.fillStyle = '#ffffff';
  ctx.font = '18px monospace';
  ctx.fillText(`FINAL SCORE: ${game.player.score.toLocaleString()}`, cx, game.height / 2 + 10);

  ctx.fillStyle = '#aaaaaa';
  ctx.font = '12px monospace';
  const victoryLines = game.stageManager.currentStage.victoryText ?? [
    'THE NEXUS THREAT HAS BEEN NEUTRALIZED.',
    'HUMANITY IS SAFE... FOR NOW.',
  ];
  for (let i = 0; i < victoryLines.length; i++) {
    ctx.fillText(victoryLines[i], cx, game.height / 2 + 45 + i * 18);
  }

  if (Math.floor(game.time * 2) % 2 === 0) {
    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
    ctx.fillText(game.input.isMobile ? 'TAP TO CONTINUE' : 'PRESS SPACE', cx, game.height / 2 + 100);
  }
  ctx.restore();
}
