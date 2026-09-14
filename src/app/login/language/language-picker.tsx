"use client";

import { useState } from "react";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

const COPY: Record<
  Lang,
  { heading: string; subtitle: string; continueEnglish: string; continueSpanish: string }
> = {
  en: {
    heading: "Choose your language",
    subtitle: "This sets the language for the app's menus and controls.",
    continueEnglish: "Continue in English",
    continueSpanish: "Continue in Spanish",
  },
  es: {
    heading: "Elige tu idioma",
    subtitle: "Esto define el idioma de los menús y controles de la app.",
    continueEnglish: "Continuar en inglés",
    continueSpanish: "Continuar en español",
  },
};

// Redirect delay after picking, so the text above visibly switches to
// the chosen language before the manager is sent on to the dashboard.
const REDIRECT_DELAY_MS = 700;

function persistLanguage(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
}

/**
 * Both the language toggle and the screen's own heading/subtitle —
 * kept together so clicking a language immediately re-renders this
 * screen's text in that language (not just the pages after it), then
 * carries the manager on to the dashboard.
 */
export function LanguagePicker() {
  const [lang, setLang] = useState<Lang>("en");
  const [pending, setPending] = useState<Lang | null>(null);

  const copy = COPY[lang];

  function choose(next: Lang) {
    setLang(next);
    setPending(next);
    persistLanguage(next);
    window.setTimeout(() => {
      window.location.assign("/dashboard");
    }, REDIRECT_DELAY_MS);
  }

  return (
    <div>
      <h1 className="animate-fade-up font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {copy.heading}
      </h1>
      <p className="animate-fade-up-delay-1 mt-3 text-base leading-relaxed text-slate/75">
        {copy.subtitle}
      </p>

      <div className="animate-fade-up-delay-2 mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => choose("en")}
          disabled={pending !== null}
          aria-pressed={lang === "en"}
          className="flex-1 border border-line bg-white px-5 py-6 text-left transition-colors hover:border-accent/50 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="font-display block text-lg font-semibold text-ink">
            English
          </span>
          <span className="mt-1 block text-sm text-slate/65">
            {pending === "en" ? "…" : copy.continueEnglish}
          </span>
        </button>
        <button
          type="button"
          onClick={() => choose("es")}
          disabled={pending !== null}
          aria-pressed={lang === "es"}
          className="flex-1 border border-line bg-white px-5 py-6 text-left transition-colors hover:border-accent/50 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="font-display block text-lg font-semibold text-ink">
            Spanish
          </span>
          <span className="mt-1 block text-sm text-slate/65">
            {pending === "es" ? "…" : copy.continueSpanish}
          </span>
        </button>
      </div>
    </div>
  );
}
