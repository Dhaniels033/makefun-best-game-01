// Synthesised sound effects with WebAudio only — no audio files, no network.
// The context is created lazily on the first user gesture; every effect is a short
// oscillator/noise envelope, and M toggles mute.
export function createAudio() {
  let context = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, gain, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  function noise(dur, gain, low) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low || 1200;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start();
  }

  // A quiet looping bass-and-pluck figure, one note every 0.28 s, minor key.
  const MELODY = [110, 0, 130.8, 0, 98, 0, 146.8, 164.8, 110, 0, 130.8, 0, 98, 0, 123.5, 0];
  function startMusic() {
    if (musicTimer || muted) return;
    ensure();
    musicTimer = setInterval(() => {
      if (muted) return;
      const note = MELODY[musicStep % MELODY.length];
      musicStep += 1;
      if (note) tone(note, 0.26, 'triangle', 0.05);
    }, 280);
  }

  return {
    unlock() { ensure(); startMusic(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    shoot() { tone(720, 0.07, 'square', 0.045, 320); },
    hit() { noise(0.08, 0.08, 900); },
    kill() { tone(320, 0.14, 'sawtooth', 0.06, 90); },
    pickup() { tone(880, 0.09, 'sine', 0.06, 1320); },
    hurt() { tone(160, 0.2, 'sawtooth', 0.09, 70); noise(0.15, 0.1, 500); },
    dash() { noise(0.12, 0.05, 2400); },
    buy() { tone(523, 0.1, 'sine', 0.07); setTimeout(() => tone(784, 0.14, 'sine', 0.07), 90); },
    wave() { tone(196, 0.35, 'triangle', 0.09, 392); },
    boss() { tone(65, 0.7, 'sawtooth', 0.12, 45); noise(0.5, 0.08, 300); },
    victory() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.08), i * 130)); },
    defeat() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.08), i * 160)); },
  };
}
