// Synthesised firework sounds using the Web Audio API — no audio files needed.
// The AudioContext is created lazily on the first sound, which always happens
// inside a user click, so browser autoplay rules are satisfied.

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default class FireworksAudio {
  constructor({ volume = 0.75 } = {}) {
    this.ctx = null;
    this.master = null;
    this.noise = null;
    this.muted = false;
    this.volume = volume;
    this.voices = 0;
    this.maxVoices = 24;
  }

  ensure() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : this.volume;

      // Limiter keeps overlapping bursts from clipping or getting too loud
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;

      master.connect(limiter);
      limiter.connect(ctx.destination);

      this.ctx = ctx;
      this.master = master;
      this.noise = this.makeNoise(2);
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  makeNoise(seconds) {
    const { ctx } = this;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  noiseSource() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    return src;
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.ctx) return;
    const gain = this.master.gain;
    const t = this.ctx.currentTime;
    gain.cancelScheduledValues(t);
    gain.setTargetAtTime(muted ? 0 : this.volume, t, 0.05);
  }

  /** Creates an output (gain → stereo pan → master) for one sound, or null if skipped. */
  voice(pan, lifetime) {
    if (this.muted || this.voices >= this.maxVoices) return null;
    const ctx = this.ensure();
    if (!ctx) return null;

    const out = ctx.createGain();
    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = clamp(pan, -1, 1);
      out.connect(panner);
      panner.connect(this.master);
    } else {
      out.connect(this.master);
    }

    this.voices += 1;
    setTimeout(() => {
      this.voices -= 1;
      out.disconnect();
    }, (lifetime + 0.3) * 1000);
    return out;
  }

  /**
   * Realistic Diwali sky-rocket launch: "phut" + ignition fizz, then a gritty,
   * sputtering gunpowder "shhhhh-whoosh" that fades and dulls as it climbs away.
   */
  rocket(duration, pan = 0) {
    const tail = 0.15;
    const out = this.voice(pan, duration + tail + 0.2);
    if (!out) return;
    const { ctx } = this;
    const t = ctx.currentTime;
    const end = t + duration;

    // Distance: high frequencies fade as the rocket climbs away
    const distance = ctx.createBiquadFilter();
    distance.type = "lowpass";
    distance.frequency.setValueAtTime(9000, t);
    distance.frequency.exponentialRampToValueAtTime(2200, end);
    distance.connect(out);

    // 1) Launch "phut" — the rocket leaving its bottle
    const phut = ctx.createOscillator();
    phut.type = "sine";
    phut.frequency.setValueAtTime(95, t);
    phut.frequency.exponentialRampToValueAtTime(45, t + 0.14);
    const phutGain = ctx.createGain();
    phutGain.gain.setValueAtTime(0.35, t);
    phutGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    phut.connect(phutGain);
    phutGain.connect(out);
    phut.start(t);
    phut.stop(t + 0.2);

    // 2) Ignition fizz — bright sizzle at the moment of lift-off
    const fizz = this.noiseSource();
    const fizzFilter = ctx.createBiquadFilter();
    fizzFilter.type = "highpass";
    fizzFilter.frequency.value = 5000;
    const fizzGain = ctx.createGain();
    fizzGain.gain.setValueAtTime(0.0001, t);
    fizzGain.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
    fizzGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    fizz.connect(fizzFilter);
    fizzFilter.connect(fizzGain);
    fizzGain.connect(distance);
    fizz.start(t, Math.random());
    fizz.stop(t + 0.25);

    // Uneven "sputter" of burning gunpowder: random amplitude wobble
    const steps = Math.max(16, Math.round((duration + tail) * 70));
    const curve = new Float32Array(steps);
    for (let i = 0; i < steps; i += 1) {
      curve[i] = Math.random() < 0.1 ? rand(0.15, 0.35) : rand(0.6, 1);
    }
    const sputter = ctx.createGain();
    sputter.gain.setValueCurveAtTime(curve, t, duration + tail);
    sputter.connect(distance);

    // Overall thrust envelope: strong at lift-off, fading with distance
    const thrust = ctx.createGain();
    thrust.gain.setValueAtTime(0.0001, t);
    thrust.gain.exponentialRampToValueAtTime(1, t + 0.05);
    thrust.gain.exponentialRampToValueAtTime(0.3, end);
    thrust.gain.exponentialRampToValueAtTime(0.0001, end + tail);
    thrust.connect(sputter);

    // 3) Thrust roar — the main "shhhhh"
    const roar = this.noiseSource();
    const roarFilter = ctx.createBiquadFilter();
    roarFilter.type = "bandpass";
    roarFilter.frequency.setValueAtTime(1100, t);
    roarFilter.frequency.exponentialRampToValueAtTime(1700, end);
    roarFilter.Q.value = 0.55;
    const roarGain = ctx.createGain();
    roarGain.gain.value = 0.42;
    roar.connect(roarFilter);
    roarFilter.connect(roarGain);
    roarGain.connect(thrust);

    // 4) Low rumble — body underneath the roar
    const rumble = this.noiseSource();
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.value = 450;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.22;
    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(thrust);

    roar.start(t, Math.random());
    rumble.start(t, Math.random());
    roar.stop(end + tail);
    rumble.stop(end + tail);
  }

  /** Short bright transient at the start of a burst. */
  crack(out, t, level) {
    const src = this.noiseSource();
    const high = this.ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 2500;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(high);
    high.connect(gain);
    gain.connect(out);
    src.start(t, Math.random());
    src.stop(t + 0.1);
  }

  /** Deep boom for big shells. */
  boom(power = 1, pan = 0) {
    const duration = 1.9;
    const out = this.voice(pan, duration);
    if (!out) return;
    const { ctx } = this;
    const t = ctx.currentTime;
    const level = clamp(0.5 * power, 0.3, 0.85);

    // Low thump
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(rand(110, 140), t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.45);
    const thump = ctx.createGain();
    thump.gain.setValueAtTime(level, t);
    thump.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    osc.connect(thump);
    thump.connect(out);
    osc.start(t);
    osc.stop(t + 0.75);

    // Rumbling body: noise through a closing low-pass filter
    const body = this.noiseSource();
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.setValueAtTime(rand(1400, 2200), t);
    low.frequency.exponentialRampToValueAtTime(160, t + duration);
    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, t);
    bodyGain.gain.exponentialRampToValueAtTime(level * 1.1, t + 0.008);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    body.connect(low);
    low.connect(bodyGain);
    bodyGain.connect(out);
    body.start(t, Math.random());
    body.stop(t + duration);

    this.crack(out, t, level * 0.55);
  }

  /** Lighter pop for the smaller follow-up bursts. */
  pop(power = 1, pan = 0) {
    const duration = 0.7;
    const out = this.voice(pan, duration);
    if (!out) return;
    const { ctx } = this;
    const t = ctx.currentTime;
    const level = clamp(0.32 * power, 0.15, 0.45);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(rand(200, 250), t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    const thump = ctx.createGain();
    thump.gain.setValueAtTime(level, t);
    thump.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(thump);
    thump.connect(out);
    osc.start(t);
    osc.stop(t + 0.25);

    const body = this.noiseSource();
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = rand(1400, 2000);
    band.Q.value = 0.7;
    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(level * 1.2, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    body.connect(band);
    band.connect(bodyGain);
    bodyGain.connect(out);
    body.start(t, Math.random());
    body.stop(t + duration);

    this.crack(out, t, level * 0.5);
  }

  /** Glittery crackle: many tiny random clicks spread over `duration` after `delay`. */
  crackle(delay, duration, pan = 0, density = 40, level = 1) {
    const out = this.voice(pan, delay + duration);
    if (!out) return;
    const { ctx } = this;
    const t0 = ctx.currentTime + delay;

    const high = ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 3000;
    high.connect(out);

    const count = Math.round(density * duration);
    for (let i = 0; i < count; i += 1) {
      const offset = Math.random() * duration;
      const at = t0 + offset;
      const fade = 1 - (offset / duration) * 0.6;
      const src = this.noiseSource();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(rand(0.05, 0.2) * fade * level, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + rand(0.006, 0.02));
      src.connect(gain);
      gain.connect(high);
      src.start(at, Math.random() * 1.5);
      src.stop(at + 0.03);
    }
  }

  close() {
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
