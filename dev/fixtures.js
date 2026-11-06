export const notificationFixtures = [
  {
    id: 101,
    notification_id: 501,
    notification_type: 'case.updated',
    content: { title_key: 'harness.caseUpdated', body_key: 'harness.caseUpdatedBody' },
    created_at: '2026-07-31T09:00:00Z',
    seen_at: null,
  },
  {
    id: 102,
    notification_id: 502,
    notification_type: 'case.assigned',
    content: { title_key: 'harness.caseAssigned', body_key: 'harness.caseAssignedBody' },
    created_at: '2026-07-30T12:00:00Z',
    seen_at: '2026-07-30T12:05:00Z',
  },
];

export const privacyManifestFixture = {
  app: 'privacy-playground',
  site: 'privacy-playground',
  locales: ['de', 'en', 'fr', 'sw'],
  controller: { name: 'Playground operator', contact: 'privacy@example.test' },
  notice: {
    version: 'playground-v1',
    documents: { privacy: { de: '/privacy/de/', en: '/privacy/en/', fr: '/privacy/fr/', sw: '/privacy/sw/' } },
  },
  choice_validity_days: 180,
  config_version: 'playground-config-v1',
  purposes: [
    {
      id: 'display', revision: '1', required: false,
      label: { de: 'Darstellung merken', en: 'Remember display settings', fr: 'Mémoriser l’affichage', sw: 'Kumbuka mipangilio ya mwonekano' },
      summary: { de: 'Speichert Ihre gewählte Darstellung auf diesem Gerät.', en: 'Remembers your display settings on this device.', fr: 'Mémorise vos réglages d’affichage sur cet appareil.', sw: 'Hukumbuka mipangilio ya mwonekano kwenye kifaa hiki.' },
      services: [{
        id: 'display-settings', provider: 'Playground operator', trigger: 'user_choice',
        data_categories: ['display preference'], recipients: [], transfers: [],
        browser_storage: [{ kind: 'localStorage', name: 'display-mode', scope: 'this browser', lifetime: 'until withdrawal' }],
        server_retention: null,
      }],
      withdrawal_clears: ['display-mode'],
    },
    {
      id: 'visits', revision: '1', required: false,
      label: { de: 'Besuche messen', en: 'Measure visits', fr: 'Mesurer les visites', sw: 'Pima matembezi' },
      summary: { de: 'Zählt Besuche für die Playground-Demo.', en: 'Counts visits for the playground demo.', fr: 'Compte les visites pour la démonstration.', sw: 'Huhesabu matembezi ya onyesho.' },
      services: [{
        id: 'visit-counter', provider: 'Playground operator', trigger: 'page_view',
        data_categories: ['visit count'], recipients: [], transfers: [],
        browser_storage: [{ kind: 'cookie', name: 'playground-visitor', scope: 'site', lifetime: '180 days' }],
        server_retention: '30 days',
      }],
      withdrawal_clears: ['playground-visitor'],
    },
    {
      id: 'necessary', revision: '1', required: true,
      label: { de: 'Notwendige Funktionen', en: 'Necessary functions', fr: 'Fonctions nécessaires', sw: 'Vitendaji muhimu' },
      summary: { de: 'Für Sicherheit und ausdrücklich angeforderte Funktionen.', en: 'For security and explicitly requested functions.', fr: 'Pour la sécurité et les fonctions demandées.', sw: 'Kwa usalama na vitendaji vilivyoombwa.' },
      justification: { de: 'Für Anmeldung, Sicherheit und ausdrücklich angeforderte Funktionen.', en: 'For sign-in, security and functions you explicitly request.', fr: 'Pour la connexion, la sécurité et les fonctions expressément demandées.', sw: 'Kwa kuingia, usalama na vitendaji unavyoomba waziwazi.' },
      services: [{
        id: 'session', provider: 'Playground operator', trigger: 'requested_function',
        data_categories: ['session'], recipients: [], transfers: [],
        browser_storage: [{ kind: 'cookie', name: 'sessionid', scope: 'host-only', lifetime: 'session' }],
        server_retention: 'session lifetime',
      }],
      withdrawal_clears: [],
    },
  ],
  necessary_storage: [{ kind: 'cookie', name: 'sessionid', scope: 'host-only', lifetime: 'session' }],
};

export const barChartFixture = {
  series: [
    { data: [24, 36, 28, 52], label: 'Opened' },
    { data: [18, 29, 31, 44], label: 'Resolved' },
  ],
  xAxis: [{ data: ['Apr', 'May', 'Jun', 'Jul'] }],
};
