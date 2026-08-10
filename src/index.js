// index.js (Entry Point deiner Library)

// --- 0. Theme ---
export {
  createAppTheme,
  assertThemeComplete,
  calculateContrastRatio,
  reportThemeAdoption,
  THEME_COMPLETENESS_SURFACES,
} from './theme';

// --- 1. Auth Context (Essentiell für den Wrapper) ---
export { AuthContext, AuthProvider } from './auth/AuthContext';
export { UserMenu } from './auth/UserMenu';

export {
  default as apiClient,
  ensureCsrfToken,
  addPublicPath,
  removePublicPath,
} from "./auth/apiClient";

// --- 2. API & Services (Neue Struktur) ---
// Statt dem 'authApi'-Objekt exportieren wir die Funktionen direkt.
// Konsumenten können dann machen: import { loginWithPassword } from 'django-core-micha';
export * from './auth/authApi';       // Reine HTTP-Funktionen
export * from './utils/authService';  // Service-Funktionen (Passkeys, Social)

// --- 3. Layouts ---
export { NarrowPage, WidePage } from './layout/PageLayout';

// --- 4. Pages (Vollständige Seiten für Routing) ---
export { LoginPage } from './pages/LoginPage';
export { PasswordResetRequestPage } from './pages/PasswordResetRequestPage';
export { PasswordChangePage } from './pages/PasswordChangePage';
export { PasswordInvitePage } from './pages/PasswordInvitePage';
export { SignUpPage } from './pages/SignUpPage';
export { SignupConfirmPage } from './pages/SignupConfirmPage';
export { AccountPage } from './pages/AccountPage';

// --- 5. Components (Wiederverwendbare UI-Teile) ---
export { ProfileComponent } from './components/ProfileComponent';
export { AccessCodeManager } from './components/AccessCodeManager';
export { UserListComponent } from './components/UserListComponent';
export { UserInviteComponent } from './components/UserInviteComponent';
export { BulkInviteCsvTab } from './components/BulkInviteCsvTab';
export { RegistrationMethodsManager } from './components/RegistrationMethodsManager';
export { AuthFactorRequirementCard } from './components/AuthFactorRequirementCard';
export { AccessCodeSingleUseToggle } from './components/AccessCodeSingleUseToggle';
export { QrSignupManager } from './components/QrSignupManager';

// --- 6. Charts ---
export { ChartFrame } from './components/charts/ChartFrame';
export { BarChart } from './components/charts/BarChart';
export { LineChart } from './components/charts/LineChart';
export { TimeSeriesChart } from './components/charts/TimeSeriesChart';
export { getNeutralChartPalette, useNeutralChartPalette } from './components/charts/palette';
export {
  formatShortTime,
  formatShortDate,
  formatShortMonth,
  formatShortYear,
} from './components/charts/chartLabels';
export { yearTickInterval } from './components/charts/yearTickInterval';
export {
  formatPercentage,
  formatCompact,
  formatRatio,
  createChartFormatters,
  useChartFormatters,
} from './components/charts/formatters';

// --- 7. Translations ---
export { authTranslations } from './i18n/authTranslations';
export { userMenuTranslations } from './i18n/userMenuTranslations';

// --- 8. Notifications ---
export { NotificationSettings } from './notifications/NotificationSettings';
export * from './notifications/api';
export { NotificationsProvider, useNotifications } from './notifications/NotificationsProvider';
export { useRealtime } from './notifications/realtime';
export { NotificationBell } from './notifications/NotificationBell';
export { PopupSurface } from './notifications/PopupSurface';
export { getNotificationFeed, getUnreadCount, markNotifications } from './notifications/feedApi';

// --- 9. Messaging ---
export * from './messaging/api';
export { MessagingProvider, useMessaging } from './messaging/MessagingProvider';
export { ConversationList } from './messaging/ConversationList';
export { ConversationLaunchers } from './messaging/ConversationLaunchers';
export { DirectMessageLauncher } from './messaging/DirectMessageLauncher';
export { Thread } from './messaging/Thread';
export { MessageBubble } from './messaging/MessageBubble';
export { ReadTicks } from './messaging/ReadTicks';
export { Composer } from './messaging/Composer';
export { AttachmentList } from './messaging/AttachmentList';
export { ReactionBar } from './messaging/ReactionBar';
export { PollCard } from './messaging/PollCard';
export { MessagingScopeConfig } from './messaging/MessagingScopeConfig';

// --- 9. Onboarding ---
export * from './onboarding/api';
export { selectActiveSteps } from './onboarding/stepSelection';
export {
  OnboardingContext,
  OnboardingProvider,
  UNIVERSAL_STEP_DESCRIPTORS,
  useOnboarding,
} from './onboarding/OnboardingProvider';
export { OnboardingWizard } from './onboarding/OnboardingWizard';
export { CookieConsentStep } from './onboarding/steps/CookieConsentStep';
export { CompleteNameStep } from './onboarding/steps/CompleteNameStep';
export { BrowserPushStep } from './onboarding/steps/BrowserPushStep';
export { PwaInstallStep } from './onboarding/steps/PwaInstallStep';

// --- 10. Translations ---
export { notificationsTranslations } from './i18n/notificationsTranslations';
export { onboardingTranslations } from './i18n/onboardingTranslations';
export { chartsTranslations } from './i18n/chartsTranslations';
export { messagingTranslations } from './i18n/messagingTranslations';
