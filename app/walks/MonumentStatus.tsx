"use client";

import { useLocale } from "../i18n/LocaleContext";

// The "gazetted" / "awaiting consideration" status word, wherever it
// appears outside the register explorer (which has its own copy of this
// logic already wired to useLocale via HeritageExplorer.tsx).
export function MonumentStatus({ registered }: { registered: boolean }) {
  const { t } = useLocale();
  return <>{registered ? t("status_gazetted") : t("status_awaiting")}</>;
}
