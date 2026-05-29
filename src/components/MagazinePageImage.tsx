"use client";

import { useLayoutEffect, useState } from "react";
import { isImageReady } from "@/lib/preload-pages";

type MagazinePageImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** Renders only after the bitmap is decoded (preload cache or onLoad). */
export function MagazinePageImage({
  src,
  alt,
  width,
  height,
}: MagazinePageImageProps) {
  const [visible, setVisible] = useState(() => isImageReady(src));

  useLayoutEffect(() => {
    if (isImageReady(src)) setVisible(true);
  }, [src]);

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`magazine-page${visible ? " magazine-page--ready" : ""}`}
      decoding="sync"
      loading="eager"
      fetchPriority="high"
      draggable={false}
      onLoad={() => setVisible(true)}
    />
  );
}
