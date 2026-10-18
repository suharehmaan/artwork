import type {
  Hotspot,
  HotspotAction,
  NarrationTrack,
  Scene,
  StoryContent,
} from "./types";

/**
 * Scene content for the exhibition prototype.
 *
 * Hotspot `points` are normalized: `{ x: 0, y: 0 }` is the top left of that
 * scene image and `{ x: 1, y: 1 }` is the bottom right. The canvas converts
 * them with `x * imageWidth` and `y * imageHeight`. The picture sprite uses a
 * top-left anchor, and the hotspot layer is a child of the same world
 * container, so pan and zoom move both together.
 *
 * `anchor` places the small marker; without it the polygon centroid is used.
 *
 * A scene can also list transparent foreground `layers` over its background
 * image. Hotspots with a `layerId` are then normalized to that layer instead.
 * Both scenes below are single flattened pictures, so they have no layers.
 *
 * Stories and courtyard notes are fictional demonstration content.
 * No narration file is shipped. Leave `narrations` empty to keep audio hidden.
 */

const mainHotspots: Hotspot[] = [
  {
    id: "bakery",
    label: "The morning bakery",
    summary: "Open the bakery story.",
    points: [
      { x: 0.0, y: 0.17 },
      { x: 0.2, y: 0.2 },
      { x: 0.2, y: 0.52 },
      { x: 0.16, y: 0.62 },
      { x: 0.0, y: 0.64 },
    ],
    anchor: { x: 0.1, y: 0.43 },
    action: { type: "open-story", storyId: "bakery" },
  },
  {
    id: "teal-doorway",
    label: "Teal arched doorway",
    summary: "Step through into the courtyard.",
    points: [
      { x: 0.362, y: 0.555 },
      { x: 0.362, y: 0.235 },
      { x: 0.49, y: 0.235 },
      { x: 0.49, y: 0.555 },
    ],
    anchor: { x: 0.425, y: 0.4 },
    action: { type: "enter-scene", sceneId: "courtyard" },
  },
  {
    id: "textile-workshop",
    label: "Textile workshop",
    summary: "Open the workshop story.",
    points: [
      { x: 0.785, y: 0.47 },
      { x: 0.84, y: 0.42 },
      { x: 0.998, y: 0.36 },
      { x: 0.998, y: 0.9 },
      { x: 0.87, y: 0.92 },
      { x: 0.785, y: 0.8 },
    ],
    anchor: { x: 0.9, y: 0.66 },
    action: { type: "open-story", storyId: "workshop" },
  },
];

const courtyardHotspots: Hotspot[] = [
  {
    id: "seated-woman",
    label: "Seated woman",
    summary: "Read a short note about the woman in the courtyard.",
    points: [
      { x: 0.175, y: 0.43 },
      { x: 0.245, y: 0.42 },
      { x: 0.3, y: 0.52 },
      { x: 0.355, y: 0.62 },
      { x: 0.4, y: 0.85 },
      { x: 0.3, y: 0.88 },
      { x: 0.165, y: 0.86 },
      { x: 0.165, y: 0.58 },
    ],
    anchor: { x: 0.27, y: 0.62 },
    action: { type: "open-story", storyId: "courtyard-conversations" },
  },
  {
    id: "radio",
    label: "Radio",
    summary: "Read a short note about the radio beside her.",
    points: [
      { x: 0.002, y: 0.545 },
      { x: 0.125, y: 0.545 },
      { x: 0.128, y: 0.66 },
      { x: 0.002, y: 0.665 },
    ],
    anchor: { x: 0.065, y: 0.6 },
    action: { type: "open-story", storyId: "sounds-of-home" },
  },
];

export const scenes: Record<string, Scene> = {
  main: {
    id: "main",
    title: "The street",
    image: "/exhibition/main-collage.png",
    hotspots: mainHotspots,
  },
  courtyard: {
    id: "courtyard",
    title: "The courtyard",
    image: "/exhibition/detail-scene.png",
    hotspots: courtyardHotspots,
  },
};

export const stories: Record<string, StoryContent> = {
  bakery: {
    id: "bakery",
    title: "The Morning Bakery",
    image: "/exhibition/story-01.png",
    imageAlt:
      "A baker in a white tunic draws flatbread from a brick oven onto a wooden counter.",
    caption: "Bread drawn from the brick oven before the street wakes.",
    text: "Before the streets grow busy, the bakery comes alive with warmth, conversation, and the smell of fresh bread.",
  },
  workshop: {
    id: "workshop",
    title: "Threads of Everyday Life",
    image: "/exhibition/story-02.png",
    imageAlt:
      "A woman in teal works at a black sewing machine beside hanging patterned cloth.",
    caption: "Printed cloth hangs beside the sewing machine, the harbour behind the window.",
    text: "Inside the workshop, fabric, patterns, and patient handwork become part of the neighbourhood’s daily rhythm.",
  },
  "courtyard-conversations": {
    id: "courtyard-conversations",
    title: "Courtyard Conversations",
    text: "She sits in the shade of the arch, with the tiled court and the tree in front of her. This note is fictional demonstration text.",
  },
  "sounds-of-home": {
    id: "sounds-of-home",
    title: "Sounds of Home",
    text: "A wooden radio rests on the lace-covered table beside her chair. This note is fictional demonstration text about the sounds of the courtyard.",
  },
};

/** No narration file is included. An empty map keeps the audio controls hidden. */
export const narrations: Record<string, NarrationTrack> = {};

export const exhibitionIntro = {
  title: "An Open Collage",
  kicker: "Fictional demonstration",
  summary:
    "The pictures and stories in this prototype are fictional demonstration content. Drag across the street, zoom toward a detail, and select a small marker to read about a place or step through the teal doorway.",
};

export function getScene(sceneId: string): Scene {
  const scene = scenes[sceneId];
  if (!scene) {
    throw new Error(`Unknown scene: ${sceneId}`);
  }
  return scene;
}

export function getStory(storyId: string): StoryContent | null {
  return stories[storyId] ?? null;
}

export function getNarration(audioId: string): NarrationTrack | null {
  return narrations[audioId] ?? null;
}

export function narrationForScene(sceneId: string): NarrationTrack | null {
  return (
    Object.values(narrations).find((track) => track.sceneId === sceneId) ?? null
  );
}

export function actionKindLabel(action: HotspotAction): string {
  switch (action.type) {
    case "open-story":
      return "Story";
    case "enter-scene":
      return "Closer scene";
    case "play-audio":
      return "Narration";
    case "zoom-to":
      return "Closer view";
  }
}
