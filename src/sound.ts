// Procedural sound effects — Web Audio oscillators only, no asset files.
// UI layer only; the game core stays silent and pure. Sounds are quiet,
// short and slightly out of tune, like everything on the sídliště.

export type SoundId = 'click' | 'good' | 'bad' | 'event' | 'info' | 'milestone';

const STORAGE_KEY = 'panelak-mute';

let ctx: AudioContext | null = null;
let muted =
  typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* private mode etc. — preference just won't stick */
  }
}

function ensureCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = 'square',
  volume = 0.035,
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ac.currentTime + start;
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function play(id: SoundId): void {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  switch (id) {
    case 'click':
      tone(ac, 880, 0, 0.05, 'square', 0.03);
      break;
    case 'good':
      tone(ac, 659, 0, 0.09, 'triangle', 0.05);
      tone(ac, 880, 0.08, 0.12, 'triangle', 0.05);
      break;
    case 'bad':
      tone(ac, 196, 0, 0.18, 'sawtooth', 0.04);
      tone(ac, 185, 0.1, 0.18, 'sawtooth', 0.03);
      break;
    case 'milestone':
      tone(ac, 523, 0, 0.1, 'triangle', 0.05);
      tone(ac, 659, 0.09, 0.1, 'triangle', 0.05);
      tone(ac, 784, 0.18, 0.16, 'triangle', 0.05);
      break;
    case 'event':
      tone(ac, 440, 0, 0.08, 'square', 0.035);
      tone(ac, 554, 0.07, 0.1, 'square', 0.035);
      break;
    case 'info':
    default:
      tone(ac, 440, 0, 0.07, 'sine', 0.04);
      break;
  }
}
