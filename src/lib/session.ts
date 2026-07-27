import { db } from '@/db/client';
import { sessions } from '@/db/schema/sessions';
import { users } from '@/db/schema/users';
import { organizations } from '@/db/schema/organizations';
import { eq, and, gte } from 'drizzle-orm';

const DEFAULT_SECRET = 'dev-session-secret-change-in-production-minimum-32-chars';
export const SESSION_COOKIE_NAME = 'saas_toi_session';

export interface SessionData {
  userId: string;
  organizationId: string;
  role: string;
  userName: string;
  userEmail: string;
  organizationName: string;
  organizationStatus: string;
}

function getSecretKey(): string {
  return process.env.SESSION_SECRET || DEFAULT_SECRET;
}

/**
 * Signs a random token string with HMAC-SHA256.
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

/**
 * Creates a new session in database and returns the signed cookie value.
 */
export async function createSession(
  userId: string,
  organizationId: string,
  meta?: { ip?: string; userAgent?: string }
): Promise<{ cookieValue: string; expiresAt: Date }> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const token = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const cookieValue = await signToken(token);
  const tokenHash = await hashToken(token);

  // 7 days expiration
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    tokenHash,
    userId,
    organizationId,
    expiresAt,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });

  return { cookieValue, expiresAt };
}

/**
 * Resolves session from database given a signed cookie value.
 */
export async function resolveSession(cookieValue: string | undefined): Promise<SessionData | null> {
  const token = await verifySessionToken(cookieValue);
  if (!token) return null;

  const tokenHash = await hashToken(token);

  const [row] = await db
    .select({
      userId: sessions.userId,
      organizationId: sessions.organizationId,
      expiresAt: sessions.expiresAt,
      userName: users.name,
      userEmail: users.email,
      role: users.role,
      organizationName: organizations.name,
      organizationStatus: organizations.status,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(organizations, eq(sessions.organizationId, organizations.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gte(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row) return null;

  return {
    userId: row.userId,
    organizationId: row.organizationId,
    role: row.role,
    userName: row.userName,
    userEmail: row.userEmail,
    organizationName: row.organizationName,
    organizationStatus: row.organizationStatus,
  };
}

/**
 * Destroys a session in the database.
 */
export async function destroySession(cookieValue: string | undefined): Promise<void> {
  const token = await verifySessionToken(cookieValue);
  if (!token) return;

  const tokenHash = await hashToken(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}
