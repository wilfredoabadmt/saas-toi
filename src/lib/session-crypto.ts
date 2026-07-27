const DEFAULT_SECRET = 'dev-session-secret-change-in-production-minimum-32-chars';
export const SESSION_COOKIE_NAME = 'saas_toi_session';

function getSecretKey(): string {
  return process.env.SESSION_SECRET || DEFAULT_SECRET;
}

/**
 * Signs a random token string with HMAC-SHA256 using Web Crypto API.
 * Format: <token>.<signature_hex>
 */
export async function signToken(token: string): Promise<string> {
  const secret = getSecretKey();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(token));
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${token}.${signatureHex}`;
}

/**
 * Verifies an HMAC-SHA256 signed token string.
 * Returns the raw token if valid, or null if tampered/invalid.
 */
export async function verifySessionToken(cookieValue: string | undefined): Promise<string | null> {
  if (!cookieValue) return null;
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return null;

  const [token, providedSig] = parts;
  if (!token || !providedSig) return null;

  const expectedSigned = await signToken(token);
  const expectedParts = expectedSigned.split('.');
  const expectedSig = expectedParts[1];

  if (!expectedSig || providedSig.length !== expectedSig.length) return null;

  let result = 0;
  for (let i = 0; i < providedSig.length; i++) {
    result |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }

  return result === 0 ? token : null;
}

/**
 * Computes SHA-256 hash of raw token for database storage/lookup.
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
