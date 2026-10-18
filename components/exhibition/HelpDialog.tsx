"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./Dialog.module.css";
import { CloseIcon } from "./icons";

type HelpDialogProps = {
  open: boolean;
  onClose: () => void;
};

const instructions = [
  "Drag with the mouse, trackpad, or one finger to move across the picture. A drag does not open anything.",
  "Zoom with the wheel or a two-finger pinch. The view stays centered on the pointer. The plus and minus buttons zoom from the middle, and the round arrow returns to the opening view.",
  "Small markers sit on places with a story. Hover or tab to one to see its name, or turn on Show points of interest to name them all.",
  "Select a marker or the object itself. The view moves to it and the story opens beside it. Closing the story returns the view to where it was.",
  "The teal doorway leads into a courtyard. Use Back or Escape to return to the street as you left it.",
  "Explore stories lists every place in the current scene for keyboard and screen reader use.",
];

export function HelpDialog({ open, onClose }: HelpDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const dialog = dialogRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) {
        return;
      }
      const items = Array.from(dialog.querySelectorAll<HTMLElement>("button"));
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
    return () => {
      dialog?.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
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
          <h2 id={titleId} className={styles.title}>
            How to look around
          </h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close help"
          >
            <CloseIcon />
          </button>
        </div>
        <ul className={styles.helpList}>
          {instructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
