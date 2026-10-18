"use client";

import styles from "./ExhibitionControls.module.css";
import { MinusIcon, PlusIcon, ResetIcon } from "./icons";

type ExhibitionControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export function ExhibitionControls({ onZoomIn, onZoomOut, onReset }: ExhibitionControlsProps) {
  return (
    <div className={styles.group} role="group" aria-label="Zoom">
      <button type="button" className={styles.button} onClick={onZoomOut} aria-label="Zoom out">
        <MinusIcon />
      </button>
      <button type="button" className={styles.button} onClick={onZoomIn} aria-label="Zoom in">
        <PlusIcon />
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={onReset}
        aria-label="Return to the opening view"
        title="Return to the opening view"
      >
        <ResetIcon />
      </button>
    </div>
  );
}
