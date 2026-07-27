import { NextRequest, NextResponse } from 'next/server';
import { ServicePlanService } from '@/services/service-plan.service';
import { handleApiError } from '@/lib/api-errors';
import { getSessionContext } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await getSessionContext(req);
    const { id } = await params;
    const plan = await ServicePlanService.getById(organizationId, id);
    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await getSessionContext(req);
    const { id } = await params;
    const body = await req.json();

    const updated = await ServicePlanService.update(organizationId, id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await getSessionContext(req);
    const { id } = await params;
    const deleted = await ServicePlanService.delete(organizationId, id);
    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    return handleApiError(error);
  }
}
