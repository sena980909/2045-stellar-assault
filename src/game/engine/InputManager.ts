// ===== INPUT MANAGER =====

interface TouchJoystick {
  id: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export class InputManager {
  keys: Set<string> = new Set();
  justPressed: Set<string> = new Set();
  private prevKeys: Set<string> = new Set();
  private canvas: HTMLCanvasElement | null = null;

  // Touch state
  private joystick: TouchJoystick | null = null;
  private touchMoveX = 0;
  private touchMoveY = 0;
  isMobile = false;

  // Virtual button states
  touchBomb = false;
  touchFocus = false;
  private touchTap = false; // for menu start

  // Store bound handlers for cleanup
  private onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private onKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private onBlur: (() => void) | null = null;
  private onFocus: (() => void) | null = null;
  private onTouchStart: ((e: TouchEvent) => void) | null = null;
  private onTouchMove: ((e: TouchEvent) => void) | null = null;
  private onTouchEnd: ((e: TouchEvent) => void) | null = null;

  // Button layout (in game coordinates 400x700)
  readonly bombBtn = { x: 400 - 65, y: 700 - 65, r: 28 };
  readonly focusBtn = { x: 400 - 65, y: 700 - 130, r: 24 };
  readonly joystickArea = { maxX: 200 }; // left half for joystick

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    this.onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      this.keys.add(e.code);
    };
    this.onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    this.onBlur = () => {
      this.keys.clear();
    };
    this.onFocus = () => {
      this.keys.clear();
      this.justPressed.clear();
      this.prevKeys.clear();
    };

    this.onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = 400 / rect.width;
      const scaleY = 700 / rect.height;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const gx = (touch.clientX - rect.left) * scaleX;
        const gy = (touch.clientY - rect.top) * scaleY;

        // Check bomb button
        if (this.hitCircle(gx, gy, this.bombBtn)) {
          this.touchBomb = true;
          continue;
        }

        // Check focus button
        if (this.hitCircle(gx, gy, this.focusBtn)) {
          this.touchFocus = true;
          continue;
        }

        // Joystick (left side or anywhere not on buttons)
        if (!this.joystick) {
          this.joystick = {
            id: touch.identifier,
            startX: gx,
            startY: gy,
            currentX: gx,
            currentY: gy,
          };
        }
      }

      // Tap for menu start
      this.touchTap = true;
    };

    this.onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = 400 / rect.width;
      const scaleY = 700 / rect.height;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const gx = (touch.clientX - rect.left) * scaleX;
        const gy = (touch.clientY - rect.top) * scaleY;

        if (this.joystick && touch.identifier === this.joystick.id) {
          this.joystick.currentX = gx;
          this.joystick.currentY = gy;
        }
      }
    };

    this.onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = 400 / rect.width;
      const scaleY = 700 / rect.height;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const gx = (touch.clientX - rect.left) * scaleX;
        const gy = (touch.clientY - rect.top) * scaleY;

        // Release joystick
        if (this.joystick && touch.identifier === this.joystick.id) {
          this.joystick = null;
          this.touchMoveX = 0;
          this.touchMoveY = 0;
        }

        // Release buttons - check if any remaining touch is on button
        this.touchBomb = false;
        this.touchFocus = false;
        for (let j = 0; j < e.touches.length; j++) {
          const remaining = e.touches[j];
          const rx = (remaining.clientX - rect.left) * scaleX;
          const ry = (remaining.clientY - rect.top) * scaleY;
          if (this.hitCircle(rx, ry, this.bombBtn)) this.touchBomb = true;
          if (this.hitCircle(rx, ry, this.focusBtn)) this.touchFocus = true;
        }
      }
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('focus', this.onFocus);
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
  }

  private hitCircle(x: number, y: number, btn: { x: number; y: number; r: number }): boolean {
    const dx = x - btn.x;
    const dy = y - btn.y;
    return dx * dx + dy * dy <= (btn.r + 10) * (btn.r + 10); // extra padding
  }

  update() {
    this.justPressed.clear();
    for (const key of this.keys) {
      if (!this.prevKeys.has(key)) {
        this.justPressed.add(key);
      }
    }
    this.prevKeys = new Set(this.keys);

    // Update joystick analog values
    if (this.joystick) {
      const dx = this.joystick.currentX - this.joystick.startX;
      const dy = this.joystick.currentY - this.joystick.startY;
      const deadzone = 8;
      this.touchMoveX = Math.abs(dx) > deadzone ? Math.max(-1, Math.min(1, dx / 50)) : 0;
      this.touchMoveY = Math.abs(dy) > deadzone ? Math.max(-1, Math.min(1, dy / 50)) : 0;
    }

    // Handle touch tap as Space press (for menus)
    if (this.touchTap) {
      this.justPressed.add('Space');
      this.touchTap = false;
    }
  }

  isDown(key: string): boolean {
    return this.keys.has(key);
  }

  wasPressed(key: string): boolean {
    return this.justPressed.has(key);
  }

  get moveX(): number {
    let dx = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) dx -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) dx += 1;
    if (this.touchMoveX !== 0) dx = this.touchMoveX;
    return dx;
  }

  get moveY(): number {
    let dy = 0;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) dy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) dy += 1;
    if (this.touchMoveY !== 0) dy = this.touchMoveY;
    return dy;
  }

  get isShooting(): boolean {
    return this.keys.has('Space') || this.keys.has('KeyZ');
  }

  get isBombing(): boolean {
    return this.wasPressed('KeyX') || this.wasPressed('KeyB') || this.touchBomb;
  }

  get isFocused(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchFocus;
  }

  get hasJoystick(): boolean {
    return this.joystick !== null;
  }

  get joystickPos(): { startX: number; startY: number; currentX: number; currentY: number } | null {
    return this.joystick;
  }

  destroy() {
    if (this.onKeyDown) window.removeEventListener('keydown', this.onKeyDown);
    if (this.onKeyUp) window.removeEventListener('keyup', this.onKeyUp);
    if (this.onBlur) window.removeEventListener('blur', this.onBlur);
    if (this.onFocus) window.removeEventListener('focus', this.onFocus);
    if (this.canvas) {
      if (this.onTouchStart) this.canvas.removeEventListener('touchstart', this.onTouchStart);
      if (this.onTouchMove) this.canvas.removeEventListener('touchmove', this.onTouchMove);
      if (this.onTouchEnd) this.canvas.removeEventListener('touchend', this.onTouchEnd);
    }
    this.keys.clear();
    this.justPressed.clear();
    this.prevKeys.clear();
  }

  drawMobileUI(ctx: CanvasRenderingContext2D, time: number) {
    if (!this.isMobile) return;

    ctx.save();

    // === Virtual Joystick ===
    if (this.joystick) {
      // Base circle
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.joystick.startX, this.joystick.startY, 45, 0, Math.PI * 2);
      ctx.fill();

      // Thumb
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#00ccff';
      ctx.beginPath();
      const thumbX = this.joystick.startX + this.touchMoveX * 30;
      const thumbY = this.joystick.startY + this.touchMoveY * 30;
      ctx.arc(thumbX, thumbY, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#00ccff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(thumbX, thumbY, 18, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Hint: show joystick area
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DRAG TO MOVE', 100, 650);
    }

    // === Bomb Button ===
    const bb = this.bombBtn;
    ctx.globalAlpha = this.touchBomb ? 0.7 : 0.3;
    ctx.fillStyle = this.touchBomb ? '#ff4444' : '#441111';
    ctx.beginPath();
    ctx.arc(bb.x, bb.y, bb.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.globalAlpha = this.touchBomb ? 1.0 : 0.5;
    ctx.beginPath();
    ctx.arc(bb.x, bb.y, bb.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = this.touchBomb ? 1.0 : 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', bb.x, bb.y);

    // === Focus Button ===
    const fb = this.focusBtn;
    ctx.globalAlpha = this.touchFocus ? 0.7 : 0.25;
    ctx.fillStyle = this.touchFocus ? '#00ccff' : '#112233';
    ctx.beginPath();
    ctx.arc(fb.x, fb.y, fb.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = this.touchFocus ? 1.0 : 0.4;
    ctx.beginPath();
    ctx.arc(fb.x, fb.y, fb.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = this.touchFocus ? 1.0 : 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F', fb.x, fb.y);

    ctx.restore();
  }
}
