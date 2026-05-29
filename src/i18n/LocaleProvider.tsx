"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import en from "../../messages/en.json";
import ne from "../../messages/ne.json";
import { DEFAULT_LOCALE, STORAGE_KEY, type Locale } from "./locales";

type Messages = typeof en;

const catalogs: Record<Locale, Messages> = { en, ne };

type Vars = Record<string, string | number>;

function getNested(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(vars[key] ?? `{${key}}`),
  );
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Vars) => string;
  ready: boolean;
  hasChosenLocale: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);
  const [hasChosenLocale, setHasChosenLocale] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "en" || stored === "ne") {
      setLocaleState(stored);
      setHasChosenLocale(true);
    }
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    setHasChosenLocale(true);
    document.documentElement.lang = next === "ne" ? "ne" : "en";
  }, []);

  useEffect(() => {
    if (ready) {
      document.documentElement.lang = locale === "ne" ? "ne" : "en";
    }
  }, [locale, ready]);

  const t = useCallback(
    (key: string, vars?: Vars) => {
      const raw = getNested(
        catalogs[locale] as unknown as Record<string, unknown>,
        key,
      );
      return interpolate(raw, vars);
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, ready, hasChosenLocale }),
    [locale, setLocale, t, ready, hasChosenLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

