// ===== BACKGROUND - SCROLLING STARFIELD =====

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
}

export class Background {
  private stars: Star[] = [];
  private nebulas: Nebula[] = [];
  private width: number;
  private height: number;
  private gridOffset = 0;
  private bgGradient: CanvasGradient | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    // Create star layers
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.5 + Math.random() * 2,
        speed: 20 + Math.random() * 80,
        brightness: 0.3 + Math.random() * 0.7,
      });
    }

    // Nebula clouds
    for (let i = 0; i < 3; i++) {
      this.nebulas.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 80 + Math.random() * 120,
        color: ['#001133', '#110033', '#003311'][i],
        speed: 10 + Math.random() * 20,
      });
    }
  }

  update(dt: number, speedMult: number = 1) {
    this.gridOffset = (this.gridOffset + 30 * speedMult * dt) % 40;

    for (const star of this.stars) {
      star.y += star.speed * speedMult * dt;
      if (star.y > this.height) {
        star.y = -2;
        star.x = Math.random() * this.width;
      }
    }

    for (const nebula of this.nebulas) {
      nebula.y += nebula.speed * speedMult * dt;
      if (nebula.y - nebula.radius > this.height) {
        nebula.y = -nebula.radius;
        nebula.x = Math.random() * this.width;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    // Deep space gradient (cached)
    if (!this.bgGradient) {
      this.bgGradient = ctx.createLinearGradient(0, 0, 0, this.height);
      this.bgGradient.addColorStop(0, '#000011');
      this.bgGradient.addColorStop(0.5, '#000522');
      this.bgGradient.addColorStop(1, '#010115');
    }
    ctx.fillStyle = this.bgGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Nebulas (simple filled circles — no gradient per frame)
    for (const nebula of this.nebulas) {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = nebula.color;
      ctx.beginPath();
      ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Grid lines (futuristic) — batch into single path
    ctx.strokeStyle = 'rgba(0, 80, 180, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = this.gridOffset; y < this.height; y += 40) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    for (let x = 0; x < this.width; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    ctx.stroke();

    // Stars (no shadowBlur — use colored rects for glow effect)
    for (const star of this.stars) {
      const alpha = star.brightness * (0.7 + 0.3 * Math.sin(time * 2 + star.x));
      // Glow layer (larger, dimmer)
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(star.x - star.size * 0.5, star.y - star.size * 0.5, star.size * 2, star.size * 2);
      // Core (bright white)
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.bgGradient = null; // invalidate cached gradient
  }
}
