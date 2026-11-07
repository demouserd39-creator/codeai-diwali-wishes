"use client";

import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import CitySkyline from "./CitySkyline";
import FireworksCanvas from "./FireworksCanvas";
import GreetingReveal from "./GreetingReveal";
import LaunchButton from "./LaunchButton";
import SoundToggle from "./SoundToggle";
import StarField from "./StarField";
import styles from "./WelcomeScreen.module.css";

const MUTE_KEY = "diwali-sound-muted";

/** Full-screen Diwali night sky with a launch icon that fires crackers. */
export default function WelcomeScreen() {
  const fireworksRef = useRef(null);
  const [muted, setMuted] = useState(false);
  // Set at each main boom; `id` changes so the reveal animation replays every show
  const [greeting, setGreeting] = useState(null);

  function handleShowBurst() {
    setGreeting((prev) => ({ id: (prev?.id ?? 0) + 1 }));
  }

  // Restore the visitor's mute choice (browser storage may be unavailable — ignore then)
  useEffect(() => {
    try {
      if (localStorage.getItem(MUTE_KEY) === "1") setMuted(true);
    } catch {}
  }, []);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    try {
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {}
  }

  // One cracker rises straight up from the icon and opens into a fireworks show
  function handleLaunch(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    fireworksRef.current?.launchShow(rect.left + rect.width / 2, rect.top + rect.height * 0.3);
  }

  return (
    <main className={styles.screen}>
      {/* Atmosphere layers (decorative) */}
      <div className={styles.sky} aria-hidden="true">
        <div className={`${styles.stars} ${styles.starsA}`} />
        <div className={`${styles.stars} ${styles.starsB}`} />
        <div className={`${styles.ambient} ${styles.ambientLeft}`} />
        <div className={`${styles.ambient} ${styles.ambientRight}`} />
        <div className={styles.horizon} />
      </div>
      <StarField />
      <CitySkyline />
      <div className={styles.vignette} aria-hidden="true" />
      <FireworksCanvas ref={fireworksRef} muted={muted} onShowBurst={handleShowBurst} />

      {greeting && (
        <GreetingReveal
          key={greeting.id}
          text={siteConfig.title}
          tagline={siteConfig.greetingTagline}
          signatureLead={siteConfig.signatureLead}
          signatureName={siteConfig.signatureName}
          // Remove once finished (unless a newer show already replaced it)
          onDone={() => setGreeting((g) => (g?.id === greeting.id ? null : g))}
        />
      )}

      <h1 className={styles.srOnly}>{siteConfig.title}</h1>

      <footer className={`${styles.brand} ${styles.reveal}`} style={{ "--d": "0.4s" }}>
        <div className={styles.launch}>
          <span aria-hidden="true" />
          <LaunchButton onLaunch={handleLaunch} hint={siteConfig.launchHint} />
          <div className={styles.soundSlot}>
            <SoundToggle muted={muted} onToggle={toggleMute} />
          </div>
        </div>
      </footer>
    </main>
  );
}
