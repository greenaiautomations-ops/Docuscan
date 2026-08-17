import { useTranslation } from 'react-i18next'
import { setLanguage, SUPPORTED_LANGUAGES, type Language } from '../../i18n'

const LABELS: Record<Language, string> = { en: 'EN', de: 'DE' }
const BUTTON_WIDTH = 30
const GAP = 2

/** Compact EN/DE segmented control, styled to match ThemeToggle. */
export function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const current = (SUPPORTED_LANGUAGES.includes(i18n.language as Language) ? i18n.language : 'en') as Language
  const activeIndex = SUPPORTED_LANGUAGES.indexOf(current)

  return (
    <div
      role="radiogroup"
      aria-label={t('language.label')}
      className="relative inline-flex items-center gap-0.5 rounded-full border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 p-1"
    >
      <span
        aria-hidden="true"
        className="absolute rounded-full bg-white dark:bg-slate-950 shadow-sm transition-transform duration-200 ease-out"
        style={{
          width: BUTTON_WIDTH,
          height: 26,
          top: 4,
          left: 4,
          transform: `translateX(${activeIndex * (BUTTON_WIDTH + GAP)}px)`,
        }}
      />
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = lang === current
        return (
          <button
            key={lang}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setLanguage(lang)}
            title={t(`language.${lang}`)}
            aria-label={t(`language.${lang}`)}
            className={`relative z-10 flex items-center justify-center rounded-full text-[11px] font-semibold tracking-wide transition-colors ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
            style={{ width: BUTTON_WIDTH, height: 26 }}
          >
            {LABELS[lang]}
          </button>
        )
      })}
    </div>
  )
}
