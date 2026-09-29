import { authTranslations } from './authTranslations';
import { chartsTranslations } from './chartsTranslations';
import { messagingTranslations } from './messagingTranslations';
import { notificationsTranslations } from './notificationsTranslations';
import { onboardingTranslations } from './onboardingTranslations';
import { sectionNavTranslations } from './sectionNavTranslations';
import { userMenuTranslations } from './userMenuTranslations';

export const uiCoreTranslations = {
  ...authTranslations,
  ...chartsTranslations,
  ...messagingTranslations,
  ...notificationsTranslations,
  ...onboardingTranslations,
  ...sectionNavTranslations,
  ...userMenuTranslations,
};

export function createUiCoreTranslations({ germanVariant = 'formal' } = {}) {
  return Object.fromEntries(
    Object.entries(uiCoreTranslations).map(([key, value]) => {
      const { de_informal, ...rest } = value;
      if (germanVariant === 'informal' && de_informal) return [key, { ...rest, de: de_informal }];
      return [key, rest];
    }),
  );
}
