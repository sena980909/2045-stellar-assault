// ===== SOUND MANAGER (Web Audio API - Synthesized, SFX Only) =====

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private initialized = false;
  muted = false;

  // Cached explosion buffer
  private explosionBuffer: AudioBuffer | null = null;

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();

      // Compressor to prevent clipping
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -6;
      this.compressor.knee.value = 10;
      this.compressor.ratio.value = 4;
      this.compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.compressor);

      // Pre-generate explosion buffer
      this.explosionBuffer = this.createNoiseBuffer(0.3);

      this.initialized = true;
      try {
        this.muted = localStorage.getItem('2045_muted') === '1';
        if (this.muted && this.masterGain) {
          this.masterGain.gain.value = 0;
        }
      } catch { /* ignore */ }
    } catch {
      console.warn('Web Audio not supported');
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : 0.6;
    try { localStorage.setItem('2045_muted', this.muted ? '1' : '0'); } catch { /* ignore */ }
    return this.muted;
  }

  private ensureContext() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createNoiseBuffer(duration: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const size = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    }
    return buffer;
  }

  // Helper: create oscillator with auto-cleanup
  private playOsc(type: OscillatorType, freq: number, freqEnd: number, vol: number, dur: number, pitchVar = 0) {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    const variance = pitchVar > 0 ? 1 + (Math.random() - 0.5) * pitchVar : 1;
    osc.frequency.setValueAtTime(freq * variance, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd * variance, 20), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  playShoot() {
    this.playOsc('square', 880, 440, 0.08, 0.05, 0.15);
  }

  playExplosion() {
    if (!this.ctx || !this.masterGain || !this.explosionBuffer || this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.explosionBuffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.3);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(t);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  playBossExplosion() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const delay = i * 0.15;
      if (!this.explosionBuffer) continue;
      const source = this.ctx.createBufferSource();
      source.buffer = this.explosionBuffer;
      source.playbackRate.value = 0.7 + i * 0.15;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t + delay);
      gain.gain.linearRampToValueAtTime(0.2, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.4);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t + delay);
      filter.frequency.exponentialRampToValueAtTime(60, t + delay + 0.4);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start(t + delay);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    }
  }

  playPowerUp() {
    this.playOsc('sine', 400, 1200, 0.12, 0.15);
  }

  playBomb() {
    this.playOsc('sawtooth', 200, 40, 0.25, 0.5);
  }

  playHit() {
    this.playOsc('triangle', 200, 80, 0.15, 0.15);
  }

  playEnemyShoot() {
    this.playOsc('sawtooth', 300, 150, 0.04, 0.06, 0.2);
  }

  playBossWarning() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0, t + i * 0.3);
      gain.gain.linearRampToValueAtTime(0.12, t + i * 0.3 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.3 + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + i * 0.3);
      osc.stop(t + i * 0.3 + 0.15);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    }
  }

  playStageClear() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.1, t + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.3);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  playVictory() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.1, t + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + i * 0.15);
      osc.stop(t + i * 0.15 + 0.5);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  playGameOver() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const notes = [392, 349, 311, 262];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.2);
      gain.gain.linearRampToValueAtTime(0.12, t + i * 0.2 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.2 + 0.6);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + i * 0.2);
      osc.stop(t + i * 0.2 + 0.6);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  playComboMilestone(level: number) {
    const baseFreq = 600 + level * 200;
    this.playOsc('square', baseFreq, baseFreq * 1.5, 0.1, 0.12);
  }

  playMenuSelect() {
    this.playOsc('sine', 800, 1000, 0.08, 0.08);
  }

  playLetterChange() {
    this.playOsc('sine', 600, 700, 0.05, 0.04);
  }

  playPause() {
    this.playOsc('sine', 500, 300, 0.08, 0.1);
  }

  // BGM stubs (no-op, BGM removed)
  startBgm(_type: 'menu' | 'stage' | 'boss') { /* no-op */ }
  stopBgm() { /* no-op */ }
  pauseBgm() { /* no-op */ }
  resumeBgm() { /* no-op */ }
}
