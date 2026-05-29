"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";

const OPTIONS: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ne", label: "ने" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className="flex shrink-0 items-center gap-0.5 rounded-md border border-pink-100 bg-white/90 p-0.5 shadow-sm"
      role="radiogroup"
      aria-label="Language"
    >
      {OPTIONS.map(({ code, label }) => {
        const selected = locale === code;
        return (
          <label
            key={code}
            className={`cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium transition sm:px-2 sm:py-1 sm:text-sm ${
              selected
                ? "bg-[#E91E63] text-white"
                : "text-gray-600 hover:bg-pink-50"
            }`}
          >
            <input
              type="radio"
              name="ui-locale"
              value={code}
              checked={selected}
              onChange={() => setLocale(code)}
              className="sr-only"
            />
            {label}
          </label>
        );
      })}
    </div>
  );
}
