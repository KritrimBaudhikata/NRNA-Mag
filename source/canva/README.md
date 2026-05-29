# Canva source images (recommended for sharp text)

Export **19 pages** from Canva — same layout as the PDF, **not** 36 files.

| Canva / file # | Magazine content |
|----------------|------------------|
| 1 | Front cover |
| 2–18 | Two-page spreads (we split each into left + right) |
| 19 | Back cover |

## Canva export settings

1. **Format:** PNG (best for text) or PDF (print quality)
2. **Quality:** Highest / “Download with transparent background” off unless you need it
3. **Size:** Use Canva’s largest download (Pro: “PDF Print” or high-res PNG per page)

## File naming

Place exactly **19** files in this folder, named in order:

```
01.png
02.png
…
19.png
```

Also accepted: `page-01.png`, `spread-02.png`, etc. (sorted alphabetically).

## Build magazine pages

```bash
npm run export:magazine
```

If this folder has 19 images, they are used instead of rasterizing the PDF (sharper text).

**Expect 2–5 minutes** for 19 large Canva PNGs. Output is **lossless PNG** (not WebP) so text stays sharp. Progress is printed per page.

If the folder is empty, the script falls back to `NRNA HK Everest Day_2.pdf` at 300 DPI.
