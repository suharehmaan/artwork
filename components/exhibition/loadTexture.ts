import { Texture } from "pixi.js";

export type LoadedTexture = {
  texture: Texture;
  /** Pixel size of the file before any downscaling. */
  sourceWidth: number;
  sourceHeight: number;
};

/**
 * Loads an image and, if needed, draws a smaller copy before it becomes a texture.
 * Large artwork can exceed what some devices can upload to the GPU.
 */
export async function loadCappedTexture(
  url: string,
  maxEdge: number,
): Promise<LoadedTexture> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load image (${response.status}).`);
  }
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const largest = Math.max(bitmap.width, bitmap.height);
    const scale = largest > maxEdge ? maxEdge / largest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not prepare the image for display.");
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const texture = Texture.from(canvas);
    texture.source.autoGenerateMipmaps = true;
    return { texture, sourceWidth: bitmap.width, sourceHeight: bitmap.height };
  } finally {
    bitmap.close();
  }
}

export function maxTextureEdge(gl: WebGLRenderingContext | null): number {
  if (!gl) {
    return 4096;
  }
  const reported = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  if (!Number.isFinite(reported) || reported <= 0) {
    return 4096;
  }
  return Math.max(1024, Math.min(reported, 4096));
}
