"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import {
  preloadIndices,
  preloadNeighbors,
} from "@/lib/preload-pages";
import { MagazinePageSpread } from "./MagazinePageSpread";
import type {
  MagazinePage,
  PagesManifest,
  TransitionStyle,
} from "./magazine-types";

const SPREAD_COUNT = 19;
const LAST_PAGE_INDEX = 35;
const SWIPE_THRESHOLD_PX = 48;
const TRANSITION_MS = 520;
const TRANSITION_STORAGE_KEY = "magazine-transition-style";

function spreadPageIndices(spreadIdx: number): number[] {
  if (spreadIdx <= 0) return [0];
  if (spreadIdx >= SPREAD_COUNT - 1) return [LAST_PAGE_INDEX];
  const left = (spreadIdx - 1) * 2 + 1;
  return [left, left + 1];
}

function spreadIdxFromIndices(indices: number[]): number {
  if (indices.length === 1) {
    return indices[0] === 0 ? 0 : SPREAD_COUNT - 1;
  }
  return Math.floor((indices[0] - 1) / 2) + 1;
}

function isCoverSpreadIndex(spreadIdx: number) {
  return spreadIdx === 0 || spreadIdx === SPREAD_COUNT - 1;
}

function useViewportMode() {
  const [mode, setMode] = useState({
    isNarrow: false,
    isLandscape: false,
  });

  useEffect(() => {
    const update = () => {
      setMode({
        isNarrow: window.matchMedia("(max-width: 767px)").matches,
        isLandscape: window.matchMedia("(orientation: landscape)").matches,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  const isMobilePortrait = mode.isNarrow && !mode.isLandscape;
  const isSpreadView = !mode.isNarrow || mode.isLandscape;

  return { ...mode, isMobilePortrait, isSpreadView };
}

function computeStageSize(
  pages: MagazinePage[],
  isMobilePortrait: boolean,
  isSpreadView: boolean,
  viewportWidth: number,
  viewportHeight: number,
): { width: number; height: number } {
  const inner =
    pages.find((p) => p.magazinePage === 6) ??
    pages.find((p) => !p.isCover) ??
    pages[0];
  if (!inner) return { width: 320, height: 452 };

  const availW = Math.max(viewportWidth - 12, 260);
  const availH = Math.max(viewportHeight - 8, 180);
  const aspect = inner.height / inner.width;

  let pageW = isMobilePortrait ? availW : availW / 2;
  let pageH = pageW * aspect;

  if (pageH > availH) {
    pageH = availH;
    pageW = pageH / aspect;
  }

  const spreadW = isMobilePortrait ? pageW : pageW * 2;
  return {
    width: Math.round(spreadW),
    height: Math.round(pageH),
  };
}

export function MagazineReader() {
  const { t } = useLocale();
  const [pages, setPages] = useState<MagazinePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [spreadIdx, setSpreadIdx] = useState(0);
  const [mobilePageIdx, setMobilePageIdx] = useState(0);
  const [transitionStyle, setTransitionStyle] =
    useState<TransitionStyle>("slide");
  const [transition, setTransition] = useState<{
    outgoing: number[];
    incoming: number[];
    dir: 1 | -1;
  } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const stageOuterRef = useRef<HTMLDivElement>(null);
  const stageCenterRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const { isMobilePortrait, isSpreadView } = useViewportMode();

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const stored = localStorage.getItem(TRANSITION_STORAGE_KEY);
    if (stored === "slide" || stored === "crossfade" || stored === "push") {
      setTransitionStyle(stored);
    }
  }, []);

  useEffect(() => {
    fetch("/magazine/pages.json")
      .then((r) => r.json())
      .then((data: PagesManifest) => setPages(data.pages))
      .finally(() => setLoading(false));
  }, []);

  const measureStage = useCallback(() => {
    const outer = stageOuterRef.current;
    if (!pages.length || !outer) return;
    const w = outer.clientWidth;
    const h = outer.clientHeight;
    if (w < 1 || h < 1) return;
    const next = computeStageSize(
      pages,
      isMobilePortrait,
      isSpreadView,
      w,
      h,
    );
    setStageSize((prev) =>
      prev.width === next.width && prev.height === next.height ? prev : next,
    );

    const center = stageCenterRef.current;
    if (!center) return;
    if (next.width < 1 || next.height < 1) {
      center.classList.remove("magazine-stage-center--sized");
      center.style.removeProperty("--stage-w");
      center.style.removeProperty("--stage-h");
      return;
    }
    center.style.setProperty("--stage-w", `${next.width}px`);
    center.style.setProperty("--stage-h", `${next.height}px`);
    center.classList.add("magazine-stage-center--sized");
  }, [pages, isMobilePortrait, isSpreadView]);

  useLayoutEffect(() => {
    measureStage();
  }, [measureStage]);

  useEffect(() => {
    const outer = stageOuterRef.current;
    if (!outer || !pages.length) return;
    const ro = new ResizeObserver(() => measureStage());
    ro.observe(outer);
    return () => ro.disconnect();
  }, [measureStage, pages.length]);

  useEffect(() => {
    const onOrientation = () => measureStage();
    window.addEventListener("orientationchange", onOrientation);
    return () => window.removeEventListener("orientationchange", onOrientation);
  }, [measureStage]);

  useEffect(() => {
    if (!pages.length) return;
    void preloadIndices(pages, spreadPageIndices(0));
    preloadNeighbors(
      pages,
      isSpreadView,
      spreadIdx,
      mobilePageIdx,
      spreadPageIndices,
    );
  }, [pages, isSpreadView, spreadIdx, mobilePageIdx]);

  const currentIndices = isSpreadView
    ? spreadPageIndices(spreadIdx)
    : [mobilePageIdx];

  const displayIndices = transition?.incoming ?? currentIndices;

  const currentMagazinePage =
    pages[displayIndices[0]]?.magazinePage ?? 1;

  const atStart = isSpreadView ? spreadIdx === 0 : mobilePageIdx === 0;
  const atEnd = isSpreadView
    ? spreadIdx === SPREAD_COUNT - 1
    : mobilePageIdx === LAST_PAGE_INDEX;

  const commitNavigation = useCallback(
    async (nextSpread: number, nextMobile: number, dir: 1 | -1) => {
      const outgoing = isSpreadView
        ? spreadPageIndices(spreadIdx)
        : [mobilePageIdx];
      const incoming = isSpreadView
        ? spreadPageIndices(nextSpread)
        : [nextMobile];

      if (outgoing.join("-") === incoming.join("-")) return;

      const apply = () => {
        setSpreadIdx(nextSpread);
        setMobilePageIdx(nextMobile);
        setTransition(null);
        setIsAnimating(false);
        preloadNeighbors(
          pages,
          isSpreadView,
          nextSpread,
          nextMobile,
          spreadPageIndices,
        );
      };

      setIsAnimating(true);

      try {
        await preloadIndices(pages, incoming);
      } catch {
        /* show anyway if preload fails */
      }

      if (reducedMotion) {
        apply();
        return;
      }

      setTransition({ outgoing, incoming, dir });
      window.setTimeout(apply, TRANSITION_MS);
    },
    [isSpreadView, spreadIdx, mobilePageIdx, pages, reducedMotion],
  );

  const goNext = useCallback(() => {
    if (isAnimating) return;
    if (isSpreadView) {
      if (spreadIdx >= SPREAD_COUNT - 1) return;
      void commitNavigation(spreadIdx + 1, mobilePageIdx, 1);
    } else {
      if (mobilePageIdx >= LAST_PAGE_INDEX) return;
      void commitNavigation(spreadIdx, mobilePageIdx + 1, 1);
    }
  }, [commitNavigation, isAnimating, isSpreadView, spreadIdx, mobilePageIdx]);

  const goPrev = useCallback(() => {
    if (isAnimating) return;
    if (isSpreadView) {
      if (spreadIdx <= 0) return;
      void commitNavigation(spreadIdx - 1, mobilePageIdx, -1);
    } else {
      if (mobilePageIdx <= 0) return;
      void commitNavigation(spreadIdx, mobilePageIdx - 1, -1);
    }
  }, [commitNavigation, isAnimating, isSpreadView, spreadIdx, mobilePageIdx]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  const onStyleChange = (style: TransitionStyle) => {
    setTransitionStyle(style);
    localStorage.setItem(TRANSITION_STORAGE_KEY, style);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  if (loading) {
    return (
      <p className="flex flex-1 items-center justify-center text-gray-500">
        {t("reader.loading")}
      </p>
    );
  }

  const incomingIndices = transition?.incoming ?? currentIndices;
  const outgoingIndices = transition?.outgoing ?? null;

  const coverForIndices = (indices: number[]) =>
    isSpreadView
      ? isCoverSpreadIndex(spreadIdxFromIndices(indices))
      : (pages[indices[0]]?.isCover ?? false);

  return (
    <div className="magazine-reader flex min-h-0 flex-1 flex-col">
      <div
        ref={stageOuterRef}
        className={`magazine-stage-outer relative min-h-0 flex-1 ${isMobilePortrait ? "magazine-stage--mobile" : ""}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {!atStart && !isAnimating && (
          <button
            type="button"
            className="magazine-tap-zone magazine-tap-zone--prev"
            onClick={goPrev}
            aria-label={t("reader.prev")}
          />
        )}
        {!atEnd && !isAnimating && (
          <button
            type="button"
            className="magazine-tap-zone magazine-tap-zone--next"
            onClick={goNext}
            aria-label={t("reader.next")}
          />
        )}

        <div
          ref={stageCenterRef}
          className="magazine-stage-center"
        >
          <div
            className="magazine-transition-viewport"
            data-transition={transitionStyle}
            data-direction={transition?.dir ?? 0}
            aria-live="polite"
          >
            {transition && outgoingIndices && (
              <div className="magazine-transition-layer magazine-transition-layer--exit">
                <MagazinePageSpread
                  indices={outgoingIndices}
                  pages={pages}
                  isCoverSpread={coverForIndices(outgoingIndices)}
                  isMobilePortrait={isMobilePortrait}
                />
              </div>
            )}
            <div
              className={`magazine-transition-layer magazine-transition-layer--enter ${transition ? "" : "magazine-transition-layer--idle"}`}
            >
              <MagazinePageSpread
                indices={incomingIndices}
                pages={pages}
                isCoverSpread={coverForIndices(incomingIndices)}
                isMobilePortrait={isMobilePortrait}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={`magazine-toolbar shrink-0 border-t border-pink-100/80 bg-white/95 px-2 py-1.5 sm:px-3 ${isMobilePortrait ? "magazine-toolbar--mobile" : ""}`}
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={atStart || isAnimating}
          className="magazine-nav-btn magazine-nav-btn--icon"
          aria-label={t("reader.prev")}
        >
          <span aria-hidden>‹</span>
          <span className="magazine-nav-btn-text">{t("reader.prev")}</span>
        </button>

        <span className="magazine-page-label">
          {t("reader.pageOf", {
            current: currentMagazinePage,
            total: pages.length,
          })}
        </span>

        <button
          type="button"
          onClick={goNext}
          disabled={atEnd || isAnimating}
          className="magazine-nav-btn magazine-nav-btn--icon"
          aria-label={t("reader.next")}
        >
          <span className="magazine-nav-btn-text">{t("reader.next")}</span>
          <span aria-hidden>›</span>
        </button>

        <label className="magazine-transition-picker">
          <span className="magazine-transition-picker-label">
            {t("reader.transitionStyle")}
          </span>
          <select
            value={transitionStyle}
            onChange={(e) => onStyleChange(e.target.value as TransitionStyle)}
            className="magazine-transition-select"
            aria-label={t("reader.transitionStyle")}
          >
            <option value="slide">{t("reader.transitionSlide")}</option>
            <option value="crossfade">{t("reader.transitionCrossfade")}</option>
            <option value="push">{t("reader.transitionPush")}</option>
          </select>
        </label>
      </div>
    </div>
  );
}
