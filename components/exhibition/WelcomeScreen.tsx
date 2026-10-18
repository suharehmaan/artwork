"use client";

import { useState } from "react";
import styles from "./WelcomeScreen.module.css";
import { exhibitionIntro } from "@/lib/exhibition/scenes";

type WelcomeScreenProps = {
  open: boolean;
  ready: boolean;
  error: string | null;
  onStart: () => void;
  onRetry: () => void;
};

export function WelcomeScreen({ open, ready, error, onStart, onRetry }: WelcomeScreenProps) {
  // Stays mounted while it fades out, then leaves the tree.
  const [faded, setFaded] = useState(false);

  if (!open && (faded || prefersReducedMotion())) {
    return null;
  }

  return (
    <div
      className={styles.scrim}
      data-open={open ? "true" : "false"}
      onTransitionEnd={(event) => {
        if (!open && event.target === event.currentTarget) {
          setFaded(true);
        }
      }}
    >
      <section className={styles.card} aria-labelledby="welcome-title">
        <p className={styles.kicker}>{exhibitionIntro.kicker}</p>
        <h1 id="welcome-title" className={styles.title}>
          {exhibitionIntro.title}
        </h1>
        <p className={styles.summary}>{exhibitionIntro.summary}</p>
        <ul className={styles.list}>
          <li>Drag to move around the picture. Use the wheel, a pinch, or the zoom buttons to look closer.</li>
          <li>Small markers sit on places with a story. Select one to move in and read about it.</li>
          <li>Explore stories lists the same places for the keyboard.</li>
        </ul>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {error ? (
          <button type="button" className={styles.start} onClick={onRetry}>
            Try again
          </button>
        ) : (
          <button type="button" className={styles.start} onClick={onStart} disabled={!ready}>
            {ready ? "Start exploring" : "Loading the street…"}
          </button>
        )}
      </section>
    </div>
  );
}

/** With reduced motion there is no fade, so no transitionend to wait for. */
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
