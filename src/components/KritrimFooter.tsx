"use client";

import { useLocale } from "@/i18n/LocaleProvider";

const WHATSAPP_URL =
  "https://wa.me/85263451395?text=" +
  encodeURIComponent("Hi, I want to contact about IT and AI services");

export function KritrimFooter() {
  const { t } = useLocale();

  return (
    <footer className="shrink-0 border-t border-pink-100/80 bg-white/95 px-2 py-1 text-center text-[0.65rem] leading-tight text-gray-700 backdrop-blur-sm sm:px-3 sm:py-1.5 sm:text-xs pb-[max(0.25rem,env(safe-area-inset-bottom))]">
      <span>{t("footer.developedBy")}</span>
      <span className="mx-2 text-gray-300">|</span>
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#E91E63] underline-offset-2 hover:underline"
      >
        {t("footer.whatsapp")}
      </a>
    </footer>
  );
}
