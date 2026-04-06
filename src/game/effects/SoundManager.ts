// ===== SOUND MANAGER (Web Audio API - Synthesized SFX + Procedural BGM) =====

// BGM pattern types
type BgmType = 'menu' | 'stage' | 'boss';

interface BgmState {
  type: BgmType;
  playing: boolean;
  tempo: number; // BPM
  step: number;
  nextStepTime: number;
  nodes: AudioNode[];
}

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private initialized = false;
  muted = false;
  volume = 0.8;

  private explosionBuffer: AudioBuffer | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // BGM state
  private bgm: BgmState = {
    type: 'menu',
    playing: false,
    tempo: 128,
    step: 0,
    nextStepTime: 0,
    nodes: [],
  };
  private bgmTimer: number | null = null;

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -8;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 6;
      this.compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.compressor);

      // Separate gain nodes for SFX and BGM
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1.0;
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.55; // BGM slightly quieter than SFX
      this.bgmGain.connect(this.masterGain);

      this.explosionBuffer = this.createNoiseBuffer(0.3);
      this.noiseBuffer = this.createNoiseBuffer(0.1);

      this.initialized = true;
      try {
        const savedMute = localStorage.getItem('2045_muted');
        if (savedMute === '1') this.muted = true;
        const savedVol = localStorage.getItem('2045_volume');
        if (savedVol) this.volume = parseFloat(savedVol);
        this.applyVolume();
      } catch { /* ignore */ }
    } catch {
      console.warn('Web Audio not supported');
    }
  }

  private applyVolume() {
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.applyVolume();
    try { localStorage.setItem('2045_muted', this.muted ? '1' : '0'); } catch { /* ignore */ }
    return this.muted;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.applyVolume();
    try { localStorage.setItem('2045_volume', String(this.volume)); } catch { /* ignore */ }
  }

  volumeUp() { this.setVolume(this.volume + 0.1); }
  volumeDown() { this.setVolume(this.volume - 0.1); }

  private ensureContext() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
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

  // ===== SFX =====
  private playOsc(type: OscillatorType, freq: number, freqEnd: number, vol: number, dur: number, pitchVar = 0) {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    const v = pitchVar > 0 ? 1 + (Math.random() - 0.5) * pitchVar : 1;
    osc.frequency.setValueAtTime(freq * v, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd * v, 20), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  playShoot() { this.playOsc('square', 880, 440, 0.25, 0.05, 0.15); }

  playExplosion() {
    if (!this.ctx || !this.sfxGain || !this.explosionBuffer || this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.explosionBuffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.35);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(t);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  playBossExplosion() {
    if (!this.ctx || !this.sfxGain || this.muted) return;
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
      gain.gain.linearRampToValueAtTime(0.6, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.45);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t + delay);
      filter.frequency.exponentialRampToValueAtTime(60, t + delay + 0.4);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      source.start(t + delay);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    }
  }

  playPowerUp() { this.playOsc('sine', 400, 1200, 0.3, 0.15); }
  playBomb() { this.playOsc('sawtooth', 200, 40, 0.5, 0.5); }
  playHit() { this.playOsc('triangle', 200, 80, 0.4, 0.15); }
  playEnemyShoot() { this.playOsc('sawtooth', 300, 150, 0.1, 0.06, 0.2); }

  playBossWarning() {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0, t + i * 0.3);
      gain.gain.linearRampToValueAtTime(0.18, t + i * 0.3 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.3 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.3);
      osc.stop(t + i * 0.3 + 0.15);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    }
  }

  playStageClear() {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.15, t + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
      osc.connect(gain); gain.connect(this.sfxGain!);
      osc.start(t + i * 0.12); osc.stop(t + i * 0.12 + 0.3);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  playVictory() {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.15, t + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.5);
      osc.connect(gain); gain.connect(this.sfxGain!);
      osc.start(t + i * 0.15); osc.stop(t + i * 0.15 + 0.5);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  playGameOver() {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    [392, 349, 311, 262].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.2);
      gain.gain.linearRampToValueAtTime(0.18, t + i * 0.2 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.2 + 0.6);
      osc.connect(gain); gain.connect(this.sfxGain!);
      osc.start(t + i * 0.2); osc.stop(t + i * 0.2 + 0.6);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  playComboMilestone(level: number) {
    this.playOsc('square', 600 + level * 200, (600 + level * 200) * 1.5, 0.15, 0.12);
  }
  playMenuSelect() { this.playOsc('sine', 800, 1000, 0.12, 0.08); }
  playLetterChange() { this.playOsc('sine', 600, 700, 0.08, 0.04); }
  playPause() { this.playOsc('sine', 500, 300, 0.12, 0.1); }

  // ===== BGM ENGINE =====

  startBgm(type: BgmType) {
    this.stopBgm();
    if (!this.ctx || !this.bgmGain) return;
    this.ensureContext();

    const tempos: Record<BgmType, number> = { menu: 110, stage: 138, boss: 155 };
    this.bgm.type = type;
    this.bgm.tempo = tempos[type];
    this.bgm.step = 0;
    this.bgm.playing = true;
    this.bgm.nextStepTime = this.ctx.currentTime + 0.05;
    this.scheduleBgm();
  }

  stopBgm() {
    this.bgm.playing = false;
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    for (const n of this.bgm.nodes) {
      try { n.disconnect(); } catch { /* ignore */ }
    }
    this.bgm.nodes = [];
  }

  pauseBgm() {
    if (this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.05);
    }
  }

  resumeBgm() {
    if (this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(0.55, this.ctx!.currentTime, 0.05);
    }
  }

  private scheduleBgm() {
    if (!this.bgm.playing || !this.ctx || !this.bgmGain) return;

    const lookAhead = 0.15; // schedule 150ms ahead
    const stepDur = 60 / this.bgm.tempo / 4; // 16th note duration

    while (this.bgm.nextStepTime < this.ctx.currentTime + lookAhead) {
      this.playBgmStep(this.bgm.nextStepTime, this.bgm.step, this.bgm.type);
      this.bgm.step = (this.bgm.step + 1) % 64; // 4 bars of 16 steps
      this.bgm.nextStepTime += stepDur;
    }

    this.bgmTimer = window.setTimeout(() => this.scheduleBgm(), 50);
  }

  private playBgmStep(time: number, step: number, type: BgmType) {
    if (!this.ctx || !this.bgmGain) return;

    const beat = step % 16;      // position in bar (0-15)
    const bar = Math.floor(step / 16) % 4; // which bar (0-3)

    switch (type) {
      case 'menu': this.bgmMenuStep(time, beat, bar); break;
      case 'stage': this.bgmStageStep(time, beat, bar); break;
      case 'boss': this.bgmBossStep(time, beat, bar); break;
    }
  }

  // --- KICK DRUM ---
  private playKick(time: number, vol = 0.45) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.2);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  // --- HI-HAT ---
  private playHat(time: number, open = false) {
    if (!this.ctx || !this.bgmGain || !this.noiseBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const gain = this.ctx.createGain();
    const dur = open ? 0.12 : 0.04;
    gain.gain.setValueAtTime(open ? 0.12 : 0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = open ? 7000 : 9000;
    source.connect(hp);
    hp.connect(gain);
    gain.connect(this.bgmGain);
    source.start(time);
    source.onended = () => { source.disconnect(); hp.disconnect(); gain.disconnect(); };
  }

  // --- SNARE ---
  private playSnare(time: number, vol = 0.2) {
    if (!this.ctx || !this.bgmGain || !this.noiseBuffer) return;
    // Noise part
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(vol, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3000;
    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(this.bgmGain);
    noise.start(time);
    noise.onended = () => { noise.disconnect(); bp.disconnect(); nGain.disconnect(); };
    // Tone part
    const osc = this.ctx.createOscillator();
    const oGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.06);
    oGain.gain.setValueAtTime(vol * 0.7, time);
    oGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.connect(oGain);
    oGain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.1);
    osc.onended = () => { osc.disconnect(); oGain.disconnect(); };
  }

  // --- BASS NOTE ---
  private playBass(time: number, freq: number, dur: number, vol = 0.3) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + dur);
    filter.Q.value = 5;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.setValueAtTime(vol, time + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + dur);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  // --- LEAD SYNTH (dark filtered) ---
  private playLead(time: number, freq: number, dur: number, vol = 0.08) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 0.997; // detune down for darker sound
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.8, time + dur);
    filter.Q.value = 2;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.015);
    gain.gain.setValueAtTime(vol * 0.6, time + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time); osc.stop(time + dur);
    osc2.start(time); osc2.stop(time + dur);
    osc.onended = () => { osc.disconnect(); osc2.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  // --- SUB BASS (sine, very low) ---
  private playSubBass(time: number, freq: number, dur: number, vol = 0.2) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.setValueAtTime(vol * 0.8, time + dur * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + dur);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  // ===== MENU BGM: Dark ambient drone — bass only =====
  private bgmMenuStep(t: number, beat: number, bar: number) {
    const stepDur = 60 / this.bgm.tempo / 4;

    // Sparse, heavy kick
    if (beat === 0) this.playKick(t, 0.3);
    if (beat === 12 && bar % 2 === 0) this.playKick(t, 0.2);

    // Eerie hat — sparse clicks
    if (beat === 4 || beat === 10) this.playHat(t);

    // Deep sub-bass drone
    const menuSub = [41.2, 41.2, 38.9, 41.2]; // E1, E1, Eb1, E1
    if (beat === 0) this.playSubBass(t, menuSub[bar], stepDur * 14, 0.22);

    // Dark filtered bass pulse
    if (beat === 0 || beat === 8) {
      const bassTones = [82.4, 82.4, 77.8, 73.4]; // E2, E2, Eb2, D2
      this.playBass(t, bassTones[bar], stepDur * 6, 0.15);
    }
  }

  // ===== STAGE BGM: Industrial bass + drums only =====
  private bgmStageStep(t: number, beat: number, bar: number) {
    const stepDur = 60 / this.bgm.tempo / 4;

    // Hard four-on-the-floor kick
    if (beat % 4 === 0) this.playKick(t, 0.5);
    // Offbeat kicks for drive
    if (beat === 6 || beat === 14) this.playKick(t, 0.3);

    // Snare on 2 and 4
    if (beat === 4 || beat === 12) this.playSnare(t, 0.25);
    // Ghost snare
    if (beat === 10) this.playSnare(t, 0.1);

    // Relentless hi-hat
    this.playHat(t, beat % 4 === 2);

    // Sub-bass foundation
    const subNotes = [55, 51.9, 55, 49]; // A1, Ab1, A1, G1
    if (beat === 0) this.playSubBass(t, subNotes[bar], stepDur * 14, 0.25);

    // BASS — aggressive 16th note pattern
    const bassPatterns: number[][] = [
      [110, 110, 0, 110, 0, 131, 0, 110, 110, 0, 165, 0, 131, 0, 110, 0],
      [104, 104, 0, 104, 0, 117, 0, 104, 104, 0, 131, 0, 117, 0, 104, 0],
      [110, 0, 110, 110, 0, 131, 165, 0, 196, 0, 165, 0, 131, 110, 0, 110],
      [98, 98, 0, 98, 0, 110, 0, 98, 110, 110, 0, 131, 0, 110, 110, 0],
    ];
    const bassNote = bassPatterns[bar][beat];
    if (bassNote > 0) this.playBass(t, bassNote, stepDur * 1.5, 0.38);
  }

  // ===== BOSS BGM: Brutal bass + pounding drums =====
  private bgmBossStep(t: number, beat: number, bar: number) {
    const stepDur = 60 / this.bgm.tempo / 4;

    // Pounding double-time kick
    if (beat % 2 === 0) this.playKick(t, 0.5);
    if (beat === 3 || beat === 7 || beat === 11) this.playKick(t, 0.35);

    // Snare on 2 and 4 + ghost fills
    if (beat === 4 || beat === 12) this.playSnare(t, 0.3);
    if (beat === 7 || beat === 15) this.playSnare(t, 0.15);
    if (bar === 3 && beat >= 12) this.playSnare(t, 0.2);

    // Blazing hi-hat every step
    this.playHat(t, beat % 2 === 1);

    // Massive sub-bass — tritone movement
    const bossSub = [36.7, 51.9, 41.2, 36.7]; // D1, Ab1, E1, D1
    if (beat === 0) this.playSubBass(t, bossSub[bar], stepDur * 14, 0.3);

    // BASS — relentless 16th note assault
    const bossBassPat: number[][] = [
      [73, 73, 0, 73, 73, 0, 87, 73, 73, 0, 73, 87, 0, 110, 87, 73],
      [104, 104, 0, 104, 0, 124, 104, 0, 104, 104, 0, 87, 104, 0, 124, 0],
      [82, 82, 0, 98, 0, 82, 110, 0, 82, 0, 98, 0, 110, 82, 0, 82],
      [73, 0, 73, 73, 0, 87, 73, 0, 73, 73, 87, 98, 110, 87, 73, 73],
    ];
    const bn = bossBassPat[bar][beat];
    if (bn > 0) this.playBass(t, bn, stepDur * 1.2, 0.45);
  }
}
