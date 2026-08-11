import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

vi.mock('@mui/icons-material', () => ({
  Archive: () => null,
  Campaign: () => null,
  Groups: () => null,
  MoreVert: () => null,
  NotificationsOff: () => null,
  Person: () => null,
}));

import {
  authTranslations as publicAuthTranslations,
  chartsTranslations as publicChartsTranslations,
  messagingTranslations as publicMessagingTranslations,
  notificationsTranslations as publicNotificationsTranslations,
  onboardingTranslations as publicOnboardingTranslations,
  sectionNavTranslations as publicSectionNavTranslations,
  uiCoreTranslations,
  userMenuTranslations as publicUserMenuTranslations,
} from '../src/index';

const I18N_DIRECTORY = path.resolve('src/i18n');
// Scoped to the three locales every bundle already carries. `messagingTranslations`'s 116 keys
// have no `sw` value yet (pre-existing gap, out of I18N-1's scope — see the Notiz on the
// I18N-1 register row for the tracked follow-up to backfill it and restore `sw` here).
const REQUIRED_LOCALES = ['de', 'en', 'fr'];
const bundleImporters = import.meta.glob('../src/i18n/*.ts');
const PUBLIC_BUNDLES = {
  authTranslations: publicAuthTranslations,
  chartsTranslations: publicChartsTranslations,
  messagingTranslations: publicMessagingTranslations,
  notificationsTranslations: publicNotificationsTranslations,
  onboardingTranslations: publicOnboardingTranslations,
  sectionNavTranslations: publicSectionNavTranslations,
  userMenuTranslations: publicUserMenuTranslations,
};

function bundleFileNames() {
  return fs.readdirSync(I18N_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => entry.name)
    .sort();
}

async function loadBundles() {
  return Promise.all(bundleFileNames().map(async (fileName) => {
    const modulePath = `../src/i18n/${fileName}`;
    const importBundle = bundleImporters[modulePath];
    if (!importBundle) {
      throw new Error(`${fileName} was enumerated from src/i18n but has no module importer`);
    }

    const bundleModule = await importBundle();
    const translationExports = Object.entries(bundleModule)
      .filter(([exportName]) => exportName.endsWith('Translations'));

    if (Object.keys(bundleModule).length !== 1 || translationExports.length !== 1) {
      throw new Error(`${fileName} must export exactly one *Translations bundle`);
    }

    const [[exportName, translations]] = translationExports;
    return { exportName, fileName, translations };
  }));
}

describe('uiCoreTranslations', () => {
  it('contains every directory-enumerated bundle key with its original value', async () => {
    const bundles = await loadBundles();
    const sourceKeys = [];

    for (const { fileName, translations } of bundles) {
      for (const [key, value] of Object.entries(translations)) {
        sourceKeys.push(key);
        expect(
          Object.hasOwn(uiCoreTranslations, key),
          `${key} from ${fileName} is missing from the public aggregate`,
        ).toBe(true);
        expect(uiCoreTranslations[key]).toEqual(value);
      }
    }

    expect(Object.keys(uiCoreTranslations).sort()).toEqual(sourceKeys.sort());
  });

  it('does not allow duplicate keys across source bundles', async () => {
    const owners = new Map();
    const collisions = [];

    for (const { fileName, translations } of await loadBundles()) {
      for (const key of Object.keys(translations)) {
        if (owners.has(key)) {
          collisions.push(`${key}: ${owners.get(key)} and ${fileName}`);
        } else {
          owners.set(key, fileName);
        }
      }
    }

    expect(collisions, `Translation key collisions:\n${collisions.join('\n')}`).toEqual([]);
  });

  it('preserves at least the required locale shape for every aggregate value', () => {
    for (const [key, value] of Object.entries(uiCoreTranslations)) {
      for (const locale of REQUIRED_LOCALES) {
        expect(typeof value[locale], `${key}.${locale} must be a string`).toBe('string');
        expect(value[locale].trim(), `${key}.${locale} must not be empty`).not.toBe('');
      }
    }
  });

  it('keeps every per-feature bundle available unchanged from the package root', async () => {
    for (const { exportName, translations } of await loadBundles()) {
      expect(PUBLIC_BUNDLES[exportName], `${exportName} must remain a public export`)
        .toBe(translations);
    }
  });
});
