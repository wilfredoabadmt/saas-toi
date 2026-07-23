/**
 * Sliding window rate limiter per tenant (organization_id).
 * Default limit: 80 messages per minute.
 */
export class RateLimiter {
  private static timestampsMap = new Map<string, number[]>();
  private static DEFAULT_LIMIT = 80;
  private static WINDOW_MS = 60 * 1000; // 1 minute

  /**
   * Checks if tenant is allowed to send a message.
   * If allowed, records the timestamp and returns true.
   * If exceeded, returns false.
   */
  static tryConsume(organizationId: string, limit = this.DEFAULT_LIMIT): boolean {
    const now = Date.now();
    const timestamps = this.timestampsMap.get(organizationId) || [];
    
    // Filter timestamps within current window
    const validTimestamps = timestamps.filter((ts) => now - ts < this.WINDOW_MS);

    if (validTimestamps.length >= limit) {
      this.timestampsMap.set(organizationId, validTimestamps);
      return false;
    }

    validTimestamps.push(now);
    this.timestampsMap.set(organizationId, validTimestamps);
    return true;
  }

  /**
   * Resets rate limiter memory for testing.
   */
  static reset(organizationId?: string): void {
    if (organizationId) {
      this.timestampsMap.delete(organizationId);
    } else {
      this.timestampsMap.clear();
    }
  }
}
