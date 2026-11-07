"use client";

import styles from "./SoundToggle.module.css";

/**
 * Small round speaker button to mute / unmute firework sounds.
 * @param {{ muted: boolean, onToggle: () => void }} props
 */
export default function SoundToggle({ muted, onToggle }) {
  const label = muted ? "Turn sound on" : "Turn sound off";

  return (
    <button type="button" className={styles.button} onClick={onToggle} aria-label={label} title={label}>
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
        <path className={styles.speaker} d="M4 9.5 H7.5 L12 5.5 V18.5 L7.5 14.5 H4 Z" />
        {muted ? (
          <path className={styles.line} d="M15.5 9.5 L20.5 14.5 M20.5 9.5 L15.5 14.5" />
        ) : (
          <>
            <path className={styles.line} d="M15 9.2 C16.4 10.6 16.4 13.4 15 14.8" />
            <path className={styles.line} d="M17.6 6.8 C20.5 9.6 20.5 14.4 17.6 17.2" />
          </>
        )}
      </svg>
    </button>
  );
}
