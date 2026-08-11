"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { DICTIONARY, type DictKey } from "./dictionary";

export type Locale = "en" | "th";

const STORAGE_KEY = "bkkx-locale";

// A minimal external store: localStorage is the source of truth, this
// module is just the pub-sub layer so React knows when to re-render.
// useSyncExternalStore (not useState+useEffect) is the React-documented
// way to read a value that can differ between server and client without
// a setState-in-effect render cascade or a hydration-mismatch warning —
// the server snapshot is always "en"; the client snapshot reads storage.
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): Locale {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "th" ? "th" : "en";
}

function getServerSnapshot(): Locale {
  return "en";
}

function writeLocale(next: Locale) {
  window.localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach((l) => l());
}

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (key: DictKey) => string };

const LocaleCtx = createContext<Ctx | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale: writeLocale,
      t: (key) => DICTIONARY[locale][key] ?? DICTIONARY.en[key] ?? key,
    }),
    [locale],
  );

  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleCtx);
  if (!ctx) {
    // Pages that render outside the provider (there shouldn't be any, but
    // a missing wrap should degrade to English rather than crash the page).
    return { locale: "en", setLocale: () => {}, t: (key) => DICTIONARY.en[key] ?? key };
  }
  return ctx;
}
