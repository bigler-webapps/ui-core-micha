import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';
import { 
  Tabs, 
  Tab, 
  Box, 
  Typography, 
  Alert, 
  CircularProgress,
  Paper,
  Stack,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

// Internal context
import { AuthContext } from '../auth/AuthContext';

// Falls die Komponenten noch lokal sind:
import { WidePage } from '../layout/PageLayout';
import { ProfileComponent } from '../components/ProfileComponent';
import { SecurityComponent } from '../components/SecurityComponent';
import { UserListComponent } from '../components/UserListComponent';
import { UserInviteComponent } from '../components/UserInviteComponent';
import { AccessCodeManager } from '../components/AccessCodeManager';
import { AllowedEmailDomainsManager } from '../components/AllowedEmailDomainsManager';
import { RegistrationMethodsManager } from '../components/RegistrationMethodsManager';
import { AuthFactorRequirementCard } from '../components/AuthFactorRequirementCard';
import { AccessCodeSingleUseToggle } from '../components/AccessCodeSingleUseToggle';
import { QrSignupManager } from '../components/QrSignupManager';
import { QrSignupValidityManager } from '../components/QrSignupValidityManager';
import { SupportRecoveryRequestsTab } from '../components/SupportRecoveryRequestsTab';
import { BulkInviteCsvTab } from '../components/BulkInviteCsvTab';
import { fetchAuthPolicy, updateUserProfile } from '../auth/authApi'; // Ggf. Pfad anpassen

export function AccountPage({
  userListExtraColumns = [],
  userListExtraRowActions = [],
  userListExtraContext = null,
  userListRefreshTrigger = 0,
  userListCanEditUser = null,
  userListShowNewColumn = true,
  userListShowSuccessfulLoginColumn = true,
  userListShowRoleColumn = true,
  userListOnChangeRole = null,
  userListShowDeleteAction = true,
  userListCanDeleteUser = null,
  userListOnDeleteUser = null,
  showBulkInviteCsvTab = false,
  bulkInviteCsvProps = {},
  extraTabs = [],
}) {
  const { t } = useTranslation();
  const { user, login, loading } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [authPolicy, setAuthPolicy] = useState(null);
  const [authPolicyError, setAuthPolicyError] = useState('');

  // 1. URL State Management
  const currentTabRaw = searchParams.get('tab') || 'profile';
  const currentTab = ['invite', 'bulk-invite-csv', 'access'].includes(currentTabRaw)
    ? 'invite'
    : currentTabRaw;
  const fromRecovery = searchParams.get('from') === 'recovery';
  const fromWeakLogin = searchParams.get('from') === 'weak_login';

  // 2. Data & Permissions
  const activeRoles = user?.available_roles || [];
  const perms = user?.ui_permissions || {};
  
  // NEU: Superuser-Flag prüfen
  const isSuperUser = user?.is_superuser || false;
  const canViewUsers = Boolean(isSuperUser || perms.can_view_users);
  const canViewInvite = Boolean(isSuperUser || perms.can_view_invite || perms.can_invite);
  const canViewAuthPolicy = Boolean(isSuperUser || perms.can_view_auth_policy);
  const canWriteAuthPolicy = Boolean(isSuperUser || perms.can_write_auth_policy);
  const canSendInvites = Boolean(isSuperUser || perms.can_send_invites);
  const canManageAccessCodes = Boolean(isSuperUser || perms.can_manage_access_codes);
  const canManageSignupQr = Boolean(isSuperUser || perms.can_manage_signup_qr);

  const handleTabChange = (_event, newValue) => {
    setSearchParams({ tab: newValue });
  };

  const handleProfileSubmit = async (payload) => {
    const updatedUser = await updateUserProfile(payload);
    login(updatedUser);
  };

  useEffect(() => {
    let active = true;
    const canLoadPolicy = Boolean(user) && (canViewAuthPolicy || canManageSignupQr || canManageAccessCodes);

    if (!canLoadPolicy) {
      setAuthPolicy(null);
      setAuthPolicyError('');
      return undefined;
    }

    const loadPolicy = async () => {
      try {
        const data = await fetchAuthPolicy();
        if (!active) return;
        setAuthPolicy(data);
        setAuthPolicyError('');
      } catch (err) {
        if (!active) return;
        setAuthPolicy(null);
        setAuthPolicyError(
          t(err?.code || 'Auth.AUTH_POLICY_FETCH_FAILED', 'Could not load authentication policy.'),
        );
      }
    };

    loadPolicy();

    return () => {
      active = false;
    };
  }, [user, canViewAuthPolicy, canManageSignupQr, canManageAccessCodes, t]);

  // 3. Dynamic Tabs (angepasst für Superuser)
  const tabs = useMemo(() => {
    if (!user) return [];

    const extensionContext = { user, perms, isSuperUser, t };
    const list = [
      { value: 'profile', label: t('Account.TAB_PROFILE', 'Profile') },
      { value: 'security', label: t('Account.TAB_SECURITY', 'Security') },
    ];

    // Logik: Superuser darf ALLES, sonst gelten die spezifischen Permissions
    
    if (canViewUsers) {
      list.push({ value: 'users', label: t('Account.TAB_USERS', 'Users') });
    }
    
    if (canViewInvite) {
      list.push({ value: 'invite', label: t('Account.TAB_INVITE', 'Invite') });
    }
    
    if (isSuperUser || perms.can_view_support) {
      list.push({ value: 'support', label: t('Account.TAB_SUPPORT', 'Support') });
    }

    extraTabs.forEach((tab) => {
      if (!tab?.value || !tab?.label) return;
      const isVisible = typeof tab.visible === 'function' ? tab.visible(extensionContext) : true;
      if (isVisible && !list.some((entry) => entry.value === tab.value)) {
        list.push({
          value: tab.value,
          label: typeof tab.label === 'function' ? tab.label(extensionContext) : tab.label,
        });
      }
    });

    return list;
  }, [user, perms, t, isSuperUser, extraTabs, canViewUsers, canViewInvite]);

  // 4. Loading & Auth Checks
  if (loading) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
            <CircularProgress />
        </Box>
    );
  }

  if (!user) {
      return (
          <WidePage>
              <Alert severity="warning">
                  {t('Auth.NOT_LOGGED_IN', 'User not logged in.')}
              </Alert>
          </WidePage>
      );
  }

  // 5. Security Check: Is the active tab allowed?
  const activeTabExists = tabs.some(t => t.value === currentTab);
  // Falls der Tab nicht erlaubt ist (z.B. manuell in URL eingegeben), Fallback auf 'profile'
  const safeTab = activeTabExists ? currentTab : 'profile';
  const builtInTabValues = new Set(['profile', 'security', 'users', 'invite', 'support']);
  const activeExtraTab = builtInTabValues.has(safeTab)
    ? null
    : extraTabs.find((tab) => tab.value === safeTab);

  return (
    <WidePage title={t('Account.TITLE', 'Account & Administration')}>
      <Helmet>
        <title>{t('Account.PAGE_TITLE', 'Account')} – {user.email}</title>
      </Helmet>

      <Tabs
        value={safeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.value} label={tab.label} value={tab.value} />
        ))}
      </Tabs>

      {/* --- TAB CONTENT --- */}

      {safeTab === 'profile' && (
        <Box sx={{ mt: 2 }}>
          <ProfileComponent
            onSubmit={handleProfileSubmit}
            showName
            showPrivacy
            showCookies
          />
        </Box>
      )}

      {safeTab === 'security' && (
        <Box sx={{ mt: 2 }}>
          <SecurityComponent
            fromRecovery={fromRecovery}
            fromWeakLogin={fromWeakLogin}
          />
        </Box>
      )}

      {safeTab === 'users' && (
        <Box sx={{ mt: 2 }}>
          <UserListComponent
            roles={activeRoles} 
            currentUser={user}
            extraColumns={userListExtraColumns}
            extraRowActions={userListExtraRowActions}
            extraContext={userListExtraContext}
            refreshTrigger={userListRefreshTrigger}
            canEditUser={userListCanEditUser}
            showNewColumn={userListShowNewColumn}
            showSuccessfulLoginColumn={userListShowSuccessfulLoginColumn}
            showRoleColumn={userListShowRoleColumn}
            onChangeRole={userListOnChangeRole}
            showDeleteAction={userListShowDeleteAction}
            canDeleteUser={userListCanDeleteUser}
            onDeleteUser={userListOnDeleteUser}
          />
        </Box>
      )}

      {safeTab === 'invite' && (
        <Box sx={{ mt: 2 }}>
          <Stack spacing={2.5}>
            {canViewAuthPolicy && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <AuthFactorRequirementCard canEdit={canWriteAuthPolicy} policy={authPolicy} />
              </Paper>
            )}

            {canViewAuthPolicy && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <RegistrationMethodsManager
                  policy={authPolicy}
                  error={authPolicyError}
                  onPolicyChange={setAuthPolicy}
                  canEdit={canWriteAuthPolicy}
                />
              </Paper>
            )}

            {canSendInvites && Boolean(authPolicy?.allow_admin_invite) && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <UserInviteComponent />
              </Paper>
            )}

            {canManageAccessCodes && Boolean(authPolicy?.allow_self_signup_access_code) && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {t('Auth.ACCESS_CODE_MANAGER_TITLE', 'Access Codes')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                  {t('Account.ACCESS_CODES_HINT', 'Manage access codes for self-registration.')}
                </Typography>
                <AccessCodeManager />
              </Paper>
            )}

            {canManageAccessCodes && Boolean(authPolicy?.allow_self_signup_access_code) && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <AccessCodeSingleUseToggle
                  canEdit={canWriteAuthPolicy}
                  policy={authPolicy}
                  onPolicyChange={setAuthPolicy}
                />
              </Paper>
            )}

            {canSendInvites && showBulkInviteCsvTab && Boolean(authPolicy?.allow_admin_invite) && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <BulkInviteCsvTab {...bulkInviteCsvProps} />
              </Paper>
            )}

            {canViewAuthPolicy && Boolean(authPolicy?.allow_self_signup_email_domain) && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <AllowedEmailDomainsManager
                  enabled={Boolean(authPolicy?.allow_self_signup_email_domain)}
                  domains={authPolicy?.allowed_email_domains || []}
                  onPolicyChange={setAuthPolicy}
                  canEdit={canWriteAuthPolicy}
                />
              </Paper>
            )}

            {canViewAuthPolicy && Boolean(authPolicy?.allow_self_signup_qr) && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <QrSignupValidityManager
                  enabled={Boolean(authPolicy?.allow_self_signup_qr)}
                  expiryDays={authPolicy?.signup_qr_expiry_days}
                  onPolicyChange={setAuthPolicy}
                  canEdit={canWriteAuthPolicy}
                />
              </Paper>
            )}

            {canManageSignupQr && Boolean(authPolicy?.allow_self_signup_qr) && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <QrSignupManager
                  enabled={Boolean(authPolicy?.allow_self_signup_qr)}
                  expiryDays={authPolicy?.signup_qr_expiry_days}
                />
              </Paper>
            )}
          </Stack>
        </Box>
      )}

      {safeTab === 'support' && (
        <Box sx={{ mt: 2 }}>
          <SupportRecoveryRequestsTab />
        </Box>
      )}

      {activeExtraTab && (
        <Box sx={{ mt: 2 }}>
          {activeExtraTab.render?.({ user, perms, isSuperUser, t })}
        </Box>
      )}
    </WidePage>
  );
}
