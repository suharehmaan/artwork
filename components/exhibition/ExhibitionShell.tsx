"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import {
  exhibitionIntro,
  getNarration,
  getScene,
  getStory,
  narrationForScene,
  narrations,
} from "@/lib/exhibition/scenes";
import type {
  AudioSnapshot,
  CameraState,
  Hotspot,
  Point,
  SceneHistoryEntry,
  StoryContent,
} from "@/lib/exhibition/types";
import {
  isCompactViewport,
  panelInsets,
  storyPanelWidth,
  storySheetHeight,
  viewInsets,
} from "@/lib/exhibition/layout";
import { NarrationPlayer } from "@/lib/exhibition/narration";
import { isHotspotDebugEnabled } from "@/lib/exhibition/debug";
import { CanvasMount } from "./CanvasMount";
import type {
  CanvasStatus,
  ExhibitionCanvasHandle,
  SceneLayout,
} from "./ExhibitionCanvas";
import { ExhibitionControls } from "./ExhibitionControls";
import { HotspotMarkers, type HotspotMarkersHandle } from "./HotspotMarkers";
import { AudioControls } from "./AudioControls";
import { StoryPanel } from "./StoryPanel";
import { ExploreDialog } from "./ExploreDialog";
import { HelpDialog } from "./HelpDialog";
import { WelcomeScreen } from "./WelcomeScreen";
import { BackIcon, PointsIcon } from "./icons";
import styles from "./ExhibitionShell.module.css";

const narrationList = Object.values(narrations);

/** Share of the clear screen area a focused object may fill. Lower keeps more context. */
const STORY_FILL = 0.62;
const STORY_FILL_COMPACT = 0.82;
const DOORWAY_FILL = 0.92;

const idleAudio: AudioSnapshot = {
  status: "idle",
  title: "",
  transcript: "",
  message: "",
  muted: false,
  trackId: null,
};

function subscribeToResize(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

const readViewport = () => `${window.innerWidth}x${window.innerHeight}`;
const serverViewport = () => "1280x800";

export function ExhibitionShell() {
  const handleRef = useRef<ExhibitionCanvasHandle | null>(null);
  const markersRef = useRef<HotspotMarkersHandle | null>(null);
  const cameraRef = useRef<CameraState | null>(null);
  const playerRef = useRef<NarrationPlayer | null>(null);
  const debugReadoutRef = useRef<HTMLParagraphElement>(null);
  /** Bumped by every selection, close, and Back, so stale camera moves do nothing. */
  const selectionRef = useRef(0);
  /** Camera from before a story was selected, restored when the story closes. */
  const storyReturnRef = useRef<CameraState | null>(null);
  /** True from selecting a story until it closes, so the camera keeps the panel clear. */
  const panelReservedRef = useRef(false);

  const viewportKey = useSyncExternalStore(subscribeToResize, readViewport, serverViewport);
  const [viewportWidth, viewportHeight] = viewportKey.split("x").map(Number);
  const compact = isCompactViewport(viewportWidth);

  const [hotspotDebug, setHotspotDebug] = useState(false);
  const [started, setStarted] = useState(false);
  const [sceneId, setSceneId] = useState("main");
  const [history, setHistory] = useState<SceneHistoryEntry[]>([]);
  const [story, setStory] = useState<StoryContent | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [showPoints, setShowPoints] = useState(false);
  const [layout, setLayout] = useState<SceneLayout | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [status, setStatus] = useState<CanvasStatus>({
    state: "loading",
    message: "Loading the street…",
  });
  const [audio, setAudio] = useState<AudioSnapshot>(idleAudio);

  const scene = getScene(sceneId);
  const track = narrationForScene(sceneId);

  useEffect(() => {
    const player = new NarrationPlayer();
    playerRef.current = player;
    const unsubscribe = player.subscribe(setAudio);
    return () => {
      unsubscribe();
      player.destroy();
      playerRef.current = null;
    };
  }, []);

  const syncInsets = useCallback(() => {
    const handle = handleRef.current;
    if (!handle) {
      return;
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    const reserved = panelReservedRef.current;
    handle.setInsets(viewInsets(width, height, reserved), panelInsets(width, height, reserved));
  }, []);

  useEffect(() => {
    syncInsets();
  }, [syncInsets, viewportKey]);

  /** Clears story state without moving the camera. */
  const releaseStory = useCallback(() => {
    storyReturnRef.current = null;
    panelReservedRef.current = false;
    syncInsets();
    setStory(null);
    setSelectedId(null);
  }, [syncInsets]);

  const closeStory = useCallback(() => {
    selectionRef.current += 1;
    const back = storyReturnRef.current;
    releaseStory();
    if (back) {
      void handleRef.current?.restoreCamera(back);
    }
  }, [releaseStory]);

  const closeOverlays = useCallback(() => {
    setHelpOpen(false);
    setExploreOpen(false);
    setTranscriptOpen(false);
  }, [setExploreOpen, setHelpOpen, setTranscriptOpen]);

  const goBack = useCallback(() => {
    const previous = history[history.length - 1];
    if (!previous) {
      return;
    }
    selectionRef.current += 1;
    playerRef.current?.stopForScene(sceneId, narrationList);
    setHistory((items) => items.slice(0, -1));
    releaseStory();
    closeOverlays();
    setSceneId(previous.sceneId);
    void handleRef.current?.showScene(previous.sceneId, {
      camera: previous.camera,
      transition: "crossfade",
    });
  }, [closeOverlays, history, releaseStory, sceneId]);

  const activateHotspot = useCallback(
    async (hotspot: Hotspot) => {
      const handle = handleRef.current;
      if (!handle) {
        return;
      }
      const token = ++selectionRef.current;
      const isCurrent = () => token === selectionRef.current;
      const action = hotspot.action;
      closeOverlays();

      if (action.type === "open-story") {
        const next = getStory(action.storyId);
        if (!next) {
          return;
        }
        // Switching between stories keeps the camera from before the first one.
        storyReturnRef.current ??= handle.getCamera();
        setStory(null);
        setSelectedId(hotspot.id);
        panelReservedRef.current = true;
        syncInsets();
        const arrived = await handle.focusHotspot(hotspot.id, {
          fill: isCompactViewport(window.innerWidth) ? STORY_FILL_COMPACT : STORY_FILL,
        });
        if (!isCurrent()) {
          return;
        }
        if (!arrived) {
          // The visitor took over the camera. Leave it where they put it.
          releaseStory();
          return;
        }
        setStory(next);
        return;
      }

      if (action.type === "enter-scene") {
        const camera = storyReturnRef.current ?? handle.getCamera();
        releaseStory();
        setSelectedId(hotspot.id);
        playerRef.current?.stopForScene(sceneId, narrationList);
        handle.preloadScene(action.sceneId);
        const arrived = await handle.focusHotspot(hotspot.id, {
          fill: DOORWAY_FILL,
          duration: 0.7,
        });
        if (!isCurrent()) {
          return;
        }
        setSelectedId(null);
        if (!arrived) {
          return;
        }
        setHistory((items) => [...items, { sceneId, camera }]);
        setSceneId(action.sceneId);
        await handle.showScene(action.sceneId, { transition: "crossfade" });
        return;
      }

      if (action.type === "play-audio") {
        const narration = getNarration(action.audioId);
        if (!narration) {
          return;
        }
        closeStory();
        setTranscriptOpen(true);
        void playerRef.current?.play(narration);
        return;
      }

      releaseStory();
      handle.zoomTo(action.focus, action.magnification);
    },
    [closeOverlays, closeStory, releaseStory, sceneId, setTranscriptOpen, syncInsets],
  );

  const onActivate = useCallback(
    (hotspot: Hotspot) => {
      void activateHotspot(hotspot);
    },
    [activateHotspot],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (exploreOpen) {
        setExploreOpen(false);
        return;
      }
      if (helpOpen) {
        setHelpOpen(false);
        return;
      }
      if (transcriptOpen) {
        setTranscriptOpen(false);
        return;
      }
      if (story || selectedId) {
        closeStory();
        return;
      }
      if (history.length > 0) {
        goBack();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeStory, exploreOpen, goBack, helpOpen, history.length, selectedId, story, transcriptOpen]);

  const onExploreFocus = useCallback((hotspotId: string | null) => {
    setFocusedId(hotspotId);
  }, []);

  const onMarkerFocus = useCallback((hotspotId: string | null, fromKeyboard: boolean) => {
    setFocusedId(hotspotId);
    if (hotspotId && fromKeyboard) {
      handleRef.current?.revealHotspot(hotspotId);
    }
  }, []);

  const onCamera = useCallback((camera: CameraState) => {
    cameraRef.current = camera;
    markersRef.current?.position(camera);
  }, []);

  const setMarkersRef = useCallback((handle: HotspotMarkersHandle | null) => {
    markersRef.current = handle;
    if (handle && cameraRef.current) {
      handle.position(cameraRef.current);
    }
  }, []);

  const retry = () => {
    void handleRef.current?.showScene(sceneId);
  };

  const markerScene = layout ? getScene(layout.sceneId) : null;
  const shellStyle = {
    "--panel-w": `${storyPanelWidth(viewportWidth)}px`,
    "--sheet-h": `${storySheetHeight(viewportHeight)}px`,
  } as CSSProperties;

  return (
    <div
      className={styles.shell}
      style={shellStyle}
      data-story={story ? "open" : "closed"}
      data-compact={compact ? "true" : "false"}
    >
      <div className={styles.viewport}>
        <CanvasMount
          onReady={(handle) => {
            handleRef.current = handle;
            if (!handle) {
              return;
            }
            syncInsets();
            if (isHotspotDebugEnabled()) {
              handle.setHotspotDebug(true);
              setHotspotDebug(true);
            }
          }}
          onActivateHotspot={onActivate}
          onStatus={setStatus}
          onCamera={onCamera}
          onLayout={setLayout}
          onHoverHotspot={setHoveredId}
          onDebugPointer={(point: Point | null) => {
            const node = debugReadoutRef.current;
            if (!node) {
              return;
            }
            node.textContent = point
              ? `x ${point.x.toFixed(3)}    y ${point.y.toFixed(3)}`
              : "Move over the picture";
          }}
        />
      </div>

      {started && layout && markerScene ? (
        <HotspotMarkers
          ref={setMarkersRef}
          layout={layout}
          hotspots={markerScene.hotspots}
          activeId={hoveredId ?? focusedId}
          selectedId={selectedId}
          showLabels={showPoints}
          onActivate={onActivate}
          onFocusMarker={onMarkerFocus}
          onWheel={(event) => handleRef.current?.wheel(event)}
        />
      ) : null}

      {started ? (
        <header className={styles.bar}>
          <div className={styles.cluster}>
            {history.length > 0 ? (
              <button type="button" className={styles.back} onClick={goBack}>
                <BackIcon />
                Back
              </button>
            ) : null}
            <p className={styles.title}>
              <span className={styles.exhibition}>{exhibitionIntro.title}</span>
              <span className={styles.scene}>{scene.title}</span>
            </p>
          </div>
          <div className={styles.secondary}>
            <AudioControls
              track={track}
              snapshot={audio}
              panelOpen={transcriptOpen}
              onToggle={() => {
                if (track) {
                  playerRef.current?.toggle(track);
                }
              }}
              onMute={() => playerRef.current?.setMuted(!audio.muted)}
              onOpenTranscript={() => {
                closeStory();
                setHelpOpen(false);
                setExploreOpen(false);
                setTranscriptOpen(true);
              }}
              onCloseTranscript={() => setTranscriptOpen(false)}
            />
            <button
              type="button"
              className={styles.quiet}
              onClick={() => {
                setHelpOpen(false);
                setTranscriptOpen(false);
                setExploreOpen(true);
              }}
            >
              Explore stories
            </button>
            <button
              type="button"
              className={styles.quiet}
              onClick={() => {
                setExploreOpen(false);
                setTranscriptOpen(false);
                setHelpOpen(true);
              }}
            >
              Help
            </button>
          </div>
        </header>
      ) : null}

      {started ? (
        <>
          <div className={styles.dockStart}>
            <button
              type="button"
              className={styles.toggle}
              aria-pressed={showPoints}
              onClick={() => setShowPoints((value) => !value)}
            >
              <PointsIcon />
              <span>
                Show points<span className={styles.wide}> of interest</span>
              </span>
            </button>
          </div>
          <div className={styles.dockEnd}>
            <ExhibitionControls
              onZoomIn={() => handleRef.current?.zoomBy(1.2)}
              onZoomOut={() => handleRef.current?.zoomBy(1 / 1.2)}
              onReset={() => handleRef.current?.resetView()}
            />
          </div>
        </>
      ) : null}

      {started && status.state === "loading" ? (
        <p className={styles.loading} role="status">
          {status.message}
        </p>
      ) : null}
      {started && status.state === "error" ? (
        <div className={styles.error} role="alert">
          <p>{status.message}</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
      ) : null}

      <StoryPanel story={story} sceneTitle={scene.title} onClose={closeStory} />
      <ExploreDialog
        open={exploreOpen}
        sceneTitle={scene.title}
        hotspots={scene.hotspots}
        onClose={() => setExploreOpen(false)}
        onChoose={(hotspot) => {
          setExploreOpen(false);
          onActivate(hotspot);
        }}
        onFocusHotspot={onExploreFocus}
      />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <WelcomeScreen
        open={!started}
        ready={status.state === "ready"}
        error={status.state === "error" ? status.message : null}
        onRetry={retry}
        onStart={() => {
          setStarted(true);
          window.requestAnimationFrame(() => {
            document.querySelector<HTMLElement>(".exhibition-canvas-host")?.focus();
          });
        }}
      />
      {hotspotDebug ? (
        <p ref={debugReadoutRef} className={styles.debug} aria-hidden="true">
          Hotspot debug. Move over the picture.
        </p>
      ) : null}
    </div>
  );
}
