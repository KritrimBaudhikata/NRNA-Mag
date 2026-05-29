import type { MagazinePage } from "@/components/magazine-types";

const cache = new Map<string, Promise<void>>();
const ready = new Set<string>();

export function isImageReady(src: string): boolean {
  return ready.has(src);
}

export function preloadImage(src: string): Promise<void> {
  if (ready.has(src)) return Promise.resolve();

  const existing = cache.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const done = () => {
        ready.add(src);
        resolve();
      };
      if (typeof img.decode === "function") {
        img.decode().then(done).catch(done);
      } else {
        done();
      }
    };
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });

  cache.set(src, promise);
  return promise;
}

export function preloadIndices(
  pages: MagazinePage[],
  indices: number[],
): Promise<void> {
  const tasks = indices
    .map((idx) => pages[idx]?.src)
    .filter(Boolean)
    .map((src) => preloadImage(src!));
  return Promise.all(tasks).then(() => undefined);
}

/** Preload spreads adjacent to current position for smoother next flip. */
export function preloadNeighbors(
  pages: MagazinePage[],
  isSpreadView: boolean,
  spreadIdx: number,
  mobilePageIdx: number,
  spreadPageIndices: (n: number) => number[],
): void {
  const indices = new Set<number>();

  if (isSpreadView) {
    for (const s of [spreadIdx - 1, spreadIdx, spreadIdx + 1]) {
      if (s < 0 || s > 18) continue;
      spreadPageIndices(s).forEach((i) => indices.add(i));
    }
  } else {
    for (const i of [mobilePageIdx - 1, mobilePageIdx, mobilePageIdx + 1]) {
      if (i >= 0 && i < pages.length) indices.add(i);
    }
  }

  void preloadIndices(pages, [...indices]);
}
