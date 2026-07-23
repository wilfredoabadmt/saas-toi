import crypto from 'crypto';

/**
 * Verifies X-Hub-Signature-256 header sent by Meta using constant-time comparison.
 * @param rawBody - Raw body buffer/string before JSON parsing
 * @param signatureHeader - X-Hub-Signature-256 header value (e.g. "sha256=abcdef...")
 * @param appSecret - Meta App Secret
 */
export function verifyMetaWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  appSecret = process.env.META_APP_SECRET
): boolean {
  if (!signatureHeader || !appSecret) {
    return false;
  }

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const receivedSigHex = parts[1];
  if (!receivedSigHex) {
    return false;
  }

  const expectedSigHex = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSigHex, 'utf8');
  const receivedBuf = Buffer.from(receivedSigHex, 'utf8');

  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
