import type { Howl } from "howler";
import type { AudioSnapshot, NarrationTrack } from "./types";

type Listener = (snapshot: AudioSnapshot) => void;

const idleSnapshot = (): AudioSnapshot => ({
  status: "idle",
  title: "",
  transcript: "",
  message: "",
  muted: false,
  trackId: null,
});

async function probeAudio(src: string): Promise<boolean> {
  try {
    const head = await fetch(src, { method: "HEAD", cache: "no-store" });
    if (head.ok) {
      return true;
    }
    if (head.status !== 405 && head.status !== 501) {
      return false;
    }
    const get = await fetch(src, { method: "GET", cache: "no-store" });
    return get.ok;
  } catch {
    return false;
  }
}

/**
 * Plays at most one narration, and only after a caller asks it to.
 * A missing file never enters a playing state.
 */
export class NarrationPlayer {
  private howl: Howl | null = null;
  private howlSrc: string | null = null;
  private snapshot: AudioSnapshot = idleSnapshot();
  private listeners = new Set<Listener>();
  private requestToken = 0;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): AudioSnapshot {
    return this.snapshot;
  }

  async play(track: NarrationTrack): Promise<void> {
    const token = ++this.requestToken;
    this.emit({
      status: "checking",
      title: track.title,
      transcript: track.transcript,
      message: "Checking the narration file…",
      muted: this.snapshot.muted,
      trackId: track.id,
    });

    const available = await probeAudio(track.src);
    if (token !== this.requestToken) {
      return;
    }
    if (!available) {
      this.unload();
      this.emit({
        status: "missing",
        title: track.title,
        transcript: track.transcript,
        message: `Narration is unavailable. Add the recording at public${track.src} and press play again.`,
        muted: this.snapshot.muted,
        trackId: track.id,
      });
      return;
    }

    this.emit({
      ...this.snapshot,
      status: "loading",
      title: track.title,
      transcript: track.transcript,
      message: "Loading narration…",
      trackId: track.id,
    });

    try {
      const howl = await this.ensureHowl(track);
      if (token !== this.requestToken) {
        return;
      }
      howl.mute(this.snapshot.muted);
      howl.stop();
      const played = howl.play();
      if (played === undefined || (typeof played === "number" && played < 0)) {
        throw new Error("Playback did not start.");
      }
    } catch {
      if (token !== this.requestToken) {
        return;
      }
      this.unload();
      this.emit({
        status: "error",
        title: track.title,
        transcript: track.transcript,
        message: "The narration file could not be played.",
        muted: this.snapshot.muted,
        trackId: track.id,
      });
    }
  }

  toggle(track: NarrationTrack): void {
    if (
      this.snapshot.status === "playing" &&
      this.snapshot.trackId === track.id &&
      this.howl
    ) {
      this.howl.pause();
      return;
    }
    if (
      this.snapshot.status === "paused" &&
      this.snapshot.trackId === track.id &&
      this.howl &&
      this.howlSrc === track.src
    ) {
      this.howl.play();
      return;
    }
    void this.play(track);
  }

  setMuted(muted: boolean): void {
    this.howl?.mute(muted);
    this.emit({ ...this.snapshot, muted });
  }

  /** Stop playback when its scene is no longer showing. */
  stopForScene(sceneId: string, tracks: NarrationTrack[]): void {
    const active = tracks.find((track) => track.id === this.snapshot.trackId);
    if (!active || active.sceneId !== sceneId) {
      return;
    }
    this.requestToken += 1;
    this.unload();
    this.emit({
      ...idleSnapshot(),
      muted: this.snapshot.muted,
    });
  }

  destroy(): void {
    this.requestToken += 1;
    this.unload();
    this.listeners.clear();
  }

  private async ensureHowl(track: NarrationTrack): Promise<Howl> {
    if (this.howl && this.howlSrc === track.src) {
      return this.howl;
    }
    this.unload();
    const { Howl } = await import("howler");
    const howl = new Howl({
      src: [track.src],
      html5: true,
      preload: true,
      onload: () => {
        if (this.howl !== howl) {
          return;
        }
        if (this.snapshot.status === "loading" || this.snapshot.status === "checking") {
          this.emit({ ...this.snapshot, status: "ready", message: "" });
        }
      },
      onplay: () => {
        if (this.howl !== howl) {
          return;
        }
        this.emit({ ...this.snapshot, status: "playing", message: "" });
      },
      onpause: () => {
        if (this.howl !== howl) {
          return;
        }
        this.emit({ ...this.snapshot, status: "paused", message: "" });
      },
      onend: () => {
        if (this.howl !== howl) {
          return;
        }
        this.emit({ ...this.snapshot, status: "paused", message: "" });
      },
      onloaderror: () => {
        if (this.howl !== howl) {
          return;
        }
        this.emit({
          ...this.snapshot,
          status: "error",
          message: "The narration file could not be loaded.",
        });
      },
      onplayerror: () => {
        if (this.howl !== howl) {
          return;
        }
        this.emit({
          ...this.snapshot,
          status: "error",
          message: "The narration file could not be played.",
        });
      },
    });
    this.howl = howl;
    this.howlSrc = track.src;
    return howl;
  }

  private unload(): void {
    if (!this.howl) {
      return;
    }
    this.howl.stop();
    this.howl.unload();
    this.howl = null;
    this.howlSrc = null;
  }

  private emit(next: AudioSnapshot): void {
    this.snapshot = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }
}
