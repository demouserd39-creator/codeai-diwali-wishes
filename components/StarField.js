import styles from "./StarField.module.css";

const STAR_COUNT = 80;
const COLORS = ["#ffffff", "#ffffff", "#e3ebff", "#fff3dc"];

// Seeded PRNG so server and client render identical stars (no hydration mismatch).
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

const round = (n) => Math.round(n * 100) / 100;
const rand = mulberry32(2026);

const STARS = Array.from({ length: STAR_COUNT }, (_, id) => {
  const kind = rand();
  // 70% tiny, 25% medium, 5% bright stars with a cross glint
  const tier = kind < 0.7 ? 0 : kind < 0.95 ? 1 : 2;
  const size = tier === 0 ? 1 + rand() * 0.7 : tier === 1 ? 1.8 + rand() * 0.7 : 2.6 + rand() * 0.6;
  return {
    id,
    tier,
    left: round(rand() * 100),
    // More stars higher up in the sky; none behind the skyline
    top: round(Math.pow(rand(), 1.35) * 70),
    size: round(size),
    color: COLORS[(rand() * COLORS.length) | 0],
    duration: round(2 + rand() * 3.5),
    delay: round(-rand() * 6),
    min: round(0.1 + rand() * 0.25),
  };
});

// Shooting stars: start position (%), cycle length and first delay
const SHOOTING = [
  { top: 10, left: 84, cycle: 9, delay: 2 },
  { top: 22, left: 40, cycle: 13, delay: 6 },
  { top: 6, left: 62, cycle: 17, delay: 10.5 },
];

/** Twinkling night-sky stars plus an occasional shooting star. Purely decorative. */
export default function StarField() {
  return (
    <div className={styles.field} aria-hidden="true">
      {STARS.map((s) => (
        <span
          key={s.id}
          className={`${styles.star} ${s.tier === 1 ? styles.medium : ""} ${s.tier === 2 ? styles.bright : ""}`}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            "--c": s.color,
            "--dur": `${s.duration}s`,
            "--delay": `${s.delay}s`,
            "--min": s.min,
          }}
        />
      ))}
      {SHOOTING.map((s, i) => (
        <span
          key={`shoot${i}`}
          className={styles.shooting}
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            animationDuration: `${s.cycle}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
