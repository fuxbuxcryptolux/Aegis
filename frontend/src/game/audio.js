// Web Audio API synthesized sound effects. Zero external assets.
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
  }

  _ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.25;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  }

  resume() {
    this._ensure();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  setEnabled(v) {
    this.enabled = v;
  }

  _tone(freqStart, freqEnd, dur, type = "sine", gain = 0.5) {
    if (!this.enabled) return;
    this._ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise(dur, gain = 0.4, filterFreq = 1200) {
    if (!this.enabled) return;
    this._ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur);
  }

  play(name) {
    switch (name) {
      case "archer":
        this._tone(1200, 320, 0.08, "sawtooth", 0.25);
        break;
      case "frost":
        this._noise(0.25, 0.18, 900);
        this._tone(520, 240, 0.25, "sine", 0.18);
        break;
      case "inferno":
        this._tone(90, 40, 0.35, "sine", 0.5);
        this._noise(0.3, 0.3, 700);
        break;
      case "tesla":
        this._tone(1600, 900, 0.12, "square", 0.16);
        this._tone(900, 1400, 0.1, "sawtooth", 0.1);
        break;
      case "death":
        this._tone(880, 1320, 0.1, "sine", 0.2);
        break;
      case "boss":
        this._tone(120, 60, 0.7, "sawtooth", 0.45);
        break;
      case "perk":
        this._tone(523, 523, 0.12, "triangle", 0.3);
        setTimeout(() => this._tone(659, 659, 0.12, "triangle", 0.3), 90);
        setTimeout(() => this._tone(784, 784, 0.2, "triangle", 0.3), 180);
        break;
      case "reward":
        [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._tone(f, f, 0.12, "square", 0.22), i * 70));
        break;
      case "place":
        this._tone(300, 600, 0.1, "square", 0.2);
        break;
      case "leak":
        this._tone(200, 90, 0.3, "sawtooth", 0.35);
        break;
      case "nuke":
        this._tone(200, 40, 0.6, "sawtooth", 0.5);
        this._noise(0.5, 0.4, 600);
        break;
      case "victory":
        [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this._tone(f, f, 0.18, "triangle", 0.28), i * 120));
        break;
      case "defeat":
        this._tone(400, 80, 0.9, "sawtooth", 0.4);
        break;
      default:
        break;
    }
  }
}

const audio = new AudioEngine();
export default audio;
