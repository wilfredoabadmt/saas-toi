import { db } from '@/db/client';
import { paymentProofs } from '@/db/schema/payment-proofs';
import { messageLogs } from '@/db/schema/message-logs';
import { subscribers } from '@/db/schema/subscribers';
import { wabaConfigs } from '@/db/schema/waba-configs';
import { assertTenantScope } from '@/lib/tenant';
import { uploadToS3, getPresignedDownloadUrl, buildS3ProofKey } from '@/lib/s3';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { WabaService } from './waba.service';
import { ApiError } from '@/lib/api-errors';
import { eq, and, desc } from 'drizzle-orm';

export class PaymentProofService {
  /**
   * Processes incoming image/document media from a subscriber, uploads to S3 with retry (Remediation C2),
   * creates a payment_proof record and a message_log entry.
   */
  static async processIncomingProof(params: {
    phoneNumberId: string;
    senderPhone: string;
    wamid: string;
    mediaId: string;
    fileType: 'image' | 'document';
    caption?: string;
  }) {
    // 1. Find WABA config by phone_number_id to resolve organization_id
    const [config] = await db
      .select()
      .from(wabaConfigs)
      .where(eq(wabaConfigs.phoneNumberId, params.phoneNumberId))
      .limit(1);

    if (!config) {
      console.warn(`[Proof Error]: WABA config not found for phone_number_id ${params.phoneNumberId}`);
      return null;
    }

    const orgId = config.organizationId;

    // 2. Find subscriber by senderPhone + organizationId
    const [sub] = await db
      .select()
      .from(subscribers)
      .where(and(eq(subscribers.organizationId, orgId), eq(subscribers.phone, params.senderPhone)))
      .limit(1);

    if (!sub) {
      console.warn(`[Proof Warning]: Subscriber not found for phone ${params.senderPhone} in org ${orgId}`);
      return null;
    }

    // 3. Download media from Meta
    const decrypted = await WabaService.getDecryptedTokenInternal(orgId);
    const media = await WhatsAppClient.downloadMedia(params.mediaId, decrypted.token);

    // 4. Build S3 key
    const extension = media.mimeType.includes('pdf') ? 'pdf' : 'jpg';
    const s3Key = buildS3ProofKey(orgId, sub.id, `${params.wamid}.${extension}`);

    // Remediation C2: S3 upload with retry (max 3 attempts)
    let uploadSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await uploadToS3({
          key: s3Key,
          body: media.buffer,
          contentType: media.mimeType,
        });
        uploadSuccess = true;
        break;
      } catch (err) {
        console.warn(`[S3 Upload Attempt ${attempt} failed]:`, err);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }

    if (!uploadSuccess) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo almacenar el comprobante en S3 tras 3 reintentos', 500);
    }

    // 5. Create message_log entry
    const [log] = await db
      .insert(messageLogs)
      .values({
        organizationId: orgId,
        subscriberId: sub.id,
        wamid: params.wamid,
        direction: 'inbound',
        messageType: params.fileType,
        contentPreview: params.caption || `Comprobante ${params.fileType}`,
        deliveryStatus: 'delivered',
      })
      .returning();

    // 6. Create payment_proof record
    const [proof] = await db
      .insert(paymentProofs)
      .values({
        organizationId: orgId,
        subscriberId: sub.id,
        messageLogId: log?.id,
        wamid: params.wamid,
        fileType: params.fileType,
        mimeType: media.mimeType,
        s3Key,
        fileSizeBytes: media.buffer.length,
        reviewStatus: 'pending',
      })
      .onConflictDoNothing()
      .returning();

    return proof;
  }

  /**
   * Lists payment proofs for tenant with presigned download URLs.
   */
  static async listBySubscriber(organizationId: string, subscriberId: string) {
    const orgId = assertTenantScope(organizationId);

    const proofs = await db
      .select()
      .from(paymentProofs)
      .where(and(eq(paymentProofs.organizationId, orgId), eq(paymentProofs.subscriberId, subscriberId)))
      .orderBy(desc(paymentProofs.createdAt));

    const result = await Promise.all(
      proofs.map(async (proof) => ({
        ...proof,
        downloadUrl: await getPresignedDownloadUrl(proof.s3Key, 900), // 15 min TTL
      }))
    );

    return result;
  }

  /**
   * Reviews proof (approve / reject).
   */
  static async reviewProof(organizationId: string, proofId: string, status: 'approved' | 'rejected', reviewerId?: string) {
    const orgId = assertTenantScope(organizationId);

    const [updated] = await db
      .update(paymentProofs)
      .set({
        reviewStatus: status,
        reviewedBy: reviewerId || null,
        reviewedAt: new Date(),
      })
      .where(and(eq(paymentProofs.id, proofId), eq(paymentProofs.organizationId, orgId)))
      .returning();

    if (!updated) {
      throw new ApiError('NOT_FOUND', 'Comprobante no encontrado', 404);
    }

    return updated;
  }
}
