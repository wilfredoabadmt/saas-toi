import { NextRequest, NextResponse } from 'next/server';
import { RouterService } from '@/services/router.service';
import { handleApiError } from '@/lib/api-errors';
import { getSessionContext } from '@/lib/auth';

/**
 * GET /api/routers/audit-logs
 * Retrieves audit logs of network commands sent to MikroTik routers.
 */
export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await getSessionContext(request);
    const logs = await RouterService.listAuditLogs(organizationId);
    return NextResponse.json({ success: true, data: logs });
  } catch (err) {
    return handleApiError(err);
  }
}
