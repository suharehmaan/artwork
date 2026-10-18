"use client";

import { useEffect, useId, useRef } from "react";
import type { StoryContent } from "@/lib/exhibition/types";
import styles from "./StoryPanel.module.css";
import { CloseIcon } from "./icons";

type StoryPanelProps = {
  story: StoryContent | null;
  sceneTitle: string;
  onClose: () => void;
};

/**
 * A caption beside the picture. It is not modal: the scene stays visible and
 * usable, focus moves into the panel when it opens and returns when it closes.
 */
export function StoryPanel({ story, sceneTitle, onClose }: StoryPanelProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!story) {
      return;
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      const target =
        previouslyFocused?.isConnected && previouslyFocused !== document.body
          ? previouslyFocused
          : document.querySelector<HTMLElement>(".exhibition-canvas-host");
      target?.focus({ preventScroll: true });
    };
  }, [story]);

  if (!story) {
    return null;
  }

  return (
    <aside
      key={story.id}
      className={styles.panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
    >
      <div className={styles.header}>
        <p className={styles.kicker}>Story · {sceneTitle}</p>
        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close story"
        >
          <CloseIcon />
        </button>
      </div>
      <h2 id={titleId} className={styles.title}>
        {story.title}
      </h2>
      {story.image ? (
        <figure className={styles.figure}>
          {/* Story images are plain public files sized for this panel. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.image} src={story.image} alt={story.imageAlt ?? ""} />
          {story.caption ? <figcaption className={styles.caption}>{story.caption}</figcaption> : null}
        </figure>
      ) : null}
      <p className={styles.text}>{story.text}</p>
    </aside>
  );
}
