import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  // Available languages
  const languages = [
    { code: 'en', name: t('languageSwitcher.en') },
    { code: 'es', name: t('languageSwitcher.es') },
    { code: 'fr', name: t('languageSwitcher.fr') }
  ];

  // Change language handler
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex flex-col space-y-1">
      {languages.map((language) => (
        <button
          key={language.code}
          className="flex items-center justify-between w-full rounded-md px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
          onClick={() => changeLanguage(language.code)}
        >
          <span>{language.name}</span>
          {i18n.language === language.code && (
            <Check className="h-4 w-4" />
          )}
        </button>
      ))}
    </div>
  );
}