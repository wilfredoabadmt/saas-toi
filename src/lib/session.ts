import { db } from '@/db/client';
import { sessions } from '@/db/schema/sessions';
import { users } from '@/db/schema/users';
import { organizations } from '@/db/schema/organizations';
import { eq, and, gte } from 'drizzle-orm';
import { signToken, verifySessionToken, hashToken } from './session-crypto';

export { SESSION_COOKIE_NAME, signToken, verifySessionToken, hashToken } from './session-crypto';

export interface SessionData {
  userId: string;
  organizationId: string;
  role: string;
  userName: string;
  userEmail: string;
  organizationName: string;
  organizationStatus: string;
  organizationLogoUrl?: string | null;
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
      organizationLogoUrl: organizations.logoUrl,
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
    organizationLogoUrl: row.organizationLogoUrl || null,
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
