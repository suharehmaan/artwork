import gsap from "gsap";
import type { CameraState, Insets, Point, Rect } from "@/lib/exhibition/types";

type Size = {
  width: number;
  height: number;
};

const ZOOM_HEADROOM = 8;
const PAN_SLACK = 72;
const FIT_PADDING = 16;
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Maps a world container's position and scale to the viewport.
 * `x` and `y` are the screen position of the world origin.
 *
 * Only one camera animation runs at a time. Starting another one, or any direct
 * pan or zoom, stops the current one and resolves its promise with `false`.
 */
export class CameraController {
  private state: CameraState = { x: 0, y: 0, zoom: 1 };
  private viewport: Size = { width: 1, height: 1 };
  private worldSize: Size = { width: 1, height: 1 };
  private insets: Insets = NO_INSETS;
  private minZoom = 0.1;
  private maxZoom = 1;
  private tween: gsap.core.Tween | null = null;
  private settle: ((completed: boolean) => void) | null = null;
  private reducedMotion = false;

  constructor(
    private readonly world: {
      position: { set: (x: number, y: number) => void };
      scale: { set: (scale: number) => void };
    },
    private readonly onChange?: (state: CameraState) => void,
  ) {}

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
    if (value) {
      this.finishNow();
    }
  }

  setViewport(width: number, height: number): void {
    const previous = this.viewport;
    const centerWorldX = (previous.width / 2 - this.state.x) / this.state.zoom;
    const centerWorldY = (previous.height / 2 - this.state.y) / this.state.zoom;
    this.viewport = {
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
    this.updateZoomLimits();
    const zoom = this.clampZoom(this.state.zoom);
    this.commit(
      this.clampState({
        zoom,
        x: this.viewport.width / 2 - centerWorldX * zoom,
        y: this.viewport.height / 2 - centerWorldY * zoom,
      }),
    );
  }

  setWorldSize(width: number, height: number): void {
    this.worldSize = {
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
    this.updateZoomLimits();
  }

  /**
   * Screen space covered by an open panel. Pan limits extend past it, so the
   * edge of the artwork can be moved out from under the panel.
   */
  setInsets(insets: Insets): void {
    this.insets = insets;
  }

  getState(): CameraState {
    return { ...this.state };
  }

  getViewport(): Size {
    return { ...this.viewport };
  }

  zoomBy(factor: number): void {
    const screenX = this.viewport.width / 2;
    const screenY = this.viewport.height / 2;
    const duration = this.duration(0.28);
    if (duration <= 0) {
      this.zoomAt(screenX, screenY, factor);
      return;
    }
    const zoom = this.clampZoom(this.state.zoom * factor);
    const worldX = (screenX - this.state.x) / this.state.zoom;
    const worldY = (screenY - this.state.y) / this.state.zoom;
    void this.animateTo(
      { zoom, x: screenX - worldX * zoom, y: screenY - worldY * zoom },
      duration,
    );
  }

  zoomToFocus(focus: Point, magnification: number): Promise<boolean> {
    const zoom = this.clampZoom(this.fittedZoom() * magnification);
    return this.animateTo(
      {
        zoom,
        x: this.viewport.width / 2 - focus.x * this.worldSize.width * zoom,
        y: this.viewport.height / 2 - focus.y * this.worldSize.height * zoom,
      },
      this.duration(0.85),
    );
  }

  /** Direct zoom used by the wheel and pinch. The focal screen point stays put. */
  zoomAt(screenX: number, screenY: number, factor: number): void {
    this.stop();
    const prevZoom = this.state.zoom;
    const nextZoom = this.clampZoom(prevZoom * factor);
    const worldX = (screenX - this.state.x) / prevZoom;
    const worldY = (screenY - this.state.y) / prevZoom;
    this.commit(
      this.clampState({
        zoom: nextZoom,
        x: screenX - worldX * nextZoom,
        y: screenY - worldY * nextZoom,
      }),
    );
  }

  panBy(dx: number, dy: number): void {
    this.stop();
    this.commit(
      this.clampState({
        ...this.state,
        x: this.state.x + dx,
        y: this.state.y + dy,
      }),
    );
  }

  /**
   * Camera that places a world rectangle in the middle of a screen area.
   * `fill` is the share of the area the rectangle may take up, so lower values
   * keep more of the surrounding scene in view.
   */
  stateForRect(rect: Rect, area: Rect, fill: number): CameraState {
    const zoom = this.clampZoom(
      Math.min(
        (area.width * fill) / Math.max(1, rect.width),
        (area.height * fill) / Math.max(1, rect.height),
      ),
    );
    return this.clampState({
      zoom,
      x: area.x + area.width / 2 - (rect.x + rect.width / 2) * zoom,
      y: area.y + area.height / 2 - (rect.y + rect.height / 2) * zoom,
    });
  }

  /**
   * Opening view. Fills the viewport where it can, but never so far that the
   * `interest` rectangle (the scene's points of interest) leaves the safe area.
   * On a portrait screen the picture fills the safe height and can be dragged sideways.
   */
  homeState(interest: Rect, safe: Rect, center?: Point): CameraState {
    const cover = Math.max(
      this.viewport.width / this.worldSize.width,
      this.viewport.height / this.worldSize.height,
    );
    const keep = Math.min(
      safe.width / Math.max(1, interest.width),
      safe.height / Math.max(1, interest.height),
    );
    let zoom = Math.min(cover, keep);
    if (this.viewport.width < this.viewport.height) {
      zoom = Math.max(zoom, Math.min(cover, safe.height / this.worldSize.height));
    }
    zoom = this.clampZoom(zoom);
    const focusX = center?.x ?? interest.x + interest.width / 2;
    const focusY = center?.y ?? interest.y + interest.height / 2;
    // No paper margin on an axis the picture already covers.
    return {
      zoom,
      x: coverAxis(
        safe.x + safe.width / 2 - focusX * zoom,
        this.worldSize.width * zoom,
        this.viewport.width,
      ),
      y: coverAxis(
        safe.y + safe.height / 2 - focusY * zoom,
        this.worldSize.height * zoom,
        this.viewport.height,
      ),
    };
  }

  /**
   * Moves to `target`. Resolves `true` when it arrives and `false` if another
   * animation or direct navigation interrupts it.
   */
  animateTo(target: CameraState, duration: number): Promise<boolean> {
    this.stop();
    const end = this.clampState(target);
    if (duration <= 0 || this.reducedMotion) {
      this.commit(end);
      return Promise.resolve(true);
    }
    const start = { ...this.state };
    const halfWidth = this.viewport.width / 2;
    const halfHeight = this.viewport.height / 2;
    const from = {
      x: (halfWidth - start.x) / start.zoom,
      y: (halfHeight - start.y) / start.zoom,
    };
    const to = {
      x: (halfWidth - end.x) / end.zoom,
      y: (halfHeight - end.y) / end.zoom,
    };
    const ratio = end.zoom / start.zoom;
    const progress = { t: 0 };
    return new Promise<boolean>((resolve) => {
      this.settle = resolve;
      // Zoom changes geometrically and the view center moves in world space,
      // so a long zoom does not swing sideways.
      this.tween = gsap.to(progress, {
        t: 1,
        duration,
        ease: "power3.inOut",
        onUpdate: () => {
          const t = progress.t;
          const zoom = start.zoom * Math.pow(ratio, t);
          const centerX = from.x + (to.x - from.x) * t;
          const centerY = from.y + (to.y - from.y) * t;
          this.commit({
            zoom,
            x: halfWidth - centerX * zoom,
            y: halfHeight - centerY * zoom,
          });
        },
        onComplete: () => {
          this.tween = null;
          this.commit(end);
          const done = this.settle;
          this.settle = null;
          done?.(true);
        },
      });
    });
  }

  /** Stops the running animation where it is. */
  stop(): void {
    if (this.tween) {
      this.tween.kill();
      this.tween = null;
    }
    const done = this.settle;
    this.settle = null;
    done?.(false);
  }

  destroy(): void {
    this.stop();
  }

  private finishNow(): void {
    if (this.tween) {
      this.tween.progress(1);
    }
  }

  private duration(seconds: number): number {
    return this.reducedMotion ? 0 : seconds;
  }

  private fittedZoom(): number {
    const availableWidth = Math.max(1, this.viewport.width - FIT_PADDING * 2);
    const availableHeight = Math.max(1, this.viewport.height - FIT_PADDING * 2);
    return Math.min(
      availableWidth / this.worldSize.width,
      availableHeight / this.worldSize.height,
    );
  }

  private updateZoomLimits(): void {
    const fit = this.fittedZoom();
    this.minZoom = fit;
    this.maxZoom = fit * ZOOM_HEADROOM;
  }

  private clampZoom(zoom: number): number {
    return Math.min(this.maxZoom, Math.max(this.minZoom, zoom));
  }

  private clampState(state: CameraState): CameraState {
    const zoom = this.clampZoom(state.zoom);
    return {
      zoom,
      x: clampAxis(
        state.x,
        this.worldSize.width * zoom,
        this.viewport.width,
        this.insets.left,
        this.insets.right,
      ),
      y: clampAxis(
        state.y,
        this.worldSize.height * zoom,
        this.viewport.height,
        this.insets.top,
        this.insets.bottom,
      ),
    };
  }

  private commit(state: CameraState): void {
    this.state.x = state.x;
    this.state.y = state.y;
    this.state.zoom = state.zoom;
    this.world.position.set(state.x, state.y);
    this.world.scale.set(state.zoom);
    this.onChange?.(this.getState());
  }
}

/** Centres a picture smaller than the viewport, otherwise keeps it edge to edge. */
function coverAxis(offset: number, size: number, viewport: number): number {
  if (size <= viewport) {
    return (viewport - size) / 2;
  }
  return Math.min(0, Math.max(viewport - size, offset));
}

/**
 * Keeps the artwork within reach on one axis. The open space between the
 * insets is what counts, so an edge can be pulled clear of a panel.
 */
function clampAxis(
  offset: number,
  size: number,
  viewport: number,
  startInset: number,
  endInset: number,
): number {
  const available = Math.max(1, viewport - startInset - endInset);
  const slack = Math.min(PAN_SLACK, available * 0.15);
  if (size + slack * 2 <= available) {
    return startInset + (available - size) / 2;
  }
  const min = viewport - endInset - size - slack;
  const max = startInset + slack;
  return Math.min(max, Math.max(min, offset));
}
