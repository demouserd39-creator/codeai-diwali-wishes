import styles from "./CitySkyline.module.css";

// Drawing space; the SVG covers the screen width (sides crop on narrow screens,
// so tall landmark towers are placed near the centre where phones still see them).
const W = 1440;
const H = 340;
const CENTER = W / 2;

function mulberry32(seed) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n) => Math.round(n * 10) / 10;
const rect = (x, y, w, h) => `M${r1(x)} ${r1(y)}h${r1(w)}v${r1(h)}h${r1(-w)}Z`;

const BULB_COLORS = ["#ffd166", "#ff5d8f", "#4ade80", "#60a5fa", "#ff8a3d", "#c084fc"];

/**
 * Builds one row of buildings as SVG path data:
 * silhouettes, lit + unlit windows, and rooftop details.
 */
function buildLayer(seed, o) {
  const rand = mulberry32(seed);
  const range = (min, max) => min + rand() * (max - min);

  let body = "";
  let unlit = "";
  const lit = ["", "", ""]; // three warm tints
  const flicker = [];
  const beacons = [];
  const strings = [];

  let x = -40;
  let i = 0;
  while (x < W + 40) {
    const w = range(o.minW, o.maxW);
    const cx = x + w / 2;
    const isLandmark = (o.landmarks || []).some((l) => Math.abs(cx - l) < w * 0.6);
    const h = isLandmark ? range(o.landmarkMin, o.landmarkMax) : range(o.minH, o.maxH);
    const top = H - h;
    body += rect(x, top, w, h);

    // Rooftop shape / details
    const kind = isLandmark ? (rand() < 0.5 ? 0.1 : 0.45) : rand();
    if (kind < 0.24) {
      // Setback (stepped) top
      const sw = w * range(0.5, 0.7);
      const sh = range(18, 40);
      body += rect(x + (w - sw) / 2, top - sh, sw, sh);
      if (o.details && rand() < 0.6) {
        const ah = range(18, 34);
        body += rect(x + w / 2 - 1, top - sh - ah, 2, ah);
        beacons.push({ x: r1(x + w / 2), y: r1(top - sh - ah), d: r1(rand() * 2) });
      }
    } else if (kind < 0.36) {
      // Spire
      const sw = w * 0.34;
      const sh = range(26, 50);
      body += `M${r1(x + (w - sw) / 2)} ${r1(top)}L${r1(cx)} ${r1(top - sh)}L${r1(x + (w + sw) / 2)} ${r1(top)}Z`;
    } else if (kind < 0.52 && o.details) {
      // Antenna with blinking red aircraft light
      const ah = range(22, 44);
      body += rect(cx - 1, top - ah, 2, ah);
      beacons.push({ x: r1(cx), y: r1(top - ah), d: r1(rand() * 2) });
    } else if (kind < 0.66 && o.details) {
      // Rooftop water tank on legs
      const tx = x + range(8, Math.max(9, w - 30));
      body += rect(tx, top - 16, 20, 11) + rect(tx + 2, top - 5, 2, 5) + rect(tx + 16, top - 5, 2, 5);
    } else if (o.details && w > 85 && strings.length < 6) {
      // Diwali string lights sagging across a flat roof
      const bulbs = [];
      const n = Math.floor((w - 8) / 10);
      for (let b = 0; b <= n; b += 1) {
        const t = b / n;
        bulbs.push({
          x: r1(x + 4 + t * (w - 8)),
          y: r1(top + 5 + 9 * 4 * t * (1 - t)),
          c: BULB_COLORS[(b + i) % BULB_COLORS.length],
          g: b % 3,
        });
      }
      strings.push({ x1: r1(x + 4), x2: r1(x + w - 4), y: r1(top + 5), bulbs });
    }

    // Window grid: every window drawn (faint when unlit) so facades read clearly.
    // Each floor gets its own "occupancy" so lit windows cluster naturally.
    const cols = Math.floor((w - 12) / o.winGapX);
    const rows = Math.floor((h - 18) / o.winGapY);
    const offsetX = x + (w - cols * o.winGapX) / 2 + (o.winGapX - o.winW) / 2;
    for (let rr = 0; rr < rows; rr += 1) {
      const floorLit = o.lit * range(0.3, 1.9);
      for (let c = 0; c < cols; c += 1) {
        const wx = offsetX + c * o.winGapX;
        const wy = top + 14 + rr * o.winGapY;
        if (rand() < floorLit) {
          if (o.details && flicker.length < 14 && rand() < 0.04) {
            flicker.push({ x: r1(wx), y: r1(wy), d: r1(rand() * 7) });
          } else {
            lit[(rand() * 3) | 0] += rect(wx, wy, o.winW, o.winH);
          }
        } else {
          unlit += rect(wx, wy, o.winW, o.winH);
        }
      }
    }

    x += w + range(o.gapMin, o.gapMax);
    i += 1;
  }

  return { body, unlit, lit, flicker, beacons, strings };
}

// Far: tall, hazy towers for depth
const FAR = buildLayer(77, {
  minW: 34, maxW: 80, minH: 150, maxH: 270, gapMin: -8, gapMax: 2,
  landmarks: [CENTER - 150, CENTER + 210], landmarkMin: 290, landmarkMax: 320,
  winW: 3, winH: 4, winGapX: 8, winGapY: 11, lit: 0.1, details: false,
});

// Mid: medium buildings
const MID = buildLayer(512, {
  minW: 50, maxW: 105, minH: 110, maxH: 210, gapMin: -4, gapMax: 6,
  landmarks: [CENTER - 260, CENTER + 90], landmarkMin: 230, landmarkMax: 265,
  winW: 4, winH: 6, winGapX: 10, winGapY: 14, lit: 0.2, details: false,
});

// Near: big, detailed buildings
const NEAR = buildLayer(1410, {
  minW: 66, maxW: 135, minH: 80, maxH: 170, gapMin: 3, gapMax: 14,
  landmarks: [CENTER - 120, CENTER + 150], landmarkMin: 200, landmarkMax: 235,
  winW: 7, winH: 10, winGapX: 15, winGapY: 20, lit: 0.3, details: true,
});

/** Night-time city skyline with lit windows, aircraft beacons and Diwali string lights. */
export default function CitySkyline() {
  return (
    <div className={styles.skyline} aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="city-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff9f45" stopOpacity="0" />
            <stop offset="0.55" stopColor="#ff9f45" stopOpacity="0.12" />
            <stop offset="1" stopColor="#ffb057" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="city-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#222c5c" />
            <stop offset="1" stopColor="#151c40" />
          </linearGradient>
          <linearGradient id="city-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#131a3c" />
            <stop offset="1" stopColor="#0b1029" />
          </linearGradient>
          <linearGradient id="city-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a0f26" />
            <stop offset="1" stopColor="#03050d" />
          </linearGradient>
        </defs>

        {/* Warm city-light glow on the horizon behind the buildings */}
        <rect x="0" y="0" width={W} height={H} fill="url(#city-glow)" />

        {/* Far layer */}
        <path d={FAR.body} fill="url(#city-far)" opacity="0.9" />
        <path d={FAR.lit.join("")} fill="#f6c96b" opacity="0.35" />

        {/* Mid layer */}
        <path d={MID.body} fill="url(#city-mid)" stroke="#3a4a8a" strokeOpacity="0.35" strokeWidth="1" />
        <path d={MID.unlit} fill="#2a3566" opacity="0.35" />
        <path d={MID.lit.join("")} fill="#ffcf7a" opacity="0.55" />

        {/* Near layer */}
        <path d={NEAR.body} fill="url(#city-near)" stroke="#5a6bb0" strokeOpacity="0.45" strokeWidth="1.2" />
        <path d={NEAR.unlit} fill="#26305e" opacity="0.55" />
        <path d={NEAR.lit[0]} fill="#ffd27a" opacity="0.95" />
        <path d={NEAR.lit[1]} fill="#ffb85c" opacity="0.85" />
        <path d={NEAR.lit[2]} fill="#fff0c4" opacity="0.8" />

        {NEAR.flicker.map((f, i) => (
          <rect
            key={`f${i}`}
            className={styles.flicker}
            x={f.x}
            y={f.y}
            width="7"
            height="10"
            style={{ animationDelay: `${f.d}s` }}
          />
        ))}

        {NEAR.beacons.map((b, i) => (
          <circle
            key={`b${i}`}
            className={styles.beacon}
            cx={b.x}
            cy={b.y}
            r="2.8"
            style={{ animationDelay: `${b.d}s` }}
          />
        ))}

        {NEAR.strings.map((s, i) => (
          <g key={`s${i}`}>
            <path
              d={`M${s.x1} ${s.y}Q${(s.x1 + s.x2) / 2} ${s.y + 18} ${s.x2} ${s.y}`}
              fill="none"
              stroke="#4a3a2a"
              strokeWidth="0.8"
            />
            {s.bulbs.map((b, j) => (
              <circle
                key={j}
                className={`${styles.bulb} ${styles[`bulb${b.g}`]}`}
                cx={b.x}
                cy={b.y}
                r="2.4"
                fill={b.c}
              />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
