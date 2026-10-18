# An Open Collage

An interactive exhibition prototype: a full-viewport picture you can drag and zoom, with clickable places, a nested courtyard, and story panels.

The pictures and stories currently on display are fictional demonstration content. The interaction pattern is inspired by [Surfacing Zarqa](https://surfacingzarqa.com/). Older WebP files may still sit in `public/exhibition`; the app does not load them.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other checks:

```bash
npm run typecheck
npm run build
```

## Replace images and audio

The canvas loads these public URLs:

| Browser URL | File |
| --- | --- |
| `/exhibition/main-collage.png` | `public/exhibition/main-collage.png` |
| `/exhibition/detail-scene.png` | `public/exhibition/detail-scene.png` |
| `/exhibition/story-01.png` | `public/exhibition/story-01.png` |
| `/exhibition/story-02.png` | `public/exhibition/story-02.png` |

Paths in `lib/exhibition/scenes.ts` use those URLs. Do not prefix them with `/public`.

The current street image is 1774×887 and the courtyard image is 1536×1024, both inside a typical 4096-pixel texture limit. The loader still reads the real pixel size and, if a replacement is larger, draws a smaller copy that keeps the same aspect ratio. Story images are ordinary HTML images and load when a panel opens. The courtyard image is fetched quietly once the street is showing, so stepping through the doorway does not wait for it.

There is no narration file. Audio controls stay hidden while `narrations` in `lib/exhibition/scenes.ts` is empty. To add sound later, put an mp3 in `public/exhibition/` and add a track whose `sceneId` matches a scene.

## Hotspot debug

While the development server is running, open:

```text
http://localhost:3000/?debug=hotspots
```

That draws the hotspot polygons and marker anchors, and shows the pointer as normalized coordinates (`x` and `y` from 0 to 1, origin at the top left). You can also set `localStorage.exhibition-hotspot-debug` to `1`. Production builds leave this off. Without the switch the polygons are invisible hit areas; visitors only see the small markers.

## Edit hotspots

Hotspots are listed on each scene in `lib/exhibition/scenes.ts`.

`points` is a polygon in normalized coordinates. The canvas turns a point into image pixels with `x * imageWidth` and `y * imageHeight`. The picture uses a top-left anchor inside the same world container as the polygons.

`anchor` places the small marker, in the same coordinates. Without it the marker sits at the average of the polygon's points. The polygon's bounding box is what the camera frames when the hotspot is selected, so keep it close to the object.

Each hotspot has one action:

- `open-story` moves the camera to the object, then opens a story from the `stories` object beside it. Closing the story returns the camera to where it was.
- `enter-scene` saves the current camera, moves toward the hotspot, and crossfades into another scene.
- `play-audio` plays a track from `narrations` after a click. With no tracks, this action is unused.
- `zoom-to` moves the camera toward `focus` by `magnification` times the fitted zoom.

## Add a scene

1. Add an image under `public/exhibition/`.
2. Add a `Scene` to `scenes` with an `id`, `title`, `image`, and `hotspots`.
3. Point an `enter-scene` action at that `id`.

Back and Escape pop the history stack and restore the camera from before the scene opened.

## Collage layers

A scene can list transparent cut-outs in `layers`, drawn over its `image`:

```ts
layers: [
  { id: "baker", src: "/exhibition/layers/baker.png", x: 0.04, y: 0.3, scale: 1, zIndex: 2 },
],
```

- `x` and `y` are the layer's top-left corner, normalized to the background.
- `scale` of 1 draws one layer pixel per background source pixel.
- Higher `zIndex` draws on top. The background is always underneath.
- A hotspot with `layerId: "baker"` uses `points` and `anchor` normalized to that layer's own image, so it follows the layer if you move it.

Only use real cut-out artwork with a transparent background. Do not crop pieces of the background photo and lay them over itself. Both current scenes are single flattened pictures and have no layers.

## What is implemented

- Warm paper canvas (`#f4efe5`) around the artwork, which is drawn at full brightness with no tint or overlay
- Opening view that fills as much of the screen as it can while keeping every marker visible; on a portrait phone it fills the height and starts on the central marker
- PixiJS canvas with drag pan, wheel zoom around the pointer, touch drag, and pinch zoom
- Zoom out, zoom in, and return to the opening view, grouped bottom right
- Small HTML markers over the canvas, one per hotspot, with SVG icons for story, scene, narration, and zoom actions. Each is a 44px button that shows its name on hover or keyboard focus
- Show points of interest, which names every marker at once
- Invisible polygon hit areas aligned with the artwork at every zoom; outlines only in the debug view
- Selecting the bakery or the workshop frames it in the clear part of the screen, leaving room for the panel, then opens the story. Closing restores the earlier camera
- Selecting the teal doorway moves toward it, then crossfades into the courtyard. Back restores the street camera
- Selecting another place mid-move replaces the move; dragging or zooming interrupts it and cancels the pending story
- Story captions with title, image, caption, and text: a side panel on a wide screen and a bottom sheet on a narrow one. The panel is not modal and does not dim the scene
- Explore stories lists the same places for keyboard and screen reader use
- Help, arrow-key pan, and reduced motion for camera moves, crossfades, and panels
- Hidden audio controls while no narration track is configured
- Optional transparent collage layers per scene
- A development-only hotspot debug view
- Loading and error states, with the courtyard preloaded after the street

## Limitations

- Both scenes are flattened photographs. Nothing in them can move on its own, and focusing an object is a camera move over a single picture, not a separate layer coming forward.
- To make the scene a true collage, these transparent PNG or WebP cut-outs are needed, each cut out along the object's silhouette:
  - Street background with the foreground objects removed or painted out
  - The baker at the oven, with the bread counter
  - The teal arched doorway and its frame (so the courtyard can show through)
  - The textile workshop front with the woman at the sewing machine
  - The tea seller and his stall, and the bicycle, if they are to become stories
  - Courtyard background, plus the seated woman in her chair and the radio on its table
- No narration file is included, and the audio controls stay hidden.
- Hotspot polygons follow the objects approximately. Use `?debug=hotspots` during development to adjust them.
- Pinch zoom needs two touch pointers. A trackpad pinch is handled when the browser sends a wheel event.
- Arrow keys, plus, minus, and zero work while the picture has focus. Tab moves through the markers; a marker that is off screen is brought into view when it receives keyboard focus.
