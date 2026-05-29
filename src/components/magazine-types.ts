export type MagazinePage = {
  magazinePage: number;
  src: string;
  width: number;
  height: number;
  isCover: boolean;
};

export type PagesManifest = {
  pageCount: number;
  pages: MagazinePage[];
};

export type TransitionStyle = "slide" | "crossfade" | "push";
