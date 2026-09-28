"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";
import "./LanguageSwitcher.css";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="lang-switcher" role="group" aria-label="Idioma / Language">
      <button
        className={locale === "es" ? "lang-switcher-btn lang-switcher-btn--on" : "lang-switcher-btn"}
        onClick={() => setLocale("es")}
      >
        ES
      </button>
      <span className="lang-switcher-sep">/</span>
      <button
        className={locale === "en" ? "lang-switcher-btn lang-switcher-btn--on" : "lang-switcher-btn"}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
    </div>
  );
}
