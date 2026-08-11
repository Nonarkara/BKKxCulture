"use client";

import Link from "next/link";
import { useLocale } from "./i18n/LocaleContext";
import { LangToggle } from "./i18n/LangToggle";

// The shared masthead of the heritage register pages (home, areas, walks).
// The Minecraft-facing pages (/worlds, /atlas) keep their own dark chrome.
export function PlaceMasthead() {
  const { t } = useLocale();
  return (
    <header className="register-masthead">
      <Link className="register-wordmark" href="/" aria-label="BKKxC(ulture) home">
        <span>BKK</span>
        <b>x</b>
        <em>C(ulture)</em>
      </Link>
      <nav className="register-nav" aria-label="Primary navigation">
        <Link href="/heritage#quarters">{t("nav_quarters")}</Link>
        <Link href="/heritage#walks">{t("nav_walks")}</Link>
        <Link href="/heritage#register">{t("nav_register")}</Link>
        <Link href="/about">{t("nav_about")}</Link>
        <a href="https://github.com/Nonarkara/BKKxCulture" target="_blank" rel="noreferrer">
          {t("nav_github")}
        </a>
        <LangToggle />
      </nav>
    </header>
  );
}
