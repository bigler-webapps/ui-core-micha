import { authTranslations } from './authTranslations';
import { billingTranslations } from './billingTranslations';
import { chartsTranslations } from './chartsTranslations';
import { chatTranslations } from './chatTranslations';
import { messagingTranslations } from './messagingTranslations';
import { notificationsTranslations } from './notificationsTranslations';
import { receiptsTranslations } from './receiptsTranslations';
import { onboardingTranslations } from './onboardingTranslations';
import { sectionNavTranslations } from './sectionNavTranslations';
import { userMenuTranslations } from './userMenuTranslations';

export const uiCoreTranslations = {
  ...authTranslations,
  ...billingTranslations,
  ...chartsTranslations,
  ...chatTranslations,
  ...messagingTranslations,
  ...notificationsTranslations,
  ...receiptsTranslations,
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
