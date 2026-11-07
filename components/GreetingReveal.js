"use client";

import styles from "./GreetingReveal.module.css";

// Twinkling stars around the word (positions are % of the word's box)
const SPARKLES = [
  { left: -6, top: 18, size: 14, delay: 0.7 },
  { left: 9, top: -32, size: 10, delay: 1.5 },
  { left: 27, top: 108, size: 12, delay: 1.1 },
  { left: 47, top: -42, size: 16, delay: 0.9 },
  { left: 66, top: 104, size: 10, delay: 1.9 },
  { left: 84, top: -30, size: 13, delay: 1.3 },
  { left: 104, top: 36, size: 15, delay: 0.8 },
  { left: 36, top: -18, size: 8, delay: 2.3 },
];

/**
 * Cinematic "Happy Diwali" reveal at a firework burst:
 * letters fly out of the burst, a glint sweeps across, stars twinkle,
 * then the letters fall away like embers. Calls onDone when finished.
 * A sparkler then "writes" the company signature underneath.
 * The whole block is centred on screen (see .greeting in the CSS).
 * @param {{ text: string, tagline?: string, signatureLead?: string,
 *   signatureName?: string, onDone?: () => void }} props
 */
export default function GreetingReveal({ text, tagline, signatureLead, signatureName, onDone }) {
  const letters = [...text];
  const mid = (letters.length - 1) / 2;

  return (
    <div
      className={styles.greeting}
      aria-hidden="true"
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) onDone?.();
      }}
    >
      <span className={styles.halo} />

      <p className={styles.word}>
        {letters.map((ch, i) => (
          <span
            key={i}
            className={ch === " " ? styles.space : styles.letter}
            style={{
              "--i": i,
              // Start at the burst centre, spun slightly; fall with a little drift
              "--fx": `${((mid - i) * 0.62).toFixed(2)}em`,
              "--r": `${(((i * 37) % 11) - 5) * 9}deg`,
              "--ox": `${(((i * 53) % 7) - 3) * 0.08}em`,
              "--or": `${(((i * 29) % 9) - 4) * 8}deg`,
            }}
          >
            {ch === " " ? " " : ch}
          </span>
        ))}

        {SPARKLES.map((s, i) => (
          <svg
            key={i}
            className={styles.sparkle}
            viewBox="0 0 24 24"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              "--d": `${s.delay}s`,
            }}
          >
            <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" />
          </svg>
        ))}
      </p>

      {tagline && <p className={styles.tagline}>{tagline}</p>}

      {signatureName && (
        <div className={styles.signature}>
          {signatureLead && <span className={styles.sigLead}>{signatureLead}</span>}
          <span className={styles.sigNameWrap}>
            <span className={styles.sigName}>{signatureName}</span>
            <span className={styles.sigSpark} />
          </span>
          <span className={styles.sigLine} />
        </div>
      )}
    </div>
  );
}
