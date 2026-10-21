import React from 'react';

// The login controller lives in LoginFlow so LoginPage and the embeddable
// LoginContent share one implementation (UCM-AUTH-14).
import { LoginFlow, LOGIN_PAGE_ALERT_SX } from '../components/LoginContent';

export { LOGIN_PAGE_ALERT_SX };

export function LoginPage() {
  return <LoginFlow pageMode />;
}
