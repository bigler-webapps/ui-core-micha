// index.js (Entry Point deiner Library)

// --- 1. Auth Context (Essentiell für den Wrapper) ---
export { AuthContext, AuthProvider } from './auth/AuthContext';

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
export { AccountPage } from './pages/AccountPage';

// --- 5. Components (Wiederverwendbare UI-Teile) ---
export { ProfileComponent } from './components/ProfileComponent';
export { AccessCodeManager } from './components/AccessCodeManager';
export { UserListComponent } from './components/UserListComponent';
export { UserInviteComponent } from './components/UserInviteComponent';
export { BulkInviteCsvTab } from './components/BulkInviteCsvTab';
export { RegistrationMethodsManager } from './components/RegistrationMethodsManager';
export { AuthFactorRequirementCard } from './components/AuthFactorRequirementCard';
export { EmailVerificationRequirementCard } from './components/EmailVerificationRequirementCard';
export { AccessCodeSingleUseToggle } from './components/AccessCodeSingleUseToggle';
export { QrSignupManager } from './components/QrSignupManager';

// --- 6. Translations ---
export { authTranslations } from './i18n/authTranslations';
