// ===== INPUT MANAGER =====

export class InputManager {
  keys: Set<string> = new Set();
  private touchStartPos: { x: number; y: number } | null = null;
  private touchCurrentPos: { x: number; y: number } | null = null;
  private canvas: HTMLCanvasElement | null = null;
  justPressed: Set<string> = new Set();
  private prevKeys: Set<string> = new Set();

  // Store bound handlers for cleanup
  private onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private onKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private onBlur: (() => void) | null = null;
  private onFocus: (() => void) | null = null;
  private onTouchStart: ((e: TouchEvent) => void) | null = null;
  private onTouchMove: ((e: TouchEvent) => void) | null = null;
  private onTouchEnd: ((e: TouchEvent) => void) | null = null;

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

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
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      this.touchStartPos = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
      this.touchCurrentPos = { ...this.touchStartPos };
      this.keys.add('Space');
    };

    this.onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      this.touchCurrentPos = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    };

    this.onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      this.touchStartPos = null;
      this.touchCurrentPos = null;
      this.keys.delete('Space');
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('focus', this.onFocus);
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
  }

  update() {
    this.justPressed.clear();
    for (const key of this.keys) {
      if (!this.prevKeys.has(key)) {
        this.justPressed.add(key);
      }
    }
    this.prevKeys = new Set(this.keys);
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

    if (this.touchStartPos && this.touchCurrentPos) {
      const diffX = this.touchCurrentPos.x - this.touchStartPos.x;
      if (Math.abs(diffX) > 10) dx = Math.sign(diffX);
    }

    return dx;
  }

  get moveY(): number {
    let dy = 0;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) dy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) dy += 1;

    if (this.touchStartPos && this.touchCurrentPos) {
      const diffY = this.touchCurrentPos.y - this.touchStartPos.y;
      if (Math.abs(diffY) > 10) dy = Math.sign(diffY);
    }

    return dy;
  }

  get isShooting(): boolean {
    return this.keys.has('Space') || this.keys.has('KeyZ');
  }

  get isBombing(): boolean {
    return this.wasPressed('KeyX') || this.wasPressed('KeyB');
  }

  get isFocused(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
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
}
