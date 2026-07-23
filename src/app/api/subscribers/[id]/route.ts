import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth';
import { SubscriberService } from '@/services/subscriber.service';
import { handleApiError } from '@/lib/api-errors';
import { subscriberUpdateSchema } from '@/lib/validators';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionContext(request);
    const { id } = await params;
    const subscriber = await SubscriberService.getById(session.organizationId, id);

    return NextResponse.json({ data: subscriber });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionContext(request);
    const { id } = await params;
    const body = await request.json();
    const validatedData = subscriberUpdateSchema.parse(body);

    const updated = await SubscriberService.update(session.organizationId, id, {
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.phone && { phone: validatedData.phone }),
      ...(validatedData.email !== undefined && { email: validatedData.email || null }),
      ...(validatedData.servicePlanId !== undefined && { servicePlanId: validatedData.servicePlanId || null }),
      ...(validatedData.monthlyAmount && { monthlyAmount: validatedData.monthlyAmount.toFixed(2) }),
      ...(validatedData.dueDate && { dueDate: validatedData.dueDate }),
      ...(validatedData.address !== undefined && { address: validatedData.address || null }),
      ...(validatedData.notes !== undefined && { notes: validatedData.notes || null }),
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionContext(request);
    const { id } = await params;
    const deleted = await SubscriberService.softDelete(session.organizationId, id);

    return NextResponse.json({ data: deleted });
  } catch (error) {
    return handleApiError(error);
  }
}
