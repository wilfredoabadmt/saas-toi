import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth';
import { parseAndImportSubscribersCsv } from '@/lib/csv-parser';
import { handleApiError, ApiError } from '@/lib/api-errors';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionContext(request);
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      throw new ApiError('VALIDATION_ERROR', 'Se requiere un archivo CSV válido en el campo "file"', 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new ApiError('VALIDATION_ERROR', 'El archivo excede el tamaño máximo permitido (5MB)', 400);
    }

    const csvText = await file.text();
    const result = await parseAndImportSubscribersCsv(session.organizationId, csvText);

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
