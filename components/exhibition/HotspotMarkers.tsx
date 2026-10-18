"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type Ref,
} from "react";
import type { CameraState, Hotspot, HotspotAction } from "@/lib/exhibition/types";
import { actionKindLabel } from "@/lib/exhibition/scenes";
import type { SceneLayout } from "./ExhibitionCanvas";
import { DoorwayIcon, MagnifierIcon, StoryIcon, VolumeIcon } from "./icons";
import styles from "./HotspotMarkers.module.css";

export type HotspotMarkersHandle = {
  /** Moves every marker to match the camera. Called on each camera frame. */
  position: (camera: CameraState) => void;
};

type HotspotMarkersProps = {
  ref?: Ref<HotspotMarkersHandle>;
  layout: SceneLayout;
  hotspots: Hotspot[];
  /** Hovered on the canvas or focused in the story list. */
  activeId: string | null;
  selectedId: string | null;
  showLabels: boolean;
  onActivate: (hotspot: Hotspot) => void;
  onFocusMarker: (hotspotId: string | null, fromKeyboard: boolean) => void;
  onWheel: (event: WheelEvent) => void;
};

/** Distance from the right edge at which a label flips to the marker's left. */
const LABEL_FLIP = 220;

/**
 * Small HTML markers laid over the canvas. Each one is a real button, so it
 * can take keyboard focus and has a 44px touch target around a small icon.
 */
export function HotspotMarkers({
  ref,
  layout,
  hotspots,
  activeId,
  selectedId,
  showLabels,
  onActivate,
  onFocusMarker,
  onWheel,
}: HotspotMarkersProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLButtonElement>());
  const cameraRef = useRef<CameraState | null>(null);
  const onWheelRef = useRef(onWheel);

  useEffect(() => {
    onWheelRef.current = onWheel;
  });

  const place = useCallback(() => {
    const camera = cameraRef.current;
    if (!camera) {
      return;
    }
    const width = window.innerWidth;
    for (const [id, node] of nodes.current) {
      const anchor = layout.anchors[id];
      if (!anchor) {
        continue;
      }
      const x = Math.round((camera.x + anchor.x * camera.zoom) * 2) / 2;
      const y = Math.round((camera.y + anchor.y * camera.zoom) * 2) / 2;
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      node.dataset.side = x > width - LABEL_FLIP ? "left" : "right";
    }
  }, [layout]);

  useImperativeHandle(
    ref,
    () => ({
      position: (camera) => {
        cameraRef.current = camera;
        place();
      },
    }),
    [place],
  );

  useLayoutEffect(() => {
    place();
  }, [place]);

  // The wheel should still zoom the picture when the pointer is over a marker.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) {
      return;
    }
    const forward = (event: WheelEvent) => onWheelRef.current(event);
    layer.addEventListener("wheel", forward, { passive: false });
    return () => layer.removeEventListener("wheel", forward);
  }, []);

  return (
    <div ref={layerRef} className={styles.layer} data-labels={showLabels ? "all" : "hover"}>
      {hotspots.map((hotspot) =>
        layout.anchors[hotspot.id] ? (
          <button
            key={hotspot.id}
            ref={(node) => {
              if (node) {
                nodes.current.set(hotspot.id, node);
              } else {
                nodes.current.delete(hotspot.id);
              }
            }}
            type="button"
            className={styles.marker}
            data-active={hotspot.id === activeId ? "true" : undefined}
            data-selected={hotspot.id === selectedId ? "true" : undefined}
            aria-label={`${hotspot.label}. ${actionKindLabel(hotspot.action)}. ${hotspot.summary}`}
            onClick={() => onActivate(hotspot)}
            onFocus={(event) =>
              onFocusMarker(hotspot.id, event.currentTarget.matches(":focus-visible"))
            }
            onBlur={() => onFocusMarker(null, false)}
          >
            <span className={styles.disc}>
              <MarkerIcon type={hotspot.action.type} />
            </span>
            <span className={styles.label} aria-hidden="true">
              {hotspot.label}
            </span>
          </button>
        ) : null,
      )}
    </div>
  );
}

function MarkerIcon({ type }: { type: HotspotAction["type"] }) {
  switch (type) {
    case "open-story":
      return <StoryIcon />;
    case "enter-scene":
      return <DoorwayIcon />;
    case "play-audio":
      return <VolumeIcon />;
    case "zoom-to":
      return <MagnifierIcon />;
  }
}
