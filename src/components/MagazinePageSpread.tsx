import { MagazinePageImage } from "./MagazinePageImage";
import type { MagazinePage } from "./magazine-types";

type MagazinePageSpreadProps = {
  indices: number[];
  pages: MagazinePage[];
  isCoverSpread: boolean;
  isMobilePortrait: boolean;
  className?: string;
};

export function MagazinePageSpread({
  indices,
  pages,
  isCoverSpread,
  isMobilePortrait,
  className = "",
}: MagazinePageSpreadProps) {
  const isSinglePage =
    isMobilePortrait || isCoverSpread || indices.length === 1;

  return (
    <div
      className={`magazine-spread ${isCoverSpread ? "magazine-spread--cover" : ""} ${isMobilePortrait ? "magazine-spread--mobile-portrait" : ""} ${isSinglePage ? "magazine-spread--single" : "magazine-spread--pair"} ${className}`}
    >
      {indices.map((idx) => {
        const page = pages[idx];
        if (!page) return null;
        return (
          <div key={idx} className="magazine-page-slot">
            <MagazinePageImage
              src={page.src}
              alt={`Magazine page ${page.magazinePage}`}
              width={page.width}
              height={page.height}
            />
          </div>
        );
      })}
    </div>
  );
}
