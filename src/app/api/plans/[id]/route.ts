import { NextRequest, NextResponse } from 'next/server';
import { ServicePlanService } from '@/services/service-plan.service';
import { handleApiError } from '@/lib/api-errors';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = await ServicePlanService.getById(DEFAULT_ORG_ID, id);
    return NextResponse.json({ data: plan });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await ServicePlanService.update(DEFAULT_ORG_ID, id, body);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
