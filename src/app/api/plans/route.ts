import { NextRequest, NextResponse } from 'next/server';
import { ServicePlanService } from '@/services/service-plan.service';
import { handleApiError } from '@/lib/api-errors';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export async function GET() {
  try {
    const plans = await ServicePlanService.list(DEFAULT_ORG_ID);
    return NextResponse.json({ data: plans });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, price, speedDown, speedUp } = body;

    if (!name || !price) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Nombre y precio son requeridos' }, { status: 400 });
    }

    const created = await ServicePlanService.create(DEFAULT_ORG_ID, {
      name,
      price: String(price),
      speedDown,
      speedUp,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
