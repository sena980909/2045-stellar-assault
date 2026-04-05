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
    // Deep space gradient
    const bg = ctx.createLinearGradient(0, 0, 0, this.height);
    bg.addColorStop(0, '#000011');
    bg.addColorStop(0.5, '#000522');
    bg.addColorStop(1, '#010115');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // Nebulas
    for (const nebula of this.nebulas) {
      const grad = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.radius);
      grad.addColorStop(0, nebula.color + '44');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grid lines (futuristic)
    ctx.strokeStyle = 'rgba(0, 80, 180, 0.07)';
    ctx.lineWidth = 1;
    for (let y = this.gridOffset; y < this.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    for (let x = 0; x < this.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    // Stars
    for (const star of this.stars) {
      ctx.save();
      ctx.globalAlpha = star.brightness * (0.7 + 0.3 * Math.sin(time * 2 + star.x));
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#4488ff';
      ctx.shadowBlur = star.size * 2;
      ctx.fillRect(star.x, star.y, star.size, star.size);
      ctx.restore();
    }
    ctx.restore();
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}
