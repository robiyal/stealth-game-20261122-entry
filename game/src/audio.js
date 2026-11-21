// NIGHTMAIL — sound, synthesized with Web Audio. No audio files: every
// footstep, coin, alarm and chime is built from oscillators and noise.
// Guard footsteps are panned, so you can hear where a guard is.

export function makeAudio() {
  const api = {
    ctx: null,
    master: null,
    enabled: true,
  };

  function ensure() {
    if (api.ctx) {
      if (api.ctx.state === 'suspended') api.ctx.resume().catch(() => {});
      return api.ctx;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      api.ctx = new Ctx();
      api.master = api.ctx.createGain();
      api.master.gain.value = 0.5;
      api.master.connect(api.ctx.destination);
    } catch {
      api.ctx = null;
    }
    return api.ctx;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    const ctx = ensure();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(api.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // Headless or locked audio: stay silent, never break the game.
    }
  }

  function noiseBurst(dur, vol, filterFreq, pan = 0) {
    const ctx = ensure();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const gain = ctx.createGain();
      gain.gain.value = vol;
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      src.connect(filter);
      filter.connect(gain);
      if (panner) {
        panner.pan.value = Math.max(-1, Math.min(1, pan));
        gain.connect(panner);
        panner.connect(api.master);
      } else {
        gain.connect(api.master);
      }
      src.start(t0);
    } catch {
      // Silent in headless.
    }
  }

  return {
    // The player's own step: soft when sneaking, loud when sprinting.
    playerStep(vol) {
      noiseBurst(0.07, vol, 900);
    },
    // A guard's step, panned by where the guard is relative to the player.
    guardStep(guardX, playerX) {
      const pan = (guardX - playerX) / 300;
      noiseBurst(0.09, 0.22, 700, pan);
    },
    coin() {
      tone(2093, 0.09, 'sine', 0.25);
      tone(2637, 0.14, 'sine', 0.2, 0.06);
      noiseBurst(0.05, 0.12, 4000);
    },
    pickup() {
      tone(880, 0.1, 'triangle', 0.25);
      tone(1318, 0.16, 'triangle', 0.22, 0.07);
    },
    hide(on) {
      noiseBurst(0.18, on ? 0.15 : 0.1, 500);
    },
    // A guard grows suspicious: a short rising two-note nudge.
    suspicious() {
      tone(440, 0.12, 'square', 0.12);
      tone(554, 0.16, 'square', 0.12, 0.1);
    },
    // Spotted: the alarm sting.
    alert() {
      tone(220, 0.35, 'sawtooth', 0.22, 0, 440);
      tone(233, 0.35, 'sawtooth', 0.18, 0.02, 466);
    },
    caught() {
      tone(196, 0.5, 'sawtooth', 0.25, 0, 98);
    },
    win() {
      tone(523, 0.14, 'triangle', 0.25);
      tone(659, 0.14, 'triangle', 0.25, 0.12);
      tone(784, 0.22, 'triangle', 0.28, 0.24);
      tone(1046, 0.3, 'triangle', 0.25, 0.36);
    },
  };
}
