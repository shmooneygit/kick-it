import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import uk from '@/locales/uk.json';
import en from '@/locales/en.json';

const i18n = new I18n({ uk, en });

const deviceLocale = getLocales()[0]?.languageCode ?? 'uk';
i18n.enableFallback = true;
i18n.defaultLocale = deviceLocale === 'uk' ? 'uk' : 'en';

export default i18n;

export const t = (scope: string, options?: Record<string, unknown>) =>
  i18n.t(scope, options);
