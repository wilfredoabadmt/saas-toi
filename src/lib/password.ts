import crypto from 'node:crypto';

const COST_N = 16384;
const BLOCK_SIZE_R = 8;
const PARALLELIZATION_P = 1;
const KEY_LEN = 64;

/**
 * Hashes a plain text password using scrypt with a 16-byte salt.
 * Format: scrypt$N$r$p$<salt_b64>$<hash_b64>
 */
export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(plain, salt, KEY_LEN, {
    N: COST_N,
    r: BLOCK_SIZE_R,
    p: PARALLELIZATION_P,
  });
  return `scrypt$${COST_N}$${BLOCK_SIZE_R}$${PARALLELIZATION_P}$${salt.toString('base64')}$${derivedKey.toString('base64')}`;
}

/**
 * Verifies a plain text password against a stored hash (scrypt or legacy SHA-256).
 * Uses crypto.timingSafeEqual for timing-attack resistance.
 */
export function verifyPassword(plain: string, stored: string): boolean {
  if (!stored || !plain) return false;

  // New scrypt format
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 6) return false;

    const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
    if (!nStr || !rStr || !pStr || !saltB64 || !hashB64) return false;

    const n = parseInt(nStr, 10);
    const r = parseInt(rStr, 10);
    const p = parseInt(pStr, 10);

    if (isNaN(n) || isNaN(r) || isNaN(p)) return false;

    const salt = Buffer.from(saltB64, 'base64');
    const expectedHash = Buffer.from(hashB64, 'base64');

    const actualHash = crypto.scryptSync(plain, salt, expectedHash.length, {
      N: n,
      r,
      p,
    });

    if (expectedHash.length !== actualHash.length) return false;
    return crypto.timingSafeEqual(expectedHash, actualHash);
  }

  // Legacy SHA-256 fallback (hex comparison)
  const legacyHash = crypto.createHash('sha256').update(plain).digest('hex');
  const expectedBuf = Buffer.from(stored, 'utf8');
  const actualBuf = Buffer.from(legacyHash, 'utf8');

  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Checks if a stored password hash needs transparent upgrade to scrypt.
 */
export function needsRehash(stored: string): boolean {
  return !stored || !stored.startsWith('scrypt$');
}
