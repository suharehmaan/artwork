"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import {
  Application,
  Container,
  FederatedPointerEvent,
  Rectangle,
  Sprite,
} from "pixi.js";
import gsap from "gsap";
import type {
  CameraState,
  Hotspot,
  Insets,
  Point,
  Rect,
  Scene,
  SceneLayer,
} from "@/lib/exhibition/types";
import { getScene, scenes } from "@/lib/exhibition/scenes";
import { CameraController } from "./CameraController";
import { HotspotLayer, buildRegions, type HotspotRegion } from "./HotspotLayer";
import { loadCappedTexture, maxTextureEdge, type LoadedTexture } from "./loadTexture";

const DRAG_THRESHOLD = 8;
const RESOLUTION_CAP = 2;
const PAPER = "#f4efe5";
const CROSSFADE_SECONDS = 0.45;
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export type CanvasStatus =
  | { state: "loading"; message: string }
  | { state: "ready" }
  | { state: "error"; message: string };

/** Marker anchors for the scene on screen, in world pixels. */
export type SceneLayout = {
  sceneId: string;
  anchors: Record<string, Point>;
};

export type ExhibitionCanvasHandle = {
  showScene: (
    sceneId: string,
    options?: { camera?: CameraState | null; transition?: "cut" | "crossfade" },
  ) => Promise<void>;
  preloadScene: (sceneId: string) => void;
  zoomBy: (factor: number) => void;
  panBy: (dx: number, dy: number) => void;
  zoomTo: (focus: Point, magnification: number) => void;
  resetView: () => void;
  getCamera: () => CameraState;
  /** Animates back to a saved camera. */
  restoreCamera: (camera: CameraState) => Promise<boolean>;
  /** Frames a hotspot inside the clear part of the screen. Resolves `false` if interrupted. */
  focusHotspot: (
    hotspotId: string,
    options: { fill: number; duration?: number },
  ) => Promise<boolean>;
  /** Pans a hotspot into view if its marker is off screen. */
  revealHotspot: (hotspotId: string) => void;
  /** `view` is kept clear when framing; `panel` extends the pan limits. */
  setInsets: (view: Insets, panel: Insets) => void;
  wheel: (event: WheelEvent) => void;
  setHotspotDebug: (enabled: boolean) => void;
};

export type ExhibitionCanvasProps = {
  onReady: (handle: ExhibitionCanvasHandle | null) => void;
  onActivateHotspot: (hotspot: Hotspot) => void;
  onStatus: (status: CanvasStatus) => void;
  onCamera: (camera: CameraState) => void;
  onLayout: (layout: SceneLayout | null) => void;
  onHoverHotspot: (hotspotId: string | null) => void;
  onDebugPointer?: (point: Point | null) => void;
};

type PointerPoint = { x: number; y: number };

type SceneArt = {
  base: LoadedTexture;
  layers: Array<{ layer: SceneLayer; loaded: LoadedTexture }>;
};

export function ExhibitionCanvas({
  onReady,
  onActivateHotspot,
  onStatus,
  onCamera,
  onLayout,
  onHoverHotspot,
  onDebugPointer,
}: ExhibitionCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<ExhibitionCanvasHandle | null>(null);
  const callbacksRef = useRef({
    onReady,
    onActivateHotspot,
    onStatus,
    onCamera,
    onLayout,
    onHoverHotspot,
    onDebugPointer,
  });

  useEffect(() => {
    callbacksRef.current = {
      onReady,
      onActivateHotspot,
      onStatus,
      onCamera,
      onLayout,
      onHoverHotspot,
      onDebugPointer,
    };
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let cancelled = false;
    let app: Application | null = null;
    let dispose: (() => void) | null = null;

    const start = async () => {
      const application = new Application();
      const width = host.clientWidth || window.innerWidth;
      const height = host.clientHeight || window.innerHeight;
      await application.init({
        width,
        height,
        background: PAPER,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, RESOLUTION_CAP),
        preference: "webgl",
      });

      if (cancelled) {
        application.destroy({ removeView: true }, { children: true });
        return;
      }

      app = application;
      application.canvas.style.touchAction = "none";
      application.canvas.style.display = "block";
      application.canvas.style.width = "100%";
      application.canvas.style.height = "100%";
      host.appendChild(application.canvas);

      const session = new ExhibitionSession(application, host, {
        onActivate: (hotspot) => callbacksRef.current.onActivateHotspot(hotspot),
        onStatus: (status) => callbacksRef.current.onStatus(status),
        onCamera: (camera) => callbacksRef.current.onCamera(camera),
        onLayout: (layout) => callbacksRef.current.onLayout(layout),
        onHover: (id) => callbacksRef.current.onHoverHotspot(id),
        onDebugPointer: (point) => callbacksRef.current.onDebugPointer?.(point),
      });
      dispose = () => session.destroy();
      handleRef.current = session.handle;
      callbacksRef.current.onReady(session.handle);

      if (cancelled) {
        return;
      }
      await session.showScene("main");
      if (!cancelled) {
        session.preloadOtherScenes("main");
      }
    };

    void start().catch((error: unknown) => {
      if (cancelled) {
        return;
      }
      const message =
        error instanceof Error ? error.message : "The exhibition could not start.";
      callbacksRef.current.onStatus({ state: "error", message });
    });

    return () => {
      cancelled = true;
      handleRef.current = null;
      callbacksRef.current.onReady(null);
      dispose?.();
      dispose = null;
      if (app) {
        app.destroy(
          { removeView: true },
          { children: true, texture: false, textureSource: false },
        );
        app = null;
      }
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const handle = handleRef.current;
    if (!handle || event.target !== event.currentTarget) {
      return;
    }
    const step = event.shiftKey ? 120 : 56;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      handle.panBy(step, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      handle.panBy(-step, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      handle.panBy(0, step);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      handle.panBy(0, -step);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      handle.zoomBy(1.2);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      handle.zoomBy(1 / 1.2);
    } else if (event.key === "0") {
      event.preventDefault();
      handle.resetView();
    }
  };

  return (
    <div
      ref={hostRef}
      className="exhibition-canvas-host"
      tabIndex={0}
      aria-label="Exhibition picture. Drag to look around. Arrow keys pan, plus and minus zoom, and zero returns to the opening view."
      onKeyDown={onKeyDown}
    />
  );
}

class ExhibitionSession {
  readonly handle: ExhibitionCanvasHandle;
  private readonly world = new Container();
  private artwork: Container | null = null;
  private ghost: Container | null = null;
  private ghostTween: gsap.core.Tween | null = null;
  private readonly hotspots: HotspotLayer;
  private readonly camera: CameraController;
  private readonly textures = new Map<string, Promise<LoadedTexture>>();
  private readonly readyUrls = new Set<string>();
  private readonly loaded = new Set<LoadedTexture>();
  private readonly pointers = new Map<number, PointerPoint>();
  private regions = new Map<string, HotspotRegion>();
  private viewInsets: Insets = NO_INSETS;
  private loadToken = 0;
  private destroyed = false;
  private dragOrigin: PointerPoint | null = null;
  private dragLast: PointerPoint | null = null;
  private dragged = false;
  private downHotspot: Hotspot | null = null;
  private pinch: { dist: number; cx: number; cy: number } | null = null;
  private reducedMotion = false;
  private debug = false;
  private imageWidth = 1;
  private imageHeight = 1;
  private maxEdge = 4096;
  private disposers: Array<() => void> = [];

  constructor(
    private readonly app: Application,
    private readonly host: HTMLDivElement,
    private readonly callbacks: {
      onActivate: (hotspot: Hotspot) => void;
      onStatus: (status: CanvasStatus) => void;
      onCamera: (camera: CameraState) => void;
      onLayout: (layout: SceneLayout | null) => void;
      onHover: (hotspotId: string | null) => void;
      onDebugPointer: (point: Point | null) => void;
    },
  ) {
    this.hotspots = new HotspotLayer((id) => this.callbacks.onHover(id));
    this.world.eventMode = "passive";
    this.world.addChild(this.hotspots.container);
    this.app.stage.addChild(this.world);
    this.camera = new CameraController(this.world, (state) => {
      this.hotspots.updateZoom(state.zoom);
      this.callbacks.onCamera(state);
    });
    this.maxEdge = maxTextureEdge(readGl(this.app));
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = new Rectangle(0, 0, this.app.screen.width, this.app.screen.height);

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = reducedQuery.matches;
    this.camera.setReducedMotion(this.reducedMotion);
    const onMotion = () => {
      this.reducedMotion = reducedQuery.matches;
      this.camera.setReducedMotion(this.reducedMotion);
    };
    reducedQuery.addEventListener("change", onMotion);

    const observer = new ResizeObserver(() => {
      const width = this.host.clientWidth;
      const height = this.host.clientHeight;
      if (width < 2 || height < 2) {
        return;
      }
      this.app.renderer.resize(width, height);
      this.app.stage.hitArea = new Rectangle(0, 0, width, height);
      this.camera.setViewport(width, height);
    });
    observer.observe(this.host);
    this.camera.setViewport(this.app.screen.width, this.app.screen.height);

    this.app.stage.on("pointerdown", this.onPointerDown);
    this.app.stage.on("pointermove", this.onPointerMove);
    this.app.stage.on("pointerup", this.onPointerUp);
    this.app.stage.on("pointerupoutside", this.onPointerUp);
    this.app.stage.on("pointercancel", this.onPointerUp);

    const onWheel = (event: WheelEvent) => this.wheel(event);
    this.app.canvas.addEventListener("wheel", onWheel, { passive: false });

    const focusHost = () => {
      this.host.focus({ preventScroll: true });
    };
    this.app.canvas.addEventListener("pointerdown", focusHost);

    const onHover = (event: PointerEvent) => {
      if (!this.debug) {
        return;
      }
      const rect = this.app.canvas.getBoundingClientRect();
      this.reportPointer(event.clientX - rect.left, event.clientY - rect.top);
    };
    this.app.canvas.addEventListener("pointermove", onHover);

    this.disposers.push(() => {
      reducedQuery.removeEventListener("change", onMotion);
      observer.disconnect();
      this.app.canvas.removeEventListener("wheel", onWheel);
      this.app.canvas.removeEventListener("pointerdown", focusHost);
      this.app.canvas.removeEventListener("pointermove", onHover);
      this.app.stage.removeAllListeners();
    });

    this.handle = {
      showScene: (sceneId, options) => this.showScene(sceneId, options),
      preloadScene: (sceneId) => this.preloadScene(sceneId),
      zoomBy: (factor) => this.camera.zoomBy(factor),
      panBy: (dx, dy) => this.camera.panBy(dx, dy),
      zoomTo: (focus, magnification) => {
        void this.camera.zoomToFocus(focus, magnification);
      },
      resetView: () => {
        void this.camera.animateTo(this.homeState(), this.motion(0.6));
      },
      getCamera: () => this.camera.getState(),
      restoreCamera: (camera) => this.camera.animateTo(camera, this.motion(0.6)),
      focusHotspot: (hotspotId, options) => this.focusHotspot(hotspotId, options),
      revealHotspot: (hotspotId) => this.revealHotspot(hotspotId),
      setInsets: (view, panel) => {
        this.viewInsets = view;
        this.camera.setInsets(panel);
      },
      wheel: (event) => this.wheel(event),
      setHotspotDebug: (enabled) => {
        this.debug = enabled;
        this.hotspots.setDebug(enabled);
        if (!enabled) {
          this.callbacks.onDebugPointer(null);
        }
      },
    };
  }

  async showScene(
    sceneId: string,
    options?: { camera?: CameraState | null; transition?: "cut" | "crossfade" },
  ): Promise<void> {
    const token = ++this.loadToken;
    const scene = getScene(sceneId);
    if (!this.isSceneReady(scene)) {
      this.callbacks.onStatus({
        state: "loading",
        message: `Loading ${scene.title.toLowerCase()}…`,
      });
    }
    try {
      const art = await this.loadScene(scene);
      if (token !== this.loadToken) {
        return;
      }
      const crossfade =
        options?.transition === "crossfade" && !this.reducedMotion && this.artwork !== null;
      const { width, height } = art.base.texture;
      const frames = placeLayers(art);
      this.swapArtwork(buildArtwork(art, frames), crossfade);
      this.imageWidth = width;
      this.imageHeight = height;
      this.camera.stop();
      this.camera.setWorldSize(width, height);

      const regions = buildRegions(scene.hotspots, (layerId) =>
        layerId ? frames.get(layerId) ?? null : { x: 0, y: 0, width, height },
      );
      this.regions = new Map(regions.map((region) => [region.hotspot.id, region]));
      this.hotspots.setRegions(regions);
      this.pointers.clear();
      this.pinch = null;
      this.dragged = false;
      this.downHotspot = null;

      void this.camera.animateTo(options?.camera ?? this.homeState(), 0);
      const anchors: Record<string, Point> = {};
      for (const region of regions) {
        anchors[region.hotspot.id] = region.anchor;
      }
      this.callbacks.onLayout({ sceneId, anchors });
      this.callbacks.onStatus({ state: "ready" });
    } catch (error) {
      if (token !== this.loadToken) {
        return;
      }
      const message =
        error instanceof Error ? error.message : "The scene image could not be loaded.";
      this.callbacks.onStatus({ state: "error", message });
    }
  }

  preloadOtherScenes(currentId: string): void {
    for (const scene of Object.values(scenes)) {
      if (scene.id !== currentId) {
        this.preloadScene(scene.id);
      }
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.loadToken += 1;
    this.clearGhost();
    this.camera.destroy();
    this.hotspots.destroy();
    for (const dispose of this.disposers) {
      dispose();
    }
    this.disposers = [];
    this.artwork?.destroy({ children: true });
    this.artwork = null;
    for (const loaded of this.loaded) {
      loaded.texture.destroy(true);
    }
    this.loaded.clear();
    this.textures.clear();
  }

  private preloadScene(sceneId: string): void {
    const scene = getScene(sceneId);
    this.loadScene(scene).catch(() => {
      // A failed preload is reported when the scene is actually opened.
    });
  }

  private focusHotspot(
    hotspotId: string,
    options: { fill: number; duration?: number },
  ): Promise<boolean> {
    const region = this.regions.get(hotspotId);
    if (!region) {
      return Promise.resolve(false);
    }
    const target = this.camera.stateForRect(
      region.bounds,
      this.safeArea(),
      options.fill,
    );
    return this.camera.animateTo(target, this.motion(options.duration ?? 0.75));
  }

  private revealHotspot(hotspotId: string): void {
    const region = this.regions.get(hotspotId);
    if (!region) {
      return;
    }
    const camera = this.camera.getState();
    const safe = this.safeArea();
    const x = camera.x + region.anchor.x * camera.zoom;
    const y = camera.y + region.anchor.y * camera.zoom;
    const margin = 24;
    if (
      x >= safe.x + margin &&
      x <= safe.x + safe.width - margin &&
      y >= safe.y + margin &&
      y <= safe.y + safe.height - margin
    ) {
      return;
    }
    void this.camera.animateTo(
      {
        zoom: camera.zoom,
        x: safe.x + safe.width / 2 - region.anchor.x * camera.zoom,
        y: safe.y + safe.height / 2 - region.anchor.y * camera.zoom,
      },
      this.motion(0.45),
    );
  }

  /** The opening view keeps every marker inside the clear part of the screen. */
  private homeState(): CameraState {
    let interest: Rect = { x: 0, y: 0, width: this.imageWidth, height: this.imageHeight };
    if (this.regions.size > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const region of this.regions.values()) {
        minX = Math.min(minX, region.anchor.x);
        minY = Math.min(minY, region.anchor.y);
        maxX = Math.max(maxX, region.anchor.x);
        maxY = Math.max(maxY, region.anchor.y);
      }
      const padX = this.imageWidth * 0.03;
      const padY = this.imageHeight * 0.05;
      minX = Math.max(0, minX - padX);
      minY = Math.max(0, minY - padY);
      maxX = Math.min(this.imageWidth, maxX + padX);
      maxY = Math.min(this.imageHeight, maxY + padY);
      interest = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    return this.camera.homeState(interest, this.safeArea());
  }

  private safeArea(): Rect {
    const { width, height } = this.camera.getViewport();
    const insets = this.viewInsets;
    return {
      x: insets.left,
      y: insets.top,
      width: Math.max(1, width - insets.left - insets.right),
      height: Math.max(1, height - insets.top - insets.bottom),
    };
  }

  private motion(seconds: number): number {
    return this.reducedMotion ? 0 : seconds;
  }

  private wheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = this.app.canvas.getBoundingClientRect();
    const dy = normalizeWheel(event, rect.height);
    const factor = Math.min(1.18, Math.max(0.84, Math.exp(-dy * 0.0011)));
    this.camera.zoomAt(event.clientX - rect.left, event.clientY - rect.top, factor);
  }

  /** Puts the new artwork in place. With a crossfade, the old one fades out above it. */
  private swapArtwork(next: Container, crossfade: boolean): void {
    this.clearGhost();
    const previous = this.artwork;
    this.artwork = next;
    this.world.addChildAt(next, 0);
    if (!previous) {
      return;
    }
    this.world.removeChild(previous);
    if (!crossfade) {
      previous.destroy({ children: true });
      return;
    }
    const ghost = new Container();
    ghost.eventMode = "none";
    ghost.position.copyFrom(this.world.position);
    ghost.scale.copyFrom(this.world.scale);
    ghost.addChild(previous);
    this.app.stage.addChild(ghost);
    this.ghost = ghost;
    this.ghostTween = gsap.to(ghost, {
      alpha: 0,
      duration: CROSSFADE_SECONDS,
      ease: "power1.out",
      onComplete: () => this.clearGhost(),
    });
  }

  private clearGhost(): void {
    this.ghostTween?.kill();
    this.ghostTween = null;
    if (this.ghost) {
      this.ghost.destroy({ children: true });
      this.ghost = null;
    }
  }

  private isSceneReady(scene: Scene): boolean {
    return (
      this.readyUrls.has(scene.image) &&
      (scene.layers ?? []).every((layer) => this.readyUrls.has(layer.src))
    );
  }

  private async loadScene(scene: Scene): Promise<SceneArt> {
    const layers = scene.layers ?? [];
    const [base, ...loadedLayers] = await Promise.all([
      this.textureFor(scene.image),
      ...layers.map((layer) => this.textureFor(layer.src)),
    ]);
    return {
      base,
      layers: layers.map((layer, index) => ({ layer, loaded: loadedLayers[index] })),
    };
  }

  private textureFor(url: string): Promise<LoadedTexture> {
    const existing = this.textures.get(url);
    if (existing) {
      return existing;
    }
    const pending = loadCappedTexture(url, this.maxEdge).then((loaded) => {
      if (this.destroyed) {
        loaded.texture.destroy(true);
        throw new Error("Exhibition closed while loading.");
      }
      this.loaded.add(loaded);
      this.readyUrls.add(url);
      return loaded;
    });
    pending.catch(() => {
      if (this.textures.get(url) === pending) {
        this.textures.delete(url);
      }
    });
    this.textures.set(url, pending);
    return pending;
  }

  private reportPointer(screenX: number, screenY: number): void {
    const camera = this.camera.getState();
    if (camera.zoom === 0) {
      return;
    }
    const worldX = (screenX - camera.x) / camera.zoom;
    const worldY = (screenY - camera.y) / camera.zoom;
    this.callbacks.onDebugPointer({
      x: worldX / this.imageWidth,
      y: worldY / this.imageHeight,
    });
  }

  private onPointerDown = (event: FederatedPointerEvent): void => {
    const point = { x: event.global.x, y: event.global.y };
    this.pointers.set(event.pointerId, point);
    if (this.pointers.size === 1) {
      this.dragOrigin = point;
      this.dragLast = point;
      this.dragged = false;
      this.downHotspot = hotspotFromTarget(event.target);
      this.pinch = null;
      return;
    }
    if (this.pointers.size >= 2) {
      this.dragged = true;
      this.downHotspot = null;
      this.pinch = pinchFrom(this.pointers);
    }
  };

  private onPointerMove = (event: FederatedPointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) {
      return;
    }
    this.pointers.set(event.pointerId, { x: event.global.x, y: event.global.y });
    if (this.pointers.size >= 2) {
      const next = pinchFrom(this.pointers);
      if (this.pinch && next && this.pinch.dist > 0) {
        this.camera.zoomAt(this.pinch.cx, this.pinch.cy, next.dist / this.pinch.dist);
        this.camera.panBy(next.cx - this.pinch.cx, next.cy - this.pinch.cy);
      }
      this.pinch = next;
      this.dragged = true;
      return;
    }
    const current = this.pointers.get(event.pointerId);
    if (!current || !this.dragLast || !this.dragOrigin) {
      return;
    }
    if (!this.dragged) {
      const travel = Math.hypot(current.x - this.dragOrigin.x, current.y - this.dragOrigin.y);
      if (travel < DRAG_THRESHOLD) {
        return;
      }
      this.dragged = true;
    }
    this.camera.panBy(current.x - this.dragLast.x, current.y - this.dragLast.y);
    this.dragLast = current;
  };

  private onPointerUp = (event: FederatedPointerEvent): void => {
    const wasSingle = this.pointers.size === 1;
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) {
      this.pinch = null;
    }
    if (wasSingle && !this.dragged && this.downHotspot) {
      this.callbacks.onActivate(this.downHotspot);
    }
    if (this.pointers.size === 0) {
      this.dragOrigin = null;
      this.dragLast = null;
      this.downHotspot = null;
      this.dragged = false;
    } else if (this.pointers.size === 1) {
      const remaining = this.pointers.values().next().value as PointerPoint | undefined;
      this.dragLast = remaining ?? null;
      this.dragged = true;
    }
  };
}

/** World rectangles of each foreground layer, measured in background texture pixels. */
function placeLayers(art: SceneArt): Map<string, Rect> {
  const { texture, sourceWidth, sourceHeight } = art.base;
  const toWorldX = texture.width / Math.max(1, sourceWidth);
  const toWorldY = texture.height / Math.max(1, sourceHeight);
  const frames = new Map<string, Rect>();
  for (const { layer, loaded } of art.layers) {
    const scale = layer.scale ?? 1;
    frames.set(layer.id, {
      x: layer.x * texture.width,
      y: layer.y * texture.height,
      width: loaded.sourceWidth * scale * toWorldX,
      height: loaded.sourceHeight * scale * toWorldY,
    });
  }
  return frames;
}

function buildArtwork(art: SceneArt, frames: Map<string, Rect>): Container {
  const artwork = new Container();
  artwork.eventMode = "none";
  artwork.label = "artwork";
  const background = new Sprite(art.base.texture);
  background.anchor.set(0);
  artwork.addChild(background);
  const ordered = [...art.layers].sort(
    (a, b) => (a.layer.zIndex ?? 0) - (b.layer.zIndex ?? 0),
  );
  for (const { layer, loaded } of ordered) {
    const frame = frames.get(layer.id);
    if (!frame) {
      continue;
    }
    const sprite = new Sprite(loaded.texture);
    sprite.label = layer.id;
    sprite.position.set(frame.x, frame.y);
    sprite.width = frame.width;
    sprite.height = frame.height;
    artwork.addChild(sprite);
  }
  return artwork;
}

function hotspotFromTarget(target: unknown): Hotspot | null {
  let current = target as { hotspot?: Hotspot; parent?: unknown } | null;
  while (current) {
    if (current.hotspot) {
      return current.hotspot;
    }
    current = (current.parent ?? null) as { hotspot?: Hotspot; parent?: unknown } | null;
  }
  return null;
}

function pinchFrom(
  pointers: Map<number, PointerPoint>,
): { dist: number; cx: number; cy: number } | null {
  const points = [...pointers.values()];
  if (points.length < 2) {
    return null;
  }
  const [a, b] = points;
  return {
    dist: Math.hypot(a.x - b.x, a.y - b.y),
    cx: (a.x + b.x) / 2,
    cy: (a.y + b.y) / 2,
  };
}

function normalizeWheel(event: WheelEvent, pageHeight: number): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16;
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * pageHeight;
  }
  return event.deltaY;
}

function readGl(app: Application): WebGLRenderingContext | null {
  const renderer = app.renderer as Application["renderer"] & {
    gl?: WebGLRenderingContext;
  };
  return renderer.gl ?? null;
}
