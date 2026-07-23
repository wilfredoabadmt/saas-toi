import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth';
import { SubscriberService } from '@/services/subscriber.service';
import { handleApiError } from '@/lib/api-errors';
import { paginationQuerySchema, subscriberCreateSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionContext(request);
    const url = new URL(request.url);

    const queryParams = paginationQuerySchema.parse({
      page: url.searchParams.get('page') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      search: url.searchParams.get('search') || undefined,
      status: url.searchParams.get('status') || undefined,
      paymentStatus: url.searchParams.get('paymentStatus') || undefined,
    });

    const result = await SubscriberService.list({
      organizationId: session.organizationId,
      ...queryParams,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionContext(request);
    const body = await request.json();
    const validatedData = subscriberCreateSchema.parse(body);

    const created = await SubscriberService.create(session.organizationId, {
      name: validatedData.name,
      phone: validatedData.phone,
      email: validatedData.email || null,
      servicePlanId: validatedData.servicePlanId || null,
      monthlyAmount: validatedData.monthlyAmount.toFixed(2),
      dueDate: validatedData.dueDate,
      address: validatedData.address || null,
      notes: validatedData.notes || null,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
