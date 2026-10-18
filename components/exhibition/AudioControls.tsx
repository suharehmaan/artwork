"use client";

import { useEffect, useId, useRef } from "react";
import type { AudioSnapshot, NarrationTrack } from "@/lib/exhibition/types";
import styles from "./AudioControls.module.css";
import { CloseIcon, MuteIcon, PauseIcon, PlayIcon, VolumeIcon } from "./icons";

type AudioControlsProps = {
  track: NarrationTrack | null;
  snapshot: AudioSnapshot;
  panelOpen: boolean;
  onToggle: () => void;
  onMute: () => void;
  onOpenTranscript: () => void;
  onCloseTranscript: () => void;
};

export function AudioControls({
  track,
  snapshot,
  panelOpen,
  onToggle,
  onMute,
  onOpenTranscript,
  onCloseTranscript,
}: AudioControlsProps) {
  if (!track) {
    return null;
  }

  const playing = snapshot.status === "playing" && snapshot.trackId === track.id;
  const pending = snapshot.status === "checking" || snapshot.status === "loading";
  const hasSound =
    snapshot.trackId === track.id &&
    (snapshot.status === "ready" || snapshot.status === "playing" || snapshot.status === "paused");
  const message = snapshot.trackId === track.id ? snapshot.message : "";

  return (
    <div className={styles.wrap}>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onToggle}
          disabled={pending}
          aria-label={playing ? "Pause narration" : "Play narration"}
          aria-pressed={playing}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onMute}
          disabled={!hasSound}
          aria-label={snapshot.muted ? "Unmute narration" : "Mute narration"}
          aria-pressed={snapshot.muted}
        >
          {snapshot.muted ? <MuteIcon /> : <VolumeIcon />}
        </button>
        <button type="button" className={styles.textButton} onClick={onOpenTranscript}>
          Transcript
        </button>
      </div>
      {message ? (
        <p className={styles.message} role="status">
          {message}
        </p>
      ) : null}
      {panelOpen ? (
        <TranscriptPanel
          title={track.title}
          transcript={snapshot.transcript || track.transcript}
          message={message}
          onClose={onCloseTranscript}
        />
      ) : null}
    </div>
  );
}

function TranscriptPanel({
  title,
  transcript,
  message,
  onClose,
}: {
  title: string;
  transcript: string;
  message: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const panel = panelRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !panel) {
        return;
      }
      const items = Array.from(panel.querySelectorAll<HTMLElement>("button")).filter(
        (element) => !element.hasAttribute("disabled"),
      );
      if (items.length === 0) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    panel?.addEventListener("keydown", onKeyDown);
    return () => {
      panel?.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  return (
    <section
      ref={panelRef}
      className={styles.panel}
      role="dialog"
      aria-labelledby={titleId}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className={styles.header}>
        <p className={styles.kicker}>Narration</p>
        <button
          ref={closeRef}
          type="button"
          className={styles.iconButton}
          onClick={onClose}
          aria-label="Close transcript"
        >
          <CloseIcon />
        </button>
      </div>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {message ? <p className={styles.message}>{message}</p> : null}
      <p className={styles.transcript}>{transcript}</p>
    </section>
  );
}
