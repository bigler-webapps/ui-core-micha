import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import i18next from 'i18next';

import apiClient from '../auth/apiClient';
import { LoginPage } from '../pages/LoginPage';
import { SignUpPage } from '../pages/SignUpPage';
import { PasswordInvitePage } from '../pages/PasswordInvitePage';
import { uiCoreTranslations } from '../i18n/uiCoreTranslations';

const KIT_LANGUAGES = ['de', 'en', 'fr', 'sw'];
const LOGIN_PATH = '/api/auth/browser/v1/auth/login';
const RAW_CODE = /^[a-z][a-z0-9_]*$/;

function pageName(Page) {
  return Page?.displayName || Page?.name || 'page';
}

function appLanguages(i18n) {
  const candidates = [
    i18n?.options?.supportedLngs,
    Object.keys(i18n?.options?.resources || {}),
    i18n?.languages,
  ];

  for (const candidate of candidates) {
    const languages = Array.isArray(candidate)
      ? candidate.filter((language) => language && language !== 'cimode')
      : [];
    if (languages.length > 0) return languages;
  }
  return [];
}

function textNodes(container) {
  const result = [];
  const document = container.ownerDocument;
  const filter = document.defaultView?.NodeFilter || NodeFilter;
  const walker = document.createTreeWalker(container, filter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim();
    if (text) result.push(text);
  }
  return result;
}

const KIT_KEYS = new Set(Object.keys(uiCoreTranslations));
// Every legitimate string the kit itself ships, across all locales -- a short,
// all-lowercase, no-space word can still be entirely legitimate rendered prose
// (e.g. `Auth.LOGIN_OR`'s German value is literally "oder", which the bare
// RAW_CODE shape below would otherwise flag as a raw backend code). Exempting
// anything that IS one of the kit's own translated values keeps the check
// looking for text that is NEITHER a key NOR a real translation -- which is
// exactly what a leaked backend code is, and a legitimate short word never is.
const KIT_VALUES = new Set(
  Object.values(uiCoreTranslations).flatMap((entry) => Object.values(entry)),
);

function scanPage(container, name) {
  return textNodes(container)
    .filter((text) => (
      KIT_KEYS.has(text)
      || (!KIT_VALUES.has(text) && text.length > 2 && RAW_CODE.test(text))
    ))
    .map((text) => ({
      check: 'render',
      reason: `${name} rendered raw kit key or backend code: ${text}`,
    }));
}

async function renderPage(Page, wrapper, initialEntries = ['/']) {
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(React.createElement(
        MemoryRouter,
        { initialEntries },
        React.createElement(wrapper, null, React.createElement(Page)),
      ));
      await Promise.resolve();
    });
    return { container, findings: scanPage(container, pageName(Page)) };
  } finally {
    await act(async () => {
      root.unmount();
    });
  }
}

function transportFailure(config) {
  return Promise.reject(new Error(`checkKitIntegration blocked request: ${config?.url || 'unknown'}`));
}

function loginFailure() {
  return Promise.reject({
    response: {
      status: 400,
      data: {
        errors: [{
          code: 'invalid',
          param: 'email',
          message: 'The email address is invalid.',
        }],
      },
    },
  });
}

async function renderFindings(Page, wrapper, initialEntries) {
  try {
    const rendered = await renderPage(Page, wrapper, initialEntries);
    return rendered.findings;
  } catch (error) {
    return [{
      check: 'render',
      reason: `${pageName(Page)} threw while rendering: ${error?.message || String(error)}`,
    }];
  }
}

async function errorTextFindings(i18n, wrapper) {
  const Page = LoginPage;
  const name = pageName(Page);
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(React.createElement(
        MemoryRouter,
        { initialEntries: ['/login'] },
        React.createElement(wrapper, null, React.createElement(Page)),
      ));
      await Promise.resolve();
    });

    const inputs = Array.from(container.querySelectorAll('input'));
    const email = inputs.find((input) => input.type === 'email');
    const password = inputs.find((input) => input.type === 'password');
    const form = container.querySelector('form');
    if (!email || !password || !form) {
      return [{ check: 'error-text', reason: `${name} did not render its login form.` }];
    }

    const setValue = (input, value) => {
      const setter = Object.getOwnPropertyDescriptor(
        input.ownerDocument.defaultView.HTMLInputElement.prototype,
        'value',
      ).set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    await act(async () => {
      setValue(email, 'not-an-email@example.com');
      setValue(password, 'password');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const expected = i18n.t('Auth.field.email.invalid');
    const renderedTexts = textNodes(container);
    if (renderedTexts.includes(expected)) return [];
    return [{
      check: 'error-text',
      reason: `${name} did not show ${expected} for the allauth invalid-email response.`,
    }];
  } catch (error) {
    return [{
      check: 'error-text',
      reason: `${name} error flow failed: ${error?.message || String(error)}`,
    }];
  } finally {
    await act(async () => {
      root.unmount();
    });
  }
}

/** Check that an app's i18n instance and providers wire the kit pages correctly. */
export async function checkKitIntegration({
  i18n,
  wrapper,
  pages = [LoginPage, SignUpPage, PasswordInvitePage],
}) {
  const findings = [];
  const languages = appLanguages(i18n);
  const sharedLanguages = KIT_LANGUAGES.filter((language) => languages.includes(language));

  for (const [key] of Object.entries(uiCoreTranslations)) {
    for (const language of sharedLanguages) {
      // fallbackLng: false forces a true per-language check -- without it, a
      // consumer's own fallbackLng config (e.g. "en") would let a key missing
      // in "fr" silently resolve through the fallback and read as present.
      if (!i18n?.exists(key, { lng: language, fallbackLng: false })) {
        findings.push({
          check: 'catalogue',
          reason: `Missing kit translation key ${key} for language ${language}.`,
        });
      }
    }
  }

  if (!i18next.isInitialized || i18n !== i18next) {
    findings.push({
      check: 'instance',
      reason: 'The app i18n is not the initialized kit default instance; Accept-Language will be missing or wrong.',
    });
  }

  const originalAdapter = apiClient.defaults.adapter;
  apiClient.defaults.adapter = async (config) => {
    if (config?.url === LOGIN_PATH || String(config?.url || '').endsWith(LOGIN_PATH)) {
      return loginFailure();
    }
    return transportFailure(config);
  };

  try {
    for (const Page of pages) {
      findings.push(...await renderFindings(Page, wrapper));
    }
    findings.push(...await errorTextFindings(i18n, wrapper));
  } finally {
    apiClient.defaults.adapter = originalAdapter;
  }

  return { findings };
}
