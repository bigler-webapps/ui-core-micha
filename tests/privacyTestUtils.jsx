import React from 'react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';

import { privacyTranslations } from '../src/i18n/privacyTranslations';

export function makePrivacyManifest(overrides = {}) {
  const required = {
    id: 'security', revision: 'r1', required: true,
    label: { de: 'Sicherheit', en: 'Security', fr: 'Sécurité' },
    summary: { de: 'Für die Sicherheit.', en: 'For security.', fr: 'Pour la sécurité.' },
    justification: { de: 'Für Anmeldung und Sicherheit.', en: 'For sign-in and security.', fr: 'Pour la connexion et la sécurité.' },
    services: [{
      id: 'session', provider: 'Example operator', trigger: 'requested_function',
      data_categories: ['session'], recipients: [], transfers: [],
      browser_storage: [{ kind: 'cookie', name: 'sessionid', scope: 'host-only', lifetime: 'session' }],
      server_retention: 'session lifetime',
    }],
    withdrawal_clears: [],
  };
  const display = {
    id: 'display', revision: 'r1', required: false,
    label: { de: 'Darstellung merken', en: 'Remember display', fr: 'Mémoriser l’affichage' },
    summary: { de: 'Speichert die Darstellung.', en: 'Remembers display settings.', fr: 'Mémorise les réglages d’affichage.' },
    services: [{
      id: 'display-service', provider: 'Example operator', trigger: 'user_choice',
      data_categories: ['display choice'], recipients: [], transfers: [],
      browser_storage: [{ kind: 'localStorage', name: 'display-mode', scope: 'this browser', lifetime: 'until withdrawal' }],
      server_retention: null,
    }],
    withdrawal_clears: ['display-mode'],
  };
  const visits = {
    id: 'visits', revision: 'r1', required: false,
    label: { de: 'Besuche messen', en: 'Measure visits', fr: 'Mesurer les visites' },
    summary: { de: 'Zählt Besuche.', en: 'Counts visits.', fr: 'Compte les visites.' },
    services: [{
      id: 'visit-service', provider: 'Example operator', trigger: 'page_view',
      data_categories: ['visit'], recipients: [], transfers: [],
      browser_storage: [{ kind: 'cookie', name: 'visit-id', scope: 'site', lifetime: '180 days' }],
      server_retention: '90 days',
    }],
    withdrawal_clears: ['visit-id'],
  };
  return {
    app: 'privacy-test',
    site: 'privacy-test',
    locales: ['de', 'en', 'fr'],
    controller: { name: 'Example operator', contact: 'privacy@example.test' },
    notice: {
      version: 'notice-v1',
      documents: { privacy: { de: '/privacy/de/', en: '/privacy/en/', fr: 'https://example.test/fr/privacy' } },
    },
    choice_validity_days: 180,
    purposes: [required, display, visits],
    necessary_storage: [{ kind: 'cookie', name: 'sessionid', scope: 'host-only', lifetime: 'session' }],
    config_version: 'config-v1',
    ...overrides,
  };
}

export function makeChoices(manifest, values = {}, { seq = 1, receiptState } = {}) {
  const choices = {};
  (manifest.purposes || []).filter((purpose) => !purpose.required).forEach((purpose) => {
    const state = values[purpose.id] || 'unset';
    choices[purpose.id] = {
      state,
      revision: purpose.revision,
      expires_at: state === 'unset' ? null : new Date(Date.now() + 86400000).toISOString(),
    };
  });
  const hasDecision = Object.values(choices).some((choice) => choice.state !== 'unset');
  return {
    receipt_state: receiptState || (hasDecision ? 'present' : 'unset'),
    seq,
    config_version: manifest.config_version,
    notice_version: manifest.notice.version,
    choices,
  };
}

export async function makeTestI18n(language = 'en') {
  const i18n = createInstance();
  const resources = {};
  ['de', 'en', 'fr', 'sw'].forEach((locale) => {
    resources[locale] = {
      translation: Object.fromEntries(Object.entries(privacyTranslations).map(([key, value]) => [key, value[locale]])),
    };
  });
  await i18n.init({ lng: language, fallbackLng: language, resources, keySeparator: false, interpolation: { escapeValue: false } });
  return i18n;
}

export function TranslationRoot({ i18n, children }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
