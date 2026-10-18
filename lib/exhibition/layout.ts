import type { Insets } from "./types";

/** At or below this width the story panel becomes a bottom sheet. */
export const COMPACT_MAX_WIDTH = 720;

const EDGE = 16;

export function isCompactViewport(width: number): boolean {
  return width <= COMPACT_MAX_WIDTH;
}

export function storyPanelWidth(viewportWidth: number): number {
  return Math.round(Math.min(400, Math.max(320, viewportWidth * 0.3)));
}

export function storySheetHeight(viewportHeight: number): number {
  return Math.round(Math.min(viewportHeight * 0.56, 520));
}

/**
 * Screen space the camera keeps clear when it frames something: the title bar,
 * the floating controls, and the story panel while one is open or about to open.
 */
export function viewInsets(width: number, height: number, storyOpen: boolean): Insets {
  if (isCompactViewport(width)) {
    return {
      top: 60,
      right: EDGE,
      bottom: storyOpen ? storySheetHeight(height) + EDGE : 72,
      left: EDGE,
    };
  }
  return {
    top: 68,
    right: storyOpen ? storyPanelWidth(width) + EDGE * 3 : 24,
    bottom: 68,
    left: 24,
  };
}

/** Space covered by the story panel. Pan limits extend past it so nothing is stuck underneath. */
export function panelInsets(width: number, height: number, storyOpen: boolean): Insets {
  if (!storyOpen) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  if (isCompactViewport(width)) {
    return { top: 0, right: 0, bottom: storySheetHeight(height), left: 0 };
  }
  return { top: 0, right: storyPanelWidth(width) + EDGE * 2, bottom: 0, left: 0 };
}
