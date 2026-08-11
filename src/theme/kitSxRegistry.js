import {
  ACCESS_CODE_ACTION_SX,
  ACCESS_CODE_ALERT_SX,
  ACCESS_CODE_PRIMARY_ACTION_SX,
  ACCESS_CODE_VALUE_FIELD_SX,
} from '../components/AccessCodeManager';
import { ACCESS_CODE_SINGLE_USE_ALERT_SX } from '../components/AccessCodeSingleUseToggle';
import {
  ALLOWED_EMAIL_DOMAINS_ALERT_SX,
  ALLOWED_EMAIL_DOMAINS_BUTTON_SX,
} from '../components/AllowedEmailDomainsManager';
import { AUTH_FACTOR_REQUIREMENT_ALERT_SX } from '../components/AuthFactorRequirementCard';
import { BULK_INVITE_ACTION_SX, BULK_INVITE_ALERT_SX } from '../components/BulkInviteCsvTab';
import { LOGIN_FORM_DIVIDER_SX } from '../components/LoginForm';
import {
  MFA_ACTIVE_CARD_SX,
  MFA_ALERT_SX,
  MFA_CARD_SX,
  MFA_DIVIDER_SX,
  MFA_RECOVERY_BUTTON_SX,
  MFA_TEXT_FIELD_SX,
} from '../components/MFAComponent';
import {
  MFA_LOGIN_ALERT_SX,
  MFA_LOGIN_DIVIDER_SX,
  MFA_LOGIN_TEXT_FIELD_SX,
} from '../components/MfaLoginComponent';
import {
  MOBILE_BOTTOM_NAV_ACTION_SX,
  MOBILE_BOTTOM_NAV_ROOT_SX,
} from '../components/MobileBottomNav';
import { PASSKEYS_ALERT_SX, PASSKEYS_DIVIDER_SX } from '../components/PasskeysComponent';
import { QR_SIGNUP_MANAGER_ALERT_SX } from '../components/QrSignupManager';
import {
  QR_SIGNUP_VALIDITY_ALERT_SX,
  QR_SIGNUP_VALIDITY_BUTTON_SX,
  QR_SIGNUP_VALIDITY_FIELD_SX,
} from '../components/QrSignupValidityManager';
import {
  REGISTRATION_METHODS_ALERT_SX,
  REGISTRATION_METHODS_INFO_SX,
} from '../components/RegistrationMethodsManager';
import { SECURITY_ALERT_SX, SECURITY_DIVIDER_SX } from '../components/SecurityComponent';
import {
  SUPPORT_RECOVERY_AGENT_BUTTON_SX,
  SUPPORT_RECOVERY_AGENT_PAPER_SX,
  SUPPORT_RECOVERY_ALERT_SX,
} from '../components/SupportRecoveryRequestsTab';
import { USER_INVITE_ACTION_SX, USER_INVITE_ALERT_SX } from '../components/UserInviteComponent';
import {
  USER_LIST_ACTION_SX,
  USER_LIST_ALERT_SX,
  USER_LIST_BODY_CELL_SX,
  USER_LIST_EMPTY_CELL_SX,
  USER_LIST_HEADER_CELL_SX,
} from '../components/UserListComponent';
import { CHART_FRAME_ALERT_SX, CHART_FRAME_ROOT_SX } from '../components/charts/ChartFrame';
import { PAGE_LAYOUT_CONTAINER_SX } from '../layout/PageLayout';
import {
  ATTACHMENT_LIST_ALERT_SX,
  ATTACHMENT_LIST_LIGHTBOX_ACTION_SX,
} from '../messaging/AttachmentList';
import { COMPOSER_EMOJI_BUTTON_SX } from '../messaging/Composer';
import { DIRECT_MESSAGE_LAUNCHER_ALERT_SX } from '../messaging/DirectMessageLauncher';
import { MESSAGE_BUBBLE_ACTION_SX, MESSAGE_BUBBLE_ROOT_SX } from '../messaging/MessageBubble';
import {
  POLL_CARD_CHECKBOX_SX,
  POLL_CARD_FORM_CONTROL_SX,
  POLL_CARD_ROOT_SX,
} from '../messaging/PollCard';
import { THREAD_DAY_SEPARATOR_SX } from '../messaging/Thread';
import {
  NOTIFICATION_SETTINGS_ALERT_SX,
  NOTIFICATION_SETTINGS_CATEGORY_CONTROL_SX,
  NOTIFICATION_SETTINGS_FORM_CONTROL_SX,
  NOTIFICATION_SETTINGS_HINT_ALERT_SX,
  NOTIFICATION_SETTINGS_PUSH_CONTROL_SX,
  NOTIFICATION_SETTINGS_REACH_ALERT_SX,
} from '../notifications/NotificationSettings';
import { POPUP_SURFACE_DISMISS_BUTTON_SX } from '../notifications/PopupSurface';
import { BROWSER_PUSH_FORM_CONTROL_LABEL_SX } from '../onboarding/steps/BrowserPushStep';
import { ACCOUNT_PAGE_SECTION_PAPER_SX } from '../pages/AccountPage';
import { LOGIN_PAGE_ALERT_SX } from '../pages/LoginPage';
import { SIGN_UP_PAGE_ALERT_SX } from '../pages/SignUpPage';
import { SIGNUP_CONFIRM_PAGE_ALERT_SX } from '../pages/SignupConfirmPage';
import { REAUTH_MODAL_ALERT_SX, REAUTH_MODAL_TEXT_FIELD_SX } from '../auth/ReauthModal';

const SX_EXPORTS = {
  ACCESS_CODE_ACTION_SX,
  ACCESS_CODE_ALERT_SX,
  ACCESS_CODE_PRIMARY_ACTION_SX,
  ACCESS_CODE_SINGLE_USE_ALERT_SX,
  ACCESS_CODE_VALUE_FIELD_SX,
  ACCOUNT_PAGE_SECTION_PAPER_SX,
  ALLOWED_EMAIL_DOMAINS_ALERT_SX,
  ALLOWED_EMAIL_DOMAINS_BUTTON_SX,
  ATTACHMENT_LIST_ALERT_SX,
  ATTACHMENT_LIST_LIGHTBOX_ACTION_SX,
  AUTH_FACTOR_REQUIREMENT_ALERT_SX,
  BROWSER_PUSH_FORM_CONTROL_LABEL_SX,
  BULK_INVITE_ACTION_SX,
  BULK_INVITE_ALERT_SX,
  CHART_FRAME_ALERT_SX,
  CHART_FRAME_ROOT_SX,
  COMPOSER_EMOJI_BUTTON_SX,
  DIRECT_MESSAGE_LAUNCHER_ALERT_SX,
  LOGIN_FORM_DIVIDER_SX,
  LOGIN_PAGE_ALERT_SX,
  MESSAGE_BUBBLE_ACTION_SX,
  MESSAGE_BUBBLE_ROOT_SX,
  MFA_ACTIVE_CARD_SX,
  MFA_ALERT_SX,
  MFA_CARD_SX,
  MFA_DIVIDER_SX,
  MFA_LOGIN_ALERT_SX,
  MFA_LOGIN_DIVIDER_SX,
  MFA_LOGIN_TEXT_FIELD_SX,
  MFA_RECOVERY_BUTTON_SX,
  MFA_TEXT_FIELD_SX,
  MOBILE_BOTTOM_NAV_ACTION_SX,
  MOBILE_BOTTOM_NAV_ROOT_SX,
  NOTIFICATION_SETTINGS_ALERT_SX,
  NOTIFICATION_SETTINGS_CATEGORY_CONTROL_SX,
  NOTIFICATION_SETTINGS_FORM_CONTROL_SX,
  NOTIFICATION_SETTINGS_HINT_ALERT_SX,
  NOTIFICATION_SETTINGS_PUSH_CONTROL_SX,
  NOTIFICATION_SETTINGS_REACH_ALERT_SX,
  PAGE_LAYOUT_CONTAINER_SX,
  PASSKEYS_ALERT_SX,
  PASSKEYS_DIVIDER_SX,
  POLL_CARD_CHECKBOX_SX,
  POLL_CARD_FORM_CONTROL_SX,
  POLL_CARD_ROOT_SX,
  POPUP_SURFACE_DISMISS_BUTTON_SX,
  QR_SIGNUP_MANAGER_ALERT_SX,
  QR_SIGNUP_VALIDITY_ALERT_SX,
  QR_SIGNUP_VALIDITY_BUTTON_SX,
  QR_SIGNUP_VALIDITY_FIELD_SX,
  REAUTH_MODAL_ALERT_SX,
  REAUTH_MODAL_TEXT_FIELD_SX,
  REGISTRATION_METHODS_ALERT_SX,
  REGISTRATION_METHODS_INFO_SX,
  SECURITY_ALERT_SX,
  SECURITY_DIVIDER_SX,
  SIGNUP_CONFIRM_PAGE_ALERT_SX,
  SIGN_UP_PAGE_ALERT_SX,
  SUPPORT_RECOVERY_AGENT_BUTTON_SX,
  SUPPORT_RECOVERY_AGENT_PAPER_SX,
  SUPPORT_RECOVERY_ALERT_SX,
  THREAD_DAY_SEPARATOR_SX,
  USER_INVITE_ACTION_SX,
  USER_INVITE_ALERT_SX,
  USER_LIST_ACTION_SX,
  USER_LIST_ALERT_SX,
  USER_LIST_BODY_CELL_SX,
  USER_LIST_EMPTY_CELL_SX,
  USER_LIST_HEADER_CELL_SX,
};

const SX_EXPORT_NAMES = new Map(
  Object.entries(SX_EXPORTS).map(([name, sx]) => [sx, name]),
);

const entry = (component, muiComponent, sx) => ({
  component,
  muiComponent,
  sx,
  exportName: SX_EXPORT_NAMES.get(sx),
});

/**
 * Kit-owned, top-level sx objects paired with the baseline-styled MUI key they
 * target. Conditional and nested sx remain a documented lower bound in the
 * checks rather than being represented here as if they were fully inspected.
 */
export const KIT_COMPONENT_SX_REGISTRY = [
  entry('AccessCodeManager.action', 'MuiButton', ACCESS_CODE_ACTION_SX),
  entry('AccessCodeManager.primaryAction', 'MuiButton', ACCESS_CODE_PRIMARY_ACTION_SX),
  entry('AccessCodeManager.alert', 'MuiAlert', ACCESS_CODE_ALERT_SX),
  entry('AccessCodeManager.valueField', 'MuiTextField', ACCESS_CODE_VALUE_FIELD_SX),
  entry('AccessCodeSingleUseToggle.alert', 'MuiAlert', ACCESS_CODE_SINGLE_USE_ALERT_SX),
  entry('AllowedEmailDomainsManager.alert', 'MuiAlert', ALLOWED_EMAIL_DOMAINS_ALERT_SX),
  entry('AllowedEmailDomainsManager.action', 'MuiButton', ALLOWED_EMAIL_DOMAINS_BUTTON_SX),
  entry('AuthFactorRequirementCard.alert', 'MuiAlert', AUTH_FACTOR_REQUIREMENT_ALERT_SX),
  entry('BulkInviteCsvTab.action', 'MuiButton', BULK_INVITE_ACTION_SX),
  entry('BulkInviteCsvTab.alert', 'MuiAlert', BULK_INVITE_ALERT_SX),
  entry('LoginForm.divider', 'MuiDivider', LOGIN_FORM_DIVIDER_SX),
  entry('MFAComponent.alert', 'MuiAlert', MFA_ALERT_SX),
  entry('MFAComponent.card', 'MuiCard', MFA_CARD_SX),
  entry('MFAComponent.activeCard', 'MuiCard', MFA_ACTIVE_CARD_SX),
  entry('MFAComponent.field', 'MuiTextField', MFA_TEXT_FIELD_SX),
  entry('MFAComponent.divider', 'MuiDivider', MFA_DIVIDER_SX),
  entry('MFAComponent.recoveryAction', 'MuiButton', MFA_RECOVERY_BUTTON_SX),
  entry('MfaLoginComponent.alert', 'MuiAlert', MFA_LOGIN_ALERT_SX),
  entry('MfaLoginComponent.divider', 'MuiDivider', MFA_LOGIN_DIVIDER_SX),
  entry('MfaLoginComponent.field', 'MuiTextField', MFA_LOGIN_TEXT_FIELD_SX),
  entry('MobileBottomNav.root', 'MuiBottomNavigation', MOBILE_BOTTOM_NAV_ROOT_SX),
  entry('MobileBottomNav.action', 'MuiBottomNavigationAction', MOBILE_BOTTOM_NAV_ACTION_SX),
  entry('PasskeysComponent.alert', 'MuiAlert', PASSKEYS_ALERT_SX),
  entry('PasskeysComponent.divider', 'MuiDivider', PASSKEYS_DIVIDER_SX),
  entry('QrSignupManager.alert', 'MuiAlert', QR_SIGNUP_MANAGER_ALERT_SX),
  entry('QrSignupValidityManager.alert', 'MuiAlert', QR_SIGNUP_VALIDITY_ALERT_SX),
  entry('QrSignupValidityManager.field', 'MuiTextField', QR_SIGNUP_VALIDITY_FIELD_SX),
  entry('QrSignupValidityManager.action', 'MuiButton', QR_SIGNUP_VALIDITY_BUTTON_SX),
  entry('RegistrationMethodsManager.alert', 'MuiAlert', REGISTRATION_METHODS_ALERT_SX),
  entry('RegistrationMethodsManager.info', 'MuiAlert', REGISTRATION_METHODS_INFO_SX),
  entry('SecurityComponent.alert', 'MuiAlert', SECURITY_ALERT_SX),
  entry('SecurityComponent.divider', 'MuiDivider', SECURITY_DIVIDER_SX),
  entry('SupportRecoveryRequestsTab.agentPaper', 'MuiPaper', SUPPORT_RECOVERY_AGENT_PAPER_SX),
  entry('SupportRecoveryRequestsTab.alert', 'MuiAlert', SUPPORT_RECOVERY_ALERT_SX),
  entry('SupportRecoveryRequestsTab.agentAction', 'MuiButton', SUPPORT_RECOVERY_AGENT_BUTTON_SX),
  entry('UserInviteComponent.action', 'MuiButton', USER_INVITE_ACTION_SX),
  entry('UserInviteComponent.alert', 'MuiAlert', USER_INVITE_ALERT_SX),
  entry('UserListComponent.action', 'MuiButton', USER_LIST_ACTION_SX),
  entry('UserListComponent.alert', 'MuiAlert', USER_LIST_ALERT_SX),
  entry('UserListComponent.headerCell', 'MuiTableCell', USER_LIST_HEADER_CELL_SX),
  entry('UserListComponent.emptyCell', 'MuiTableCell', USER_LIST_EMPTY_CELL_SX),
  entry('UserListComponent.bodyCell', 'MuiTableCell', USER_LIST_BODY_CELL_SX),
  entry('ChartFrame.root', 'MuiPaper', CHART_FRAME_ROOT_SX),
  entry('ChartFrame.alert', 'MuiAlert', CHART_FRAME_ALERT_SX),
  entry('PageLayout.container', 'MuiContainer', PAGE_LAYOUT_CONTAINER_SX),
  entry('AttachmentList.lightboxAction', 'MuiIconButton', ATTACHMENT_LIST_LIGHTBOX_ACTION_SX),
  entry('AttachmentList.alert', 'MuiAlert', ATTACHMENT_LIST_ALERT_SX),
  entry('Composer.emojiAction', 'MuiIconButton', COMPOSER_EMOJI_BUTTON_SX),
  entry('DirectMessageLauncher.alert', 'MuiAlert', DIRECT_MESSAGE_LAUNCHER_ALERT_SX),
  entry('MessageBubble.root', 'MuiPaper', MESSAGE_BUBBLE_ROOT_SX),
  entry('MessageBubble.action', 'MuiIconButton', MESSAGE_BUBBLE_ACTION_SX),
  entry('PollCard.root', 'MuiPaper', POLL_CARD_ROOT_SX),
  entry('PollCard.formControl', 'MuiFormControlLabel', POLL_CARD_FORM_CONTROL_SX),
  entry('PollCard.checkbox', 'MuiCheckbox', POLL_CARD_CHECKBOX_SX),
  entry('Thread.daySeparator', 'MuiDivider', THREAD_DAY_SEPARATOR_SX),
  entry('NotificationSettings.alert', 'MuiAlert', NOTIFICATION_SETTINGS_ALERT_SX),
  entry('NotificationSettings.hintAlert', 'MuiAlert', NOTIFICATION_SETTINGS_HINT_ALERT_SX),
  entry('NotificationSettings.reachAlert', 'MuiAlert', NOTIFICATION_SETTINGS_REACH_ALERT_SX),
  entry('NotificationSettings.formControl', 'MuiFormControlLabel', NOTIFICATION_SETTINGS_FORM_CONTROL_SX),
  entry('NotificationSettings.pushControl', 'MuiFormControlLabel', NOTIFICATION_SETTINGS_PUSH_CONTROL_SX),
  entry('NotificationSettings.categoryControl', 'MuiFormControlLabel', NOTIFICATION_SETTINGS_CATEGORY_CONTROL_SX),
  entry('PopupSurface.dismissAction', 'MuiButton', POPUP_SURFACE_DISMISS_BUTTON_SX),
  entry('BrowserPushStep.formControl', 'MuiFormControlLabel', BROWSER_PUSH_FORM_CONTROL_LABEL_SX),
  entry('AccountPage.sectionPaper', 'MuiPaper', ACCOUNT_PAGE_SECTION_PAPER_SX),
  entry('LoginPage.alert', 'MuiAlert', LOGIN_PAGE_ALERT_SX),
  entry('SignUpPage.alert', 'MuiAlert', SIGN_UP_PAGE_ALERT_SX),
  entry('SignupConfirmPage.alert', 'MuiAlert', SIGNUP_CONFIRM_PAGE_ALERT_SX),
  entry('ReauthModal.alert', 'MuiAlert', REAUTH_MODAL_ALERT_SX),
  entry('ReauthModal.field', 'MuiTextField', REAUTH_MODAL_TEXT_FIELD_SX),
];
