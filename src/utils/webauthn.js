// src/utils/webauthn.js
export function bufferToBase64URL(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const char of bytes) {
    str += String.fromCharCode(char);
  }
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function serializeCredential(credential) {
  const p = {
    id: credential.id,
    rawId: bufferToBase64URL(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON),
    },
  };

  if (credential.response.attestationObject) {
    p.response.attestationObject = bufferToBase64URL(credential.response.attestationObject);
  }
  if (credential.response.authenticatorData) {
    p.response.authenticatorData = bufferToBase64URL(credential.response.authenticatorData);
  }
  if (credential.response.signature) {
    p.response.signature = bufferToBase64URL(credential.response.signature);
  }
  if (credential.response.userHandle) {
    p.response.userHandle = bufferToBase64URL(credential.response.userHandle);
  }
  
  if (typeof credential.getClientExtensionResults === 'function') {
    p.clientExtensionResults = credential.getClientExtensionResults();
  }

  return p;
}

export function ensureWebAuthnSupport() {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    !window.PublicKeyCredential ||
    !navigator.credentials
  ) {
    throw new Error('Auth.PASSKEY_NOT_SUPPORTED');
  }
}