"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import FireworksEngine from "@/lib/fireworks";
import FireworksAudio from "@/lib/fireworksAudio";
import styles from "./FireworksCanvas.module.css";

// Screen position (0–1) → stereo pan (-0.75 left … 0.75 right)
const toPan = (x) => (x * 2 - 1) * 0.75;

/**
 * Full-screen, click-through canvas that renders fireworks with synthesised sound.
 * Parent controls it through the ref: ref.current.launchShow(x, y)
 * The animation loop only runs while fireworks are on screen.
 * @param {{ ref?: object, muted?: boolean, onShowBurst?: ({ x, y }) => void }} props
 *   onShowBurst – fires at the main boom of a show, with its position (0–1 of screen).
 */
export default function FireworksCanvas({ ref, muted = false, onShowBurst }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const audioRef = useRef(null);

  // Keep the latest callback without re-creating the engine
  const onShowBurstRef = useRef(onShowBurst);
  useEffect(() => {
    onShowBurstRef.current = onShowBurst;
  });

  useEffect(() => {
    const audio = new FireworksAudio();
    audioRef.current = audio;

    const engine = new FireworksEngine(canvasRef.current, {
      onLaunch: ({ x, fuse }) => {
        const pan = toPan(x);
        audio.rocket(fuse, pan);
        // 5) Sparks crackling off the rocket's trail as it climbs
        audio.crackle(0.08, fuse * 0.9, pan, 22, 0.45);
      },
      onExplode: ({ x, type, power }) => {
        const pan = toPan(x);
        if (power >= 1.3) audio.boom(power, pan);
        else audio.pop(power, pan);

        if (type === "willow") audio.crackle(0.7, 2.0, pan);
        else if (type === "strobe") audio.crackle(0.4, 1.2, pan, 30);
      },
      onShowBurst: (e) => onShowBurstRef.current?.(e),
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
      audio.close();
      engineRef.current = null;
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setMuted(muted);
  }, [muted]);

  // No dependency list: the handle is rebuilt on every render, so it never goes stale.
  useImperativeHandle(ref, () => ({
    launchVolley: (x, y, count) => engineRef.current?.launchVolley(x, y, count),
    launchShow: (x, y) => engineRef.current?.launchShow(x, y),
  }));

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
