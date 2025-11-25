import en from "./translations/en.json";
import tr from "./translations/tr.json";

export const translations = {
  en,
  tr,
} as const;

export type Locale = keyof typeof translations;

export function useTranslations(lang: Locale) {
  return function t(key: string): any {
    const keys = key.split(".");
    let value: any = translations[lang];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value !== undefined ? value : key;
  };
}

