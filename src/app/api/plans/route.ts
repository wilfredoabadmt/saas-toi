import { NextRequest, NextResponse } from 'next/server';
import { ServicePlanService } from '@/services/service-plan.service';
import { handleApiError } from '@/lib/api-errors';
import { getSessionContext } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getSessionContext(req);
    const plans = await ServicePlanService.list(organizationId);
    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId } = await getSessionContext(req);
    const body = await req.json();
    const { name, price, speedDown, speedUp } = body;

    if (!name || !price) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Nombre y precio son requeridos' }, { status: 400 });
    }

    const created = await ServicePlanService.create(organizationId, {
      name,
      price: String(price),
      speedDown,
      speedUp,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
