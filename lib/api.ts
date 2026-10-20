import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { randomUUID } from 'node:crypto';
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function apiError(error: unknown) {
  const requestId = randomUUID();
  if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Please check the supplied information.', details: error.flatten() }, requestId }, { status: 400 });
  if (error instanceof SyntaxError) return NextResponse.json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body.' }, requestId }, { status: 400 });
  if (error instanceof ApiError) return NextResponse.json({ success: false, error: { code: error.code, message: error.message }, requestId }, { status: error.status });
  console.error('Request failed', { requestId, error });
  return NextResponse.json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Unable to complete the request. Please retry.' }, requestId }, { status: 503 });
}
