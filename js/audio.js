export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicOsc = null;
    this.musicInterval = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.12;
    this.sfxGain.gain.value = 0.35;
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
    this.enabled = true;
  }

  resume() {
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  tone(freq, dur, type = "square", vol = 0.3, slideTo = null) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur);
  }

  noise(dur, vol = 0.2) {
    if (!this.enabled) return;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start();
  }

  play(name) {
    this.resume();
    switch (name) {
      case "punch":
        this.tone(180, 0.08, "square", 0.25, 90);
        this.noise(0.05, 0.15);
        break;
      case "kick":
        this.tone(120, 0.12, "sawtooth", 0.3, 60);
        this.noise(0.08, 0.2);
        break;
      case "hit":
        this.tone(80, 0.15, "square", 0.35, 40);
        this.noise(0.1, 0.25);
        break;
      case "block":
        this.tone(300, 0.06, "triangle", 0.2);
        break;
      case "jump":
        this.tone(200, 0.1, "square", 0.15, 400);
        break;
      case "special":
        this.tone(600, 0.2, "sawtooth", 0.3, 200);
        this.tone(900, 0.15, "square", 0.2, 300);
        break;
      case "bitcoin":
        this.tone(880, 0.08, "square", 0.2);
        setTimeout(() => this.tone(1100, 0.08, "square", 0.15), 60);
        break;
      case "round":
        this.tone(440, 0.15, "square", 0.25);
        setTimeout(() => this.tone(660, 0.2, "square", 0.3), 200);
        break;
      case "fight":
        this.tone(220, 0.08, "sawtooth", 0.4);
        setTimeout(() => this.tone(330, 0.15, "sawtooth", 0.35), 100);
        setTimeout(() => this.tone(440, 0.25, "square", 0.4), 250);
        break;
      case "ko":
        this.tone(350, 0.3, "sawtooth", 0.4, 80);
        setTimeout(() => this.tone(200, 0.5, "square", 0.35, 50), 300);
        break;
      case "cheer":
        this.noise(0.3, 0.08);
        this.tone(500, 0.2, "triangle", 0.1);
        break;
      case "select":
        this.tone(520, 0.06, "square", 0.2);
        break;
      case "rage":
        this.tone(160, 0.25, "sawtooth", 0.4, 60);
        setTimeout(() => this.tone(110, 0.3, "sawtooth", 0.35, 50), 180);
        setTimeout(() => this.noise(0.2, 0.25), 100);
        break;
      case "firework":
        this.tone(700 + Math.random() * 400, 0.12, "square", 0.15, 200);
        this.noise(0.15, 0.12);
        break;
    }
  }

  startMusic(style = "fight") {
    if (!this.enabled || this.musicInterval) return;
    const patterns = {
      fight: [262, 0, 330, 0, 392, 0, 330, 0, 294, 0, 349, 0, 440, 0, 349, 0],
      boss: [196, 196, 247, 247, 294, 294, 247, 0, 220, 220, 262, 262, 196, 196, 0, 0],
      victory: [523, 659, 784, 1047],
    };
    const pat = patterns[style] || patterns.fight;
    let i = 0;
    this.musicInterval = setInterval(() => {
      const n = pat[i % pat.length];
      if (n > 0) this.tone(n, 0.12, "square", 0.08);
      i++;
    }, 180);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}
