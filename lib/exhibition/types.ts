/** A point in normalized image space. Origin is the top left, both axes run 0–1. */
export type Point = {
  x: number;
  y: number;
};

/** Screen position of the world origin, plus the uniform scale of the world. */
export type CameraState = {
  x: number;
  y: number;
  zoom: number;
};

/** A rectangle in world pixels or screen pixels, depending on where it is used. */
export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Screen space kept clear on each side of the viewport, in CSS pixels. */
export type Insets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type StoryContent = {
  id: string;
  title: string;
  text: string;
  image?: string;
  imageAlt?: string;
  /** Short line shown under the story image. */
  caption?: string;
};

export type NarrationTrack = {
  id: string;
  sceneId: string;
  src: string;
  title: string;
  transcript: string;
};

export type HotspotAction =
  | { type: "open-story"; storyId: string }
  | { type: "enter-scene"; sceneId: string }
  | { type: "play-audio"; audioId: string }
  | {
      type: "zoom-to";
      /** Normalized point that the camera moves toward. */
      focus: Point;
      /** Multiplier on the zoom level that fits the whole scene. */
      magnification: number;
    };

export type Hotspot = {
  id: string;
  label: string;
  summary: string;
  /**
   * Polygon outline in normalized coordinates. With no `layerId` they are
   * relative to the scene background; with one, relative to that layer image.
   */
  points: Point[];
  /** Ties the hotspot to a foreground layer, so it follows that layer's placement. */
  layerId?: string;
  /** Where the marker sits, in the same space as `points`. Defaults to the polygon centroid. */
  anchor?: Point;
  action: HotspotAction;
};

/**
 * A transparent cut-out drawn over the scene background.
 * Only use real cut-out artwork here, never a crop of the background itself.
 */
export type SceneLayer = {
  id: string;
  /** Public URL of a transparent PNG or WebP. */
  src: string;
  /** Top-left corner of the layer, normalized to the background image. */
  x: number;
  y: number;
  /** 1 draws one layer pixel per background source pixel. Defaults to 1. */
  scale?: number;
  /** Higher values draw on top. The background always sits below every layer. */
  zIndex?: number;
};

export type Scene = {
  id: string;
  title: string;
  /** Public URL of the scene background. With no layers this is the whole artwork. */
  image: string;
  /** Optional foreground cut-outs. Leave empty to show the background alone. */
  layers?: SceneLayer[];
  hotspots: Hotspot[];
};

export type SceneHistoryEntry = {
  sceneId: string;
  camera: CameraState;
};

export type AudioStatus =
  | "idle"
  | "checking"
  | "missing"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "error";

export type AudioSnapshot = {
  status: AudioStatus;
  title: string;
  transcript: string;
  message: string;
  muted: boolean;
  trackId: string | null;
};
