import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth';
import { WabaService } from '@/services/waba.service';
import { handleApiError } from '@/lib/api-errors';
import { z } from 'zod';

const connectSchema = z.object({
  code: z.string().min(10, 'Código de autorización inválido'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionContext(request);
    const body = await request.json();
    const { code } = connectSchema.parse(body);

    const result = await WabaService.connect(session.organizationId, code);

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
