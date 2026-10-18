"use client";

import { useEffect, useId, useRef } from "react";
import type { Hotspot } from "@/lib/exhibition/types";
import { actionKindLabel } from "@/lib/exhibition/scenes";
import styles from "./Dialog.module.css";
import { CloseIcon } from "./icons";

type ExploreDialogProps = {
  open: boolean;
  sceneTitle: string;
  hotspots: Hotspot[];
  onClose: () => void;
  onChoose: (hotspot: Hotspot) => void;
  onFocusHotspot: (hotspotId: string | null) => void;
};

export function ExploreDialog({
  open,
  sceneTitle,
  hotspots,
  onClose,
  onChoose,
  onFocusHotspot,
}: ExploreDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      onFocusHotspot(null);
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [open, onFocusHotspot]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const dialog = dialogRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) {
        return;
      }
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>("button"),
      ).filter((element) => !element.hasAttribute("disabled"));
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
    dialog?.addEventListener("keydown", onKeyDown);
    return () => dialog?.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles.scrim} onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>{sceneTitle}</p>
            <h2 id={titleId} className={styles.title}>
              Explore stories
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close story list"
          >
            <CloseIcon />
          </button>
        </div>
        <ul className={styles.list}>
          {hotspots.map((hotspot) => (
            <li key={hotspot.id}>
              <button
                type="button"
                className={styles.item}
                onClick={() => onChoose(hotspot)}
                onFocus={() => onFocusHotspot(hotspot.id)}
                onBlur={() => onFocusHotspot(null)}
              >
                <span className={styles.kind}>{actionKindLabel(hotspot.action)}</span>
                <span className={styles.itemTitle}>{hotspot.label}</span>
                <span className={styles.summary}>{hotspot.summary}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
