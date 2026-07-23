import { db, ensureMigrationsRun } from '@/db/client';
import { wabaConfigs, WabaConfig } from '@/db/schema/waba-configs';
import { assertTenantScope } from '@/lib/tenant';
import { encrypt, decrypt } from '@/lib/crypto';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { ApiError } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';

export class WabaService {
  /**
   * Connect WABA via Embedded Signup auth code.
   * Exchanges code for token, encrypts token AES-256-GCM, stores in DB, subscribes webhook.
   */
  static async connect(organizationId: string, code: string) {
    const orgId = assertTenantScope(organizationId);

    const exchange = await WhatsAppClient.exchangeCodeForToken(code);
    const encryptedToken = encrypt(exchange.accessToken);

    // Upsert waba_config for tenant
    const existing = await db
      .select()
      .from(wabaConfigs)
      .where(eq(wabaConfigs.organizationId, orgId))
      .limit(1);

    let saved: WabaConfig;

    if (existing && existing.length > 0) {
      const [updated] = await db
        .update(wabaConfigs)
        .set({
          wabaId: exchange.wabaId,
          phoneNumberId: exchange.phoneNumberId,
          displayPhone: exchange.displayPhone,
          encryptedToken,
          connectionStatus: 'connected',
          connectedAt: new Date(),
          disconnectedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(wabaConfigs.organizationId, orgId))
        .returning();
      saved = updated!;
    } else {
      const [created] = await db
        .insert(wabaConfigs)
        .values({
          organizationId: orgId,
          wabaId: exchange.wabaId,
          phoneNumberId: exchange.phoneNumberId,
          displayPhone: exchange.displayPhone,
          encryptedToken,
          connectionStatus: 'connected',
        })
        .returning();
      saved = created!;
    }

    // Subscribe WABA to webhook (non-blocking if fails)
    try {
      await WhatsAppClient.subscribeAppToWaba(exchange.wabaId, exchange.accessToken);
    } catch {
      // Sanitized: do not log raw err which may contain tokens or request details
      console.warn('[WABA Webhook Subscription Warning]: subscription failed for wabaId', exchange.wabaId);
    }

    return {
      isConnected: true,
      displayPhone: saved.displayPhone,
      wabaId: saved.wabaId,
      connectionStatus: saved.connectionStatus,
      connectedAt: saved.connectedAt,
    };
  }

  /**
   * Returns WABA connection status for tenant.
   * NEVER returns encryptedToken or decrypted token to caller.
   */
  static async getStatus(organizationId: string) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    const [config] = await db
      .select()
      .from(wabaConfigs)
      .where(eq(wabaConfigs.organizationId, orgId))
      .limit(1);

    if (!config || config.connectionStatus !== 'connected') {
      return {
        isConnected: false,
        connectionStatus: config?.connectionStatus || 'disconnected',
        displayPhone: config?.displayPhone || null,
        connectedAt: null,
      };
    }

    return {
      isConnected: true,
      displayPhone: config.displayPhone,
      wabaId: config.wabaId,
      connectionStatus: config.connectionStatus,
      connectedAt: config.connectedAt,
    };
  }

  /**
   * Disconnect WABA for tenant.
   */
  static async disconnect(organizationId: string) {
    const orgId = assertTenantScope(organizationId);

    const [updated] = await db
      .update(wabaConfigs)
      .set({
        connectionStatus: 'disconnected',
        disconnectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(wabaConfigs.organizationId, orgId))
      .returning();

    return {
      isConnected: false,
      connectionStatus: 'disconnected',
      disconnectedAt: updated?.disconnectedAt || new Date(),
    };
  }

  /**
   * Marks WABA as disconnected when a 401 Meta Auth error occurs (Remediation C3).
   */
  static async handleAuthFailure(organizationId: string) {
    const orgId = assertTenantScope(organizationId);
    await this.disconnect(orgId);
  }

  /**
   * INTERNAL ONLY: Retrieves and decrypts WABA System User Token for backend API calls.
   * Must NEVER be called by API routes returning JSON to frontend.
   */
  static async getDecryptedTokenInternal(organizationId: string): Promise<{ token: string; phoneNumberId: string; wabaId: string }> {
    const orgId = assertTenantScope(organizationId);

    const [config] = await db
      .select()
      .from(wabaConfigs)
      .where(eq(wabaConfigs.organizationId, orgId))
      .limit(1);

    if (!config || config.connectionStatus !== 'connected') {
      throw new ApiError('WABA_NOT_CONNECTED', 'El ISP no tiene una cuenta de WhatsApp Business conectada', 400);
    }

    const token = decrypt(config.encryptedToken);
    return {
      token,
      phoneNumberId: config.phoneNumberId,
      wabaId: config.wabaId,
    };
  }
}
