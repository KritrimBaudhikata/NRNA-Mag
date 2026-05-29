"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { DownloadModal } from "./DownloadModal";
import { KritrimFooter } from "./KritrimFooter";
import { LanguagePrompt } from "./LanguagePrompt";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MagazineReader } from "./MagazineReader";

export function ReaderShell() {
  const { t } = useLocale();
  const [downloadOpen, setDownloadOpen] = useState(false);

  return (
    <div className="reader-shell flex h-dvh max-h-dvh flex-col overflow-hidden">
      <LanguagePrompt />
      <header className="site-header shrink-0 border-b border-pink-100 bg-white/95 px-3 py-2 backdrop-blur-sm sm:px-4">
        <div className="site-header-brand min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold tracking-tight text-[#E91E63] sm:text-base">
            Everest Day Hong Kong 2026
          </h1>
          <p className="truncate text-[0.65rem] text-gray-500 sm:text-xs">
            Momo, Mountains & Community
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDownloadOpen(true)}
          className="header-download-btn shrink-0"
        >
          <span className="header-download-btn-long">{t("reader.downloadPdf")}</span>
          <span className="header-download-btn-short">{t("reader.downloadPdfShort")}</span>
        </button>
        <LanguageSwitcher />
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <MagazineReader />
      </main>
      <KritrimFooter />
      <DownloadModal open={downloadOpen} onClose={() => setDownloadOpen(false)} />
    </div>
  );
}
