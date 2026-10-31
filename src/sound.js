// Small synthesized sound effects (no audio files): a soft tick for each
// EPSP, chimes for right and wrong answers, and a crackling "pop" when the
// neuron fires. Off unless you turn it on in Settings.

import { settings } from './progress.js';

let ctx = null;
function audio() {
  if (!settings.get('sound')) return null;
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, { at = 0, dur = 0.12, type = 'sine', gain = 0.12, slideTo = null } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const osc = a.createOscillator(), g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function crackle(at, dur) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  const src = a.createBufferSource(), g = a.createGain(), filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2400;
  g.gain.value = 0.25;
  src.buffer = buf;
  src.connect(filter).connect(g).connect(a.destination);
  src.start(t);
}

export const sounds = {
  epsp: () => tone(520, { dur: 0.06, type: 'triangle', gain: 0.08, slideTo: 760 }),
  right: () => { tone(660, { dur: 0.12 }); tone(990, { at: 0.08, dur: 0.18 }); },
  wrong: () => tone(220, { dur: 0.22, type: 'triangle', gain: 0.1, slideTo: 150 }),
  fire: () => {
    tone(180, { dur: 0.35, type: 'sawtooth', gain: 0.08, slideTo: 1400 });
    crackle(0.05, 0.4);
    tone(880, { at: 0.18, dur: 0.5, gain: 0.08 });
    tone(1320, { at: 0.24, dur: 0.6, gain: 0.06 });
  },
};

// Call from the Settings switch (a tap), so iOS lets audio start.
export function setSoundEnabled(on) {
  settings.set('sound', on);
  if (on) sounds.right();
}
