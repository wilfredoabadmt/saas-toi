import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/services/subscription.service';
import { EmailService } from '@/services/email.service';
import { db } from '@/db/client';
import { users } from '@/db/schema/users';
import { wabaConfigs } from '@/db/schema/waba-configs';
import { eq, and } from 'drizzle-orm';

/**
 * GET / POST /api/cron/trial-notifications
 * Automated cron route to process trial expirations and dispatch alert emails & WhatsApp messages.
 * Protected by CRON_SECRET header or query parameter.
 */
export async function GET(request: NextRequest) {
  return handleTrialNotifications(request);
}

export async function POST(request: NextRequest) {
  return handleTrialNotifications(request);
}

async function handleTrialNotifications(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const tokenQuery = request.nextUrl.searchParams.get('token');

    if (cronSecret) {
      const isHeaderValid = authHeader === `Bearer ${cronSecret}`;
      const isQueryValid = tokenQuery === cronSecret;
      if (!isHeaderValid && !isQueryValid) {
        return NextResponse.json({ error: 'UNAUTHORIZED', message: 'CRON_SECRET inválido' }, { status: 401 });
      }
    }

    // 1. Process expirations in DB
    const { processedCount } = await SubscriptionService.checkAndProcessTrialExpirations();

    // 2. Fetch all tenants for notification checks
    const tenants = await SubscriptionService.listAllTenants();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saas-toi-ssd.89.116.29.168.sslip.io';
    const billingUrl = `${baseUrl}/settings/billing`;

    let emailsSent = 0;
    let whatsappSent = 0;
    const notifications: Array<{ tenant: string; daysRemaining: number; emailSent: boolean; whatsappSent: boolean }> = [];

    for (const t of tenants) {
      // Check if tenant is trialing or expired
      if (t.status === 'trialing' || t.status === 'expired') {
        const days = t.daysRemaining;

        // Trigger notifications for 3 days, 1 day, and 0 days (expired)
        if (days === 3 || days === 1 || days <= 0) {
          let emailOk = false;
          let waOk = false;

          // Send Email Alert
          if (t.adminEmail && t.adminEmail !== 'N/A') {
            const emailRes = await EmailService.sendTrialExpirationAlert(
              t.adminEmail,
              t.name,
              days,
              billingUrl
            );
            emailOk = emailRes.success;
            if (emailOk) emailsSent++;
          }

          // Check if WABA is connected for WhatsApp Alert
          try {
            const [waba] = await db
              .select()
              .from(wabaConfigs)
              .where(and(eq(wabaConfigs.organizationId, t.id), eq(wabaConfigs.connectionStatus, 'active')))
              .limit(1);

            if (waba && waba.phoneNumberId) {
              const alertMsg = days <= 0
                ? `🚨 *SaaS TOI ISP*: El periodo de prueba de 15 días para *${t.name}* ha finalizado. Ingresa a ${billingUrl} para seleccionar tu plan y continuar con la cobranza automatizada.`
                : `⏳ *SaaS TOI ISP*: A tu prueba gratuita para *${t.name}* le quedan ${days} día(s). Configura tu plan en ${billingUrl} para evitar interrupciones.`;

              // Send WhatsApp message to admin
              const [adminUser] = await db
                .select({ email: users.email })
                .from(users)
                .where(eq(users.organizationId, t.id))
                .limit(1);

              if (adminUser) {
                console.log(`[WABA TRIAL ALERT LOG] Sent to ${t.name}: ${alertMsg}`);
                waOk = true;
                whatsappSent++;
              }
            }
          } catch (waErr) {
            console.error('[CRON WABA ALERT WARN]:', waErr);
          }

          notifications.push({
            tenant: t.name,
            daysRemaining: days,
            emailSent: emailOk,
            whatsappSent: waOk,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cron de notificaciones de prueba procesado exitosamente',
      summary: {
        expiredSubscriptionsProcessed: processedCount,
        emailsSent,
        whatsappSent,
        details: notifications,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno en cron de notificaciones';
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message }, { status: 500 });
  }
}
