// All sound is synthesised with WebAudio — no audio files, no network. The context
// is created on the first user gesture; every call is safe before that (it no-ops).
// A quiet bass pulse loop runs under the game once it is unlocked.
let ctx = null;
let master = null;
let musicTimer = null;
let muted = false;
let musicStep = 0;

const BASS_NOTES = [55, 55, 65.41, 49]; // A1 A1 C2 G1, one bar of four pulses

// Each realm hums in its own key: Ember burns in A minor, Frost holds in D minor,
// the Void Garden drifts in E minor.
const REALM_BASS = {
  ember: [55, 55, 65.41, 49],
  frost: [73.42, 73.42, 87.31, 65.41],
  void: [82.41, 82.41, 98, 73.42],
};
let bassNotes = BASS_NOTES;

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch {
    return null;
  }
  return ctx;
}

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    // Audio is decoration: never let it break the game.
  }
}

function noise(dur, vol, lowpass) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  } catch {
    // Audio is decoration: never let it break the game.
  }
}

function startMusic() {
  if (musicTimer || !ctx) return;
  musicTimer = window.setInterval(() => {
    if (muted || !ctx) return;
    const note = bassNotes[musicStep % bassNotes.length];
    musicStep += 1;
    tone(note, 0.42, 'sine', 0.11);
    tone(note * 2, 0.2, 'triangle', 0.045);
    if (musicStep % 8 === 4) tone(note * 4, 0.3, 'sine', 0.03);
  }, 480);
}

export const audio = {
  /** Call from any user gesture so later sounds are allowed to play. */
  unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
    if (c) startMusic();
  },
  /** Retune the bass loop to the realm the drone just entered. */
  setRealm(realmId) {
    bassNotes = REALM_BASS[realmId] ?? BASS_NOTES;
  },
  toggleMute() {
    muted = !muted;
    return muted;
  },
  isMuted() {
    return muted;
  },
  shoot() {
    tone(720, 0.07, 'square', 0.05, 320);
  },
  pickup(level) {
    const base = 520 + level * 70;
    tone(base, 0.09, 'sine', 0.09);
    tone(base * 1.5, 0.12, 'sine', 0.07);
  },
  explosion(big) {
    noise(big ? 0.5 : 0.28, big ? 0.22 : 0.13, big ? 900 : 1400);
    tone(big ? 120 : 160, big ? 0.4 : 0.22, 'sawtooth', 0.09, 40);
  },
  hit() {
    tone(220, 0.25, 'sawtooth', 0.16, 60);
    noise(0.18, 0.14, 800);
  },
  dash() {
    noise(0.16, 0.08, 3200);
    tone(300, 0.14, 'sine', 0.05, 700);
  },
  nova() {
    noise(0.7, 0.25, 600);
    tone(90, 0.6, 'sine', 0.16, 30);
    tone(440, 0.4, 'triangle', 0.06, 880);
  },
  upgrade() {
    [523, 659, 784, 1047].forEach((f, i) => {
      window.setTimeout(() => tone(f, 0.16, 'triangle', 0.09), i * 70);
    });
  },
  waveClear() {
    [392, 523, 659].forEach((f, i) => {
      window.setTimeout(() => tone(f, 0.14, 'triangle', 0.08), i * 80);
    });
  },
  gameOver() {
    [330, 262, 196, 131].forEach((f, i) => {
      window.setTimeout(() => tone(f, 0.3, 'sawtooth', 0.07), i * 160);
    });
  },
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      window.setTimeout(() => tone(f, 0.22, 'triangle', 0.09), i * 110);
    });
  },
  uiMove() {
    tone(600, 0.05, 'sine', 0.05);
  },
};
