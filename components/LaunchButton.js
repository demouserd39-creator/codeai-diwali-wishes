"use client";

import { useState } from "react";
import styles from "./LaunchButton.module.css";

function RocketIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      {/* Cone */}
      <path d="M12 1.5 L15.2 6 H8.8 Z" />
      {/* Body */}
      <rect x="9" y="6.6" width="6" height="8.4" rx="1" />
      {/* Bands */}
      <rect className={styles.band} x="9" y="9" width="6" height="1.1" />
      <rect className={styles.band} x="9" y="12" width="6" height="1.1" />
      {/* Stick */}
      <rect x="11.35" y="15" width="1.3" height="7.5" rx="0.65" />
      {/* Sparks */}
      <path className={styles.sparks} d="M8.4 17.2 L6.6 18.6 M15.6 17.2 L17.4 18.6 M7.8 20.4 L6 21" />
    </svg>
  );
}

function TapHand() {
  return (
    <svg className={styles.hand} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10h.5V8.5a1.5 1.5 0 0 1 3 0V10h.5V9.5a1.5 1.5 0 0 1 3 0v5.5c0 3.5-2.5 6-6 6h-1c-2 0-3.3-.8-4.4-2.2L4.6 15.4a1.5 1.5 0 0 1 2.2-2L9 15.5Z" />
    </svg>
  );
}

/**
 * Round golden icon button that launches fireworks.
 * Until the first tap it shows a "tap here" hint: label, bouncing arrow and a tapping hand.
 * @param {{ onLaunch: (event) => void, label?: string, hint?: string }} props
 */
export default function LaunchButton({
  onLaunch,
  label = "Launch Diwali crackers",
  hint = "Tap to launch crackers",
}) {
  const [launchKey, setLaunchKey] = useState(0);
  const showHint = launchKey === 0;

  function handleClick(event) {
    setLaunchKey((k) => k + 1);
    onLaunch?.(event);
  }

  return (
    <div className={`${styles.wrap} ${showHint ? styles.hinting : styles.hintDone}`}>
      <div className={styles.hintLabel} aria-hidden="true">
        <span>{hint}</span>
        <svg className={styles.arrow} viewBox="0 0 24 24">
          <path d="M6 9 L12 15 L18 9" />
        </svg>
      </div>

      <button type="button" className={styles.button} onClick={handleClick} aria-label={label} title={label}>
        <span className={styles.pulse} aria-hidden="true" />
        <span className={`${styles.pulse} ${styles.pulseLate}`} aria-hidden="true" />
        <span className={styles.tapRing} aria-hidden="true" />
        <span key={launchKey} className={launchKey ? styles.launching : styles.idle}>
          <RocketIcon />
        </span>
      </button>

      <TapHand />
    </div>
  );
}
