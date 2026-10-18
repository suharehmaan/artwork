import { Container, Graphics, Polygon } from "pixi.js";
import type { Hotspot, Point, Rect } from "@/lib/exhibition/types";

/** A hotspot resolved into world pixels for the scene that is showing. */
export type HotspotRegion = {
  hotspot: Hotspot;
  /** Flat x, y list of the polygon. */
  polygon: number[];
  bounds: Rect;
  anchor: Point;
};

type Entry = {
  region: HotspotRegion;
  shape: Graphics;
};

const DEBUG = 0xd23c6e;

/**
 * Invisible polygon hit areas in world space, so they stay aligned with the
 * artwork at every zoom level. Nothing is drawn unless the debug view is on;
 * the visible markers are HTML elements laid over the canvas.
 */
export class HotspotLayer {
  readonly container = new Container();
  private entries: Entry[] = [];
  private zoom = 1;
  private debug = false;

  constructor(private readonly onHover: (hotspotId: string | null) => void) {
    this.container.eventMode = "passive";
    this.container.label = "hotspots";
  }

  setRegions(regions: HotspotRegion[]): void {
    this.clear();
    for (const region of regions) {
      const shape = new Graphics();
      shape.eventMode = "static";
      shape.cursor = "pointer";
      shape.hitArea = new Polygon(region.polygon);
      (shape as Graphics & { hotspot?: Hotspot }).hotspot = region.hotspot;
      shape.on("pointerover", () => this.onHover(region.hotspot.id));
      shape.on("pointerout", () => this.onHover(null));
      this.container.addChild(shape);
      const entry = { region, shape };
      this.entries.push(entry);
      this.draw(entry);
    }
  }

  updateZoom(zoom: number): void {
    if (!Number.isFinite(zoom) || zoom <= 0 || zoom === this.zoom) {
      return;
    }
    this.zoom = zoom;
    if (this.debug) {
      this.entries.forEach((entry) => this.draw(entry));
    }
  }

  /** Draws polygon outlines and marker anchors for development. */
  setDebug(enabled: boolean): void {
    this.debug = enabled;
    this.entries.forEach((entry) => this.draw(entry));
  }

  destroy(): void {
    this.clear();
  }

  private clear(): void {
    for (const entry of this.entries) {
      entry.shape.removeAllListeners();
    }
    const children = this.container.removeChildren();
    for (const child of children) {
      child.destroy({ children: true });
    }
    this.entries = [];
  }

  private draw({ region, shape }: Entry): void {
    shape.clear();
    if (!this.debug) {
      return;
    }
    shape.poly(region.polygon);
    shape.fill({ color: DEBUG, alpha: 0.12 });
    shape.stroke({ width: 2 / this.zoom, color: DEBUG, alpha: 0.95, join: "round" });
    shape.circle(region.anchor.x, region.anchor.y, 4 / this.zoom).fill({ color: DEBUG });
  }
}

/**
 * Converts normalized hotspot geometry to world pixels. `frameFor` returns the
 * world rectangle of the background (no layer) or of a placed layer.
 */
export function buildRegions(
  hotspots: Hotspot[],
  frameFor: (layerId: string | undefined) => Rect | null,
): HotspotRegion[] {
  const regions: HotspotRegion[] = [];
  for (const hotspot of hotspots) {
    const frame = frameFor(hotspot.layerId);
    if (!frame || hotspot.points.length < 3) {
      continue;
    }
    const toWorld = (point: Point): Point => ({
      x: frame.x + point.x * frame.width,
      y: frame.y + point.y * frame.height,
    });
    const points = hotspot.points.map(toWorld);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let sumX = 0;
    let sumY = 0;
    const polygon: number[] = [];
    for (const point of points) {
      polygon.push(point.x, point.y);
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
      sumX += point.x;
      sumY += point.y;
    }
    regions.push({
      hotspot,
      polygon,
      bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      anchor: hotspot.anchor
        ? toWorld(hotspot.anchor)
        : { x: sumX / points.length, y: sumY / points.length },
    });
  }
  return regions;
}
