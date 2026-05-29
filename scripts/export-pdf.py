#!/usr/bin/env python3
"""
Build 36 flipbook page images from either:
  A) source/canva/ — 19 high-res PNG/JPG exports from Canva (recommended)
  B) NRNA HK Everest Day_2.pdf — rasterized at high DPI (fallback)

Requires: pip install pymupdf pillow
"""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "NRNA HK Everest Day_2.pdf"
CANVA_DIR = ROOT / "source" / "canva"
OUT = ROOT / "public" / "magazine"

PDF_DPI = 300

# Canva: keep PNG lossless; only shrink if a page is enormous (saves memory)
CANVA_MAX_PAGE_WIDTH = 4000

# PDF fallback
PDF_OUTPUT_EXT = "webp"
PDF_WEBP_QUALITY = 95


def log(msg: str) -> None:
    print(msg, flush=True)


def natural_key(path: Path) -> list:
    return [int(s) if s.isdigit() else s.lower() for s in re.split(r"(\d+)", path.name)]


def find_canva_sources() -> list[Path]:
    if not CANVA_DIR.is_dir():
        return []
    files: list[Path] = []
    for ext in ("png", "jpg", "jpeg", "webp", "PNG", "JPG", "JPEG", "WEBP"):
        files.extend(CANVA_DIR.glob(f"*.{ext}"))
    return sorted(
        (f for f in set(files) if f.name.lower() != "readme.md"),
        key=natural_key,
    )


def prepare_canva_image(img):
    from PIL import Image

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    elif img.mode != "RGB":
        img = img.convert("RGB")

    if img.width > CANVA_MAX_PAGE_WIDTH:
        new_h = int(img.height * CANVA_MAX_PAGE_WIDTH / img.width)
        img = img.resize((CANVA_MAX_PAGE_WIDTH, new_h), Image.Resampling.LANCZOS)
    return img


def prepare_pdf_image(img):
    from PIL import Image

    if img.mode not in ("RGB",):
        img = img.convert("RGB")
    if img.width > 2800:
        new_h = int(img.height * 2800 / img.width)
        img = img.resize((2800, new_h), Image.Resampling.LANCZOS)
    return img


def save_canva_page(img, out_path: Path) -> tuple[int, int]:
    prepared = prepare_canva_image(img)
    # compress_level=1: fast writes, lossless PNG (text stays crisp)
    prepared.save(out_path, "PNG", compress_level=1)
    return prepared.width, prepared.height


def save_pdf_page(img, out_path: Path) -> tuple[int, int]:
    prepared = prepare_pdf_image(img)
    prepared.save(out_path, "WEBP", quality=PDF_WEBP_QUALITY, method=4)
    return prepared.width, prepared.height


def append_page(
    pages: list[dict],
    img,
    magazine_page: int,
    source_index: int,
    is_cover: bool,
    from_canva: bool,
    side: str | None = None,
) -> None:
    ext = "png" if from_canva else PDF_OUTPUT_EXT
    filename = f"page-{magazine_page:02d}.{ext}"
    out_path = OUT / filename
    t0 = time.time()
    if from_canva:
        w, h = save_canva_page(img, out_path)
    else:
        w, h = save_pdf_page(img, out_path)
    entry: dict = {
        "magazinePage": magazine_page,
        "sourcePage": source_index,
        "src": f"/magazine/{filename}",
        "width": w,
        "height": h,
        "isCover": is_cover,
    }
    if side:
        entry["side"] = side
    pages.append(entry)
    log(f"  page {magazine_page:02d} -> {filename} ({w}x{h}, {time.time() - t0:.1f}s)")


def process_source_image(
    pages: list[dict],
    img_path: Path,
    source_index: int,
    magazine_page: int,
    from_canva: bool,
) -> int:
    from PIL import Image

    log(
        f"Source {source_index:02d}/19: {img_path.name} "
        f"({img_path.stat().st_size / 1_048_576:.1f} MB)"
    )
    img = Image.open(img_path)
    w, h = img.size
    is_cover = source_index == 1 or source_index == 19

    if is_cover:
        append_page(pages, img, magazine_page, source_index, True, from_canva)
        return magazine_page + 1

    mid = w // 2
    left = img.crop((0, 0, mid, h))
    right = img.crop((mid, 0, w, h))
    append_page(pages, left, magazine_page, source_index, False, from_canva, "left")
    magazine_page += 1
    append_page(
        pages, right, magazine_page, source_index, False, from_canva, "right"
    )
    return magazine_page + 1


def export_from_canva(files: list[Path]) -> list[dict]:
    if len(files) < 19:
        raise SystemExit(f"Need 19 images in source/canva/, found {len(files)}.")

    pages: list[dict] = []
    magazine_page = 1
    for i, path in enumerate(files[:19], start=1):
        magazine_page = process_source_image(pages, path, i, magazine_page, True)
    return pages


def export_from_pdf() -> list[dict]:
    import fitz
    from PIL import Image

    if not PDF.exists():
        print(f"Missing PDF: {PDF}", file=sys.stderr)
        sys.exit(1)

    doc = fitz.open(PDF)
    mat = fitz.Matrix(PDF_DPI / 72, PDF_DPI / 72)
    pages: list[dict] = []
    magazine_page = 1

    for pdf_index in range(doc.page_count):
        log(f"PDF page {pdf_index + 1}/{doc.page_count}")
        page = doc[pdf_index]
        rect = page.rect
        source_index = pdf_index + 1
        is_cover = pdf_index == 0 or pdf_index == doc.page_count - 1

        def pixmap_to_pil(pix: fitz.Pixmap) -> Image.Image:
            if pix.alpha:
                return Image.frombytes("RGBA", (pix.width, pix.height), pix.samples)
            return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

        if is_cover:
            pix = page.get_pixmap(matrix=mat, alpha=False)
            append_page(
                pages,
                pixmap_to_pil(pix),
                magazine_page,
                source_index,
                True,
                False,
            )
            magazine_page += 1
        else:
            mid_x = (rect.x0 + rect.x1) / 2
            clips = [
                ("left", fitz.Rect(rect.x0, rect.y0, mid_x, rect.y1)),
                ("right", fitz.Rect(mid_x, rect.y0, rect.x1, rect.y1)),
            ]
            for side, clip in clips:
                pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
                append_page(
                    pages,
                    pixmap_to_pil(pix),
                    magazine_page,
                    source_index,
                    False,
                    False,
                    side,
                )
                magazine_page += 1

    return pages


def clean_output_dir() -> None:
    for pattern in ("sheet-*", "page-*"):
        for old in OUT.glob(pattern):
            old.unlink()


def main() -> None:
    started = time.time()
    OUT.mkdir(parents=True, exist_ok=True)
    clean_output_dir()

    canva_files = find_canva_sources()
    if len(canva_files) >= 19:
        log(f"Using {min(len(canva_files), 19)} Canva PNG sources from {CANVA_DIR}")
        log("Output: lossless PNG (best for text)")
        pages = export_from_canva(canva_files)
    else:
        if canva_files:
            log(
                f"Only {len(canva_files)} file(s) in source/canva/ — need 19. Using PDF.",
                file=sys.stderr,
            )
        log(f"Rasterizing PDF at {PDF_DPI} DPI -> WebP")
        pages = export_from_pdf()

    manifest = {"pageCount": len(pages), "pages": pages}
    (OUT / "pages.json").write_text(json.dumps(manifest, indent=2))
    elapsed = time.time() - started
    log(f"Done: {len(pages)} pages in {elapsed:.0f}s -> {OUT}")


if __name__ == "__main__":
    main()
