import bcrypt from 'bcryptjs';

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hashes a password using bcrypt.
 * @param password The plain-text password to hash.
 * @returns The hashed password.
 */
export function hashPassword(password: string): string {
  // Using sync version for simplicity in seeders and services.
  // The cost factor (10) is a reasonable default for security and performance.
  return bcrypt.hashSync(password, 10);
}

/**
 * Verifies if a plain-text password matches a hash. Alias for comparePasswords.
 */
export const verifyPassword = comparePasswords;

/**
 * Checks if a password hash is outdated (e.g., not a bcrypt hash) and needs to be updated.
 */
export function needsRehash(hash: string): boolean {
  // bcrypt hashes start with a version prefix like $2a$, $2b$, or $2y$.
  // If the hash doesn't start with this, it's likely a legacy hash (e.g., plain SHA-256)
  // and should be rehashed to the new format.
  return !hash.startsWith('$2');
}