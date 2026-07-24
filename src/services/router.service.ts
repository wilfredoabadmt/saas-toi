import { db, ensureMigrationsRun } from '@/db/client';
import { routerConfigs } from '@/db/schema/router-configs';
import { routerAuditLogs } from '@/db/schema/router-audit-logs';
import { subscribers } from '@/db/schema/subscribers';
import { assertTenantScope } from '@/lib/tenant';
import { ApiError } from '@/lib/api-errors';
import { encrypt, decrypt } from '@/lib/crypto';
import { MikroTikClient } from '@/lib/mikrotik/client';
import { eq, and, desc } from 'drizzle-orm';
import { WabaService } from './waba.service';
import { WhatsAppClient } from '@/lib/whatsapp/client';

export class RouterService {
  /**
   * Lists all configured routers for tenant (hiding encrypted password).
   */
  static async list(organizationId: string) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    const routers = await db
      .select({
        id: routerConfigs.id,
        organizationId: routerConfigs.organizationId,
        name: routerConfigs.name,
        host: routerConfigs.host,
        apiPort: routerConfigs.apiPort,
        username: routerConfigs.username,
        isActive: routerConfigs.isActive,
        createdAt: routerConfigs.createdAt,
      })
      .from(routerConfigs)
      .where(eq(routerConfigs.organizationId, orgId))
      .orderBy(desc(routerConfigs.createdAt));

    return routers;
  }

  /**
   * Registers a new router encrypting password with AES-256-GCM.
   */
  static async create(
    organizationId: string,
    input: {
      name: string;
      host: string;
      apiPort?: number;
      username: string;
      password: string;
    }
  ) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    const encryptedString = encrypt(input.password);
    const parts = encryptedString.split(':');

    const [created] = await db
      .insert(routerConfigs)
      .values({
        organizationId: orgId,
        name: input.name.trim(),
        host: input.host.trim(),
        apiPort: input.apiPort || 443,
        username: input.username.trim(),
        encryptedPassword: parts[2] || encryptedString,
        iv: parts[0] || '',
        authTag: parts[1] || '',
      })
      .returning();

    if (!created) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo registrar la configuración del router', 500);
    }

    return {
      id: created.id,
      name: created.name,
      host: created.host,
      apiPort: created.apiPort,
      username: created.username,
      isActive: created.isActive,
    };
  }

  /**
   * Tests connectivity to a configured router.
   */
  static async testConnection(organizationId: string, routerId: string) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    const [router] = await db
      .select()
      .from(routerConfigs)
      .where(and(eq(routerConfigs.id, routerId), eq(routerConfigs.organizationId, orgId)))
      .limit(1);

    if (!router) {
      throw new ApiError('NOT_FOUND', 'Router no encontrado', 404);
    }

    const fullEncrypted = `${router.iv}:${router.authTag}:${router.encryptedPassword}`;
    const decryptedPassword = decrypt(fullEncrypted);

    const result = await MikroTikClient.testConnection({
      host: router.host,
      apiPort: router.apiPort,
      username: router.username,
      password: decryptedPassword,
    });

    // Record audit log
    await db.insert(routerAuditLogs).values({
      organizationId: orgId,
      routerId: router.id,
      action: 'test_connection',
      command: result.command,
      responseStatus: result.status,
      responseBody: result.responseBody,
    });

    return result;
  }

  /**
   * Executes subscriber disconnection/suspension on MikroTik.
   */
  static async executeCut(organizationId: string, subscriberId: string) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    const [sub] = await db
      .select()
      .from(subscribers)
      .where(and(eq(subscribers.id, subscriberId), eq(subscribers.organizationId, orgId)))
      .limit(1);

    if (!sub) {
      throw new ApiError('NOT_FOUND', 'Abonado no encontrado', 404);
    }

    const [router] = await db
      .select()
      .from(routerConfigs)
      .where(and(eq(routerConfigs.organizationId, orgId), eq(routerConfigs.isActive, true)))
      .limit(1);

    if (!router) return;

    const password = decrypt(`${router.iv}:${router.authTag}:${router.encryptedPassword}`);

    const result = await MikroTikClient.setSubscriberServiceStatus({
      host: router.host,
      apiPort: router.apiPort,
      username: router.username,
      password,
      subscriberIdentifier: sub.phone,
      disabled: true,
    });

    // Audit log
    await db.insert(routerAuditLogs).values({
      organizationId: orgId,
      routerId: router.id,
      subscriberId: sub.id,
      action: 'suspend',
      command: result.command,
      responseStatus: result.status,
      responseBody: result.responseBody,
    });

    return result;
  }

  /**
   * Executes subscriber service reconnection on MikroTik and sends WhatsApp confirmation.
   */
  static async executeReconnection(organizationId: string, subscriberId: string) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    const [sub] = await db
      .select()
      .from(subscribers)
      .where(and(eq(subscribers.id, subscriberId), eq(subscribers.organizationId, orgId)))
      .limit(1);

    if (!sub) {
      throw new ApiError('NOT_FOUND', 'Abonado no encontrado', 404);
    }

    const [router] = await db
      .select()
      .from(routerConfigs)
      .where(and(eq(routerConfigs.organizationId, orgId), eq(routerConfigs.isActive, true)))
      .limit(1);

    if (!router) return;

    const password = decrypt(`${router.iv}:${router.authTag}:${router.encryptedPassword}`);

    const result = await MikroTikClient.setSubscriberServiceStatus({
      host: router.host,
      apiPort: router.apiPort,
      username: router.username,
      password,
      subscriberIdentifier: sub.phone,
      disabled: false,
    });

    // Audit log
    await db.insert(routerAuditLogs).values({
      organizationId: orgId,
      routerId: router.id,
      subscriberId: sub.id,
      action: 'reactivate',
      command: result.command,
      responseStatus: result.status,
      responseBody: result.responseBody,
    });

    // Notify WhatsApp
    try {
      const credentials = await WabaService.getDecryptedTokenInternal(orgId);
      await WhatsAppClient.sendTextMessage({
        phoneNumberId: credentials.phoneNumberId,
        accessToken: credentials.token,
        toPhone: sub.phone,
        text: `🟢 ¡Servicio Reconectado!\n\nEstimado/a ${sub.name}, tu pago ha sido verificado exitosamente y tu servicio de internet ha sido restablecido. ¡Gracias por tu preferencia!`,
      });
    } catch {
      // Non-blocking notification fallback
    }

    return result;
  }

  /**
   * Lists audit logs for tenant.
   */
  static async listAuditLogs(organizationId: string) {
    await ensureMigrationsRun();
    const orgId = assertTenantScope(organizationId);

    const logs = await db
      .select()
      .from(routerAuditLogs)
      .where(eq(routerAuditLogs.organizationId, orgId))
      .orderBy(desc(routerAuditLogs.createdAt));

    return logs;
  }
}
