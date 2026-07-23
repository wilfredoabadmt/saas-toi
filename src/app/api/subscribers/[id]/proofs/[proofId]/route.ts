import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth';
import { PaymentProofService } from '@/services/payment-proof.service';
import { handleApiError } from '@/lib/api-errors';
import { z } from 'zod';

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; proofId: string }> }
) {
  try {
    const session = await getSessionContext(request);
    const { proofId } = await params;
    const body = await request.json();
    const { status } = reviewSchema.parse(body);

    const updated = await PaymentProofService.reviewProof(
      session.organizationId,
      proofId,
      status,
      session.userId
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
