"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";

export function LanguagePrompt() {
  const { t, setLocale, ready, hasChosenLocale: hasChosen } = useLocale();

  if (!ready || hasChosen) return null;

  const pick = (locale: Locale) => () => setLocale(locale);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-prompt-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <h2
          id="lang-prompt-title"
          className="mb-6 text-center text-xl font-semibold text-gray-900"
        >
          {t("language.promptTitle")}
        </h2>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={pick("en")}
            className="rounded-xl bg-[#E91E63] px-4 py-3 text-lg font-medium text-white transition hover:bg-[#c2185b]"
          >
            {t("language.english")}
          </button>
          <button
            type="button"
            onClick={pick("ne")}
            className="rounded-xl border-2 border-[#E91E63] px-4 py-3 text-lg font-medium text-[#E91E63] transition hover:bg-pink-50"
          >
            {t("language.nepali")}
          </button>
        </div>
      </div>
    </div>
  );
}
