import { NextResponse } from 'next/server';
import { RouterService } from '@/services/router.service';
import { handleApiError } from '@/lib/api-errors';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/routers/audit-logs
 * Retrieves audit logs of network commands sent to MikroTik routers.
 */
export async function GET() {
  try {
    const logs = await RouterService.listAuditLogs(DEFAULT_ORG_ID);
    return NextResponse.json({ success: true, data: logs });
  } catch (err) {
    return handleApiError(err);
  }
}
