// Lightweight canvas fireworks engine — no external libraries.
// Rockets rise from an origin point, decelerate under gravity, and burst at their apex.

const TAU = Math.PI * 2;
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[(Math.random() * list.length) | 0];
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Festive Diwali palette (HSL)
const PALETTE = [
  { h: 44, s: 100, l: 62 }, // gold
  { h: 28, s: 100, l: 58 }, // saffron
  { h: 330, s: 95, l: 66 }, // rani pink
  { h: 4, s: 92, l: 62 }, // festive red
  { h: 150, s: 80, l: 56 }, // emerald
  { h: 200, s: 95, l: 64 }, // sky blue
  { h: 275, s: 85, l: 72 }, // violet
];
const GOLD = { h: 42, s: 95, l: 60 };
const SILVER = { h: 45, s: 25, l: 86 };

const BURSTS = ["peony", "ring", "doubleRing", "willow", "strobe", "chrysanthemum"];

export default class FireworksEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ onLaunch?: (e) => void, onExplode?: (e) => void, onShowBurst?: (e) => void }} hooks
   *   Optional callbacks (sound, greeting). x / y are given as 0–1 of the screen.
   */
  constructor(canvas, hooks = {}) {
    this.hooks = hooks;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.rockets = [];
    this.sparks = [];
    this.flashes = [];
    this.queue = [];
    this.running = false;
    this.rafId = 0;
    this.last = 0;
    this.idleFrames = 0;

    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  get isSmall() {
    return this.width < 640;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.scale = clamp(Math.min(this.width, this.height) / 620, 0.78, 1.25);
    this.maxSparks = this.isSmall ? 1200 : 2600;
  }

  /** Launch a staggered volley of rockets from (x, y) in viewport coordinates. */
  launchVolley(x, y, count = this.isSmall ? 4 : 6) {
    const now = performance.now();
    let delay = 0;
    for (let i = 0; i < count; i += 1) {
      this.queue.push({ kind: "rocket", at: now + delay, x, y });
      delay += rand(170, 360);
    }
    this.start();
  }

  /**
   * One rocket flies straight up from (x, y); at its peak it opens into a full show:
   * a big centre burst, a ring of follow-up bursts, then a golden willow finale.
   */
  launchShow(x, y) {
    if (this.rockets.length > 3) return;
    this.launchRocket(x, y, { straight: true, show: true });
    this.start();
  }

  showFinale(x, y) {
    const now = performance.now();
    const { width: w, height: h } = this;

    // Big centre burst
    this.hooks.onShowBurst?.({ x: x / w, y: y / h });
    this.explode(x, y, "peony", 1.35);
    this.explode(x, y, "ring", 1.15);

    // Bursts blooming one after another in a ring around the centre
    const count = this.isSmall ? 5 : 7;
    const radius = Math.min(w, h) * (this.isSmall ? 0.32 : 0.28);
    const start = rand(0, TAU);
    let delay = 380;
    for (let i = 0; i < count; i += 1) {
      const angle = start + (i / count) * TAU + rand(-0.25, 0.25);
      const dist = radius * rand(0.6, 1);
      this.queue.push({
        kind: "burst",
        at: now + delay,
        x: clamp(x + Math.cos(angle) * dist, w * 0.1, w * 0.9),
        y: clamp(y + Math.sin(angle) * dist * 0.75, h * 0.06, h * 0.62),
        type: pick(BURSTS),
        power: rand(0.8, 1),
      });
      delay += rand(160, 280);
    }

    // Golden willow canopy to close the show
    this.queue.push({ kind: "burst", at: now + delay + 350, x, y: y - h * 0.02, type: "willow", power: 1.3 });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.idleFrames = 0;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.resize);
    this.running = false;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  // ---------- Spawning ----------

  addSpark(spark) {
    if (this.sparks.length < this.maxSparks) this.sparks.push(spark);
  }

  launchRocket(x0, y0, opts = {}) {
    if (this.rockets.length > 14) return;
    const { width: w, height: h } = this;
    const tx = opts.straight ? x0 : clamp(x0 + rand(-0.38, 0.38) * w, w * 0.1, w * 0.9);
    // Show rocket bursts at ~30% height, right behind the centred "Happy Diwali" word
    const ty = opts.straight ? h * 0.3 : h * rand(0.1, 0.38);
    const g = h * 1.25;
    const dy = Math.max(y0 - ty, h * 0.2);
    const fuse = Math.sqrt((2 * dy) / g);

    this.rockets.push({
      x: x0,
      y: y0,
      px: x0,
      py: y0,
      vx: (tx - x0) / fuse,
      vy: -Math.sqrt(2 * g * dy),
      g,
      life: 0,
      fuse,
      straight: !!opts.straight,
      show: !!opts.show,
    });
    this.hooks.onLaunch?.({ x: x0 / w, fuse, show: !!opts.show });
  }

  explode(x, y, forcedType, power = 1) {
    const type = forcedType || pick(BURSTS);
    const c1 = pick(PALETTE);
    let c2 = pick(PALETTE);
    if (c2 === c1) c2 = GOLD;

    const s = this.scale;
    const base = rand(270, 360) * s * power;
    const count = Math.round((this.isSmall ? 70 : 115) * rand(0.85, 1.15) * power);

    this.flashes.push({ x, y, life: 0, max: 0.4, r: 130 * s * power, c: c1 });
    this.hooks.onExplode?.({ x: x / this.width, type, power });

    switch (type) {
      case "ring":
        this.ring(x, y, count, base * 0.9, c1);
        this.sphere(x, y, Math.round(count * 0.25), base * 0.35, c2, { life: [0.7, 1] });
        break;
      case "doubleRing":
        this.ring(x, y, count, base * 0.95, c1);
        this.ring(x, y, Math.round(count * 0.6), base * 0.55, c2);
        break;
      case "willow":
        this.sphere(x, y, Math.round(count * 0.85), base * 0.8, GOLD, {
          life: [2.2, 3.1],
          drag: 0.945,
          grav: 95,
          tail: 3,
          size: 1.6,
          twinkle: true,
        });
        break;
      case "strobe":
        this.sphere(x, y, count, base, SILVER, { life: [1.4, 1.9], strobe: true, size: 1.8 });
        this.sphere(x, y, Math.round(count * 0.3), base * 0.4, c1, { life: [0.8, 1.1] });
        break;
      case "chrysanthemum":
        this.sphere(x, y, count, base * 1.05, c1, { tail: 2.4, life: [1.3, 1.8], toGold: true });
        break;
      default: // peony with a contrasting pistil
        this.sphere(x, y, count, base, c1);
        if (Math.random() < 0.6) {
          this.sphere(x, y, Math.round(count * 0.3), base * 0.42, c2, { life: [0.8, 1.1] });
        }
    }
  }

  makeSpark(x, y, vx, vy, color, opts = {}) {
    const [lifeMin, lifeMax] = opts.life || [1.1, 1.6];
    return {
      x,
      y,
      px: x,
      py: y,
      vx,
      vy,
      life: 0,
      max: rand(lifeMin, lifeMax),
      h: color.h + rand(-6, 6),
      s: color.s,
      l: color.l,
      size: (opts.size || 2) * rand(0.75, 1.15),
      drag: opts.drag || 0.962,
      grav: opts.grav ?? 140,
      tail: opts.tail || 1,
      twinkle: !!opts.twinkle,
      strobe: !!opts.strobe,
      toGold: !!opts.toGold,
    };
  }

  // Random points on a sphere, projected — denser centre, like a real shell.
  sphere(x, y, count, speed, color, opts) {
    for (let i = 0; i < count; i += 1) {
      const theta = rand(0, TAU);
      const phi = Math.acos(rand(-1, 1));
      const v = speed * rand(0.9, 1.05) * Math.sin(phi);
      this.addSpark(this.makeSpark(x, y, Math.cos(theta) * v, Math.sin(theta) * v, color, opts));
    }
  }

  // Flat ring tilted at a random angle.
  ring(x, y, count, speed, color, opts) {
    const tilt = rand(0, TAU);
    const squash = rand(0.45, 1);
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * TAU;
      const rx = Math.cos(a) * speed;
      const ry = Math.sin(a) * speed * squash;
      this.addSpark(
        this.makeSpark(x, y, rx * cos - ry * sin, rx * sin + ry * cos, color, {
          life: [1.2, 1.5],
          ...opts,
        }),
      );
    }
  }

  // ---------- Loop ----------

  frame(now) {
    const dt = Math.min((now - this.last) / 1000, 1 / 30);
    this.last = now;
    const { ctx, width: w, height: h } = this;

    // Fire queued rockets
    if (this.queue.length) {
      this.queue = this.queue.filter((q) => {
        if (q.at > now) return true;
        if (q.kind === "burst") this.explode(q.x, q.y, q.type, q.power);
        else this.launchRocket(q.x, q.y);
        return false;
      });
    }

    // Fade previous frame toward transparent (keeps the page visible beneath)
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = `rgba(0,0,0,${1 - Math.pow(0.7, dt * 60)})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    this.updateFlashes(dt);
    this.updateRockets(dt);
    this.updateSparks(dt);

    const active =
      this.queue.length || this.rockets.length || this.sparks.length || this.flashes.length;
    this.idleFrames = active ? 0 : this.idleFrames + 1;

    if (this.idleFrames > 45) {
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      this.running = false;
      return;
    }
    this.rafId = requestAnimationFrame(this.frame);
  }

  updateFlashes(dt) {
    const { ctx } = this;
    this.flashes = this.flashes.filter((f) => {
      f.life += dt;
      const p = f.life / f.max;
      if (p >= 1) return false;
      const a = (1 - p) * 0.35;
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * (0.6 + p * 0.6));
      grad.addColorStop(0, `hsla(${f.c.h},100%,85%,${a})`);
      grad.addColorStop(1, `hsla(${f.c.h},100%,60%,0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(f.x - f.r * 1.3, f.y - f.r * 1.3, f.r * 2.6, f.r * 2.6);
      return true;
    });
  }

  updateRockets(dt) {
    const { ctx } = this;
    this.rockets = this.rockets.filter((r) => {
      r.px = r.x;
      r.py = r.y;
      if (!r.straight) r.vx += rand(-1, 1) * 30 * dt; // slight wobble
      r.vy += r.g * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.life += dt;

      // Golden sparkle trail (denser for the show rocket)
      const trail = r.show ? 4 : 2;
      for (let i = 0; i < trail; i += 1) {
        this.addSpark(
          this.makeSpark(r.x, r.y, rand(-35, 35), rand(30, 90), GOLD, {
            life: [0.3, 0.6],
            size: 1.3,
            drag: 0.92,
            grav: 260,
            twinkle: true,
          }),
        );
      }

      ctx.strokeStyle = "hsla(45,100%,80%,0.9)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(r.px, r.py);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();
      ctx.fillStyle = "hsla(45,100%,70%,0.25)";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fff8e0";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 1.8, 0, TAU);
      ctx.fill();

      if (r.life >= r.fuse) {
        if (r.show) this.showFinale(r.x, r.y);
        else this.explode(r.x, r.y);
        return false;
      }
      return true;
    });
  }

  updateSparks(dt) {
    const { ctx, sparks } = this;
    const step = dt * 60;
    let n = 0;

    for (let i = 0; i < sparks.length; i += 1) {
      const p = sparks[i];
      p.life += dt;
      if (p.life >= p.max) continue;

      const k = Math.pow(p.drag, step);
      p.vx *= k;
      p.vy = p.vy * k + p.grav * dt;
      p.px = p.x;
      p.py = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const t = p.life / p.max;
      let alpha = 1 - t * t;
      if (p.twinkle && t > 0.45 && Math.random() < 0.45) alpha *= 0.15;
      if (p.strobe && t > 0.3) alpha *= Math.random() < 0.5 ? 1 : 0.05;

      const hue = p.toGold && t > 0.5 ? GOLD.h : p.h;
      const light = Math.min(96, p.l + (1 - t) * 18);

      ctx.strokeStyle = `hsla(${hue},${p.s}%,${light}%,${alpha})`;
      ctx.lineWidth = p.size * (1 - t * 0.5);
      ctx.beginPath();
      ctx.moveTo(p.x - (p.x - p.px) * p.tail, p.y - (p.y - p.py) * p.tail);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      sparks[n] = p;
      n += 1;
    }
    sparks.length = n;
  }
}
