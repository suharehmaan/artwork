"use client";

import dynamic from "next/dynamic";
import type { ExhibitionCanvasProps } from "./ExhibitionCanvas";

const ExhibitionCanvas = dynamic(
  () => import("./ExhibitionCanvas").then((mod) => mod.ExhibitionCanvas),
  {
    ssr: false,
    loading: () => (
      <p className="exhibition-canvas-loading" role="status">
        Preparing the exhibition…
      </p>
    ),
  },
);

export function CanvasMount(props: ExhibitionCanvasProps) {
  return <ExhibitionCanvas {...props} />;
}
