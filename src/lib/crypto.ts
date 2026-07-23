import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits standard for GCM

function getEncryptionKey(): Buffer {
  const keyEnv = process.env.ENCRYPTION_KEY;
  if (!keyEnv) {
    throw new Error('ENCRYPTION_KEY environment variable is missing');
  }
  
  // If hex string (64 chars = 32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(keyEnv)) {
    return Buffer.from(keyEnv, 'hex');
  }
  
  // Otherwise assume base64 or utf8, pad/slice to 32 bytes
  const buf = Buffer.from(keyEnv, 'utf8');
  if (buf.length === 32) {
    return buf;
  }
  
  // Hash to get deterministic 32-byte key if raw string provided
  return crypto.createHash('sha256').update(keyEnv).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`;
}

/**
 * Decrypts an encrypted token string (format: base64(iv):base64(authTag):base64(ciphertext))
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected iv:authTag:ciphertext');
  }

  const ivStr = parts[0];
  const authTagStr = parts[1];
  const ciphertext = parts[2];

  if (!ivStr || !authTagStr || !ciphertext) {
    throw new Error('Invalid encrypted data components');
  }

  const iv = Buffer.from(ivStr, 'base64');
  const authTag = Buffer.from(authTagStr, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}
