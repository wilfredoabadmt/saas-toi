import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'DUPLICATE'
  | 'VALIDATION_ERROR'
  | 'WABA_NOT_CONNECTED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_AUTH_CODE'
  | 'META_API_ERROR'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: 'Error de validación de datos',
        details: error.errors,
      },
      { status: 400 }
    );
  }

  console.error('[API Error]:', error);
  return NextResponse.json(
    {
      error: 'INTERNAL_ERROR',
      message: 'Ocurrió un error interno en el servidor',
    },
    { status: 500 }
  );
}
