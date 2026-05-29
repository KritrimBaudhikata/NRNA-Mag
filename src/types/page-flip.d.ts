declare module "page-flip" {
  export interface PageFlipSettings {
    width?: number;
    height?: number;
    size?: "fixed" | "stretch";
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startPage?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings);
    loadFromImages(images: string[]): void;
    flipNext(corner?: string): void;
    flipPrev(corner?: string): void;
    getPageCount(): number;
    getCurrentPageIndex(): number;
    on(event: string, callback: () => void): void;
    destroy(): void;
  }
}
