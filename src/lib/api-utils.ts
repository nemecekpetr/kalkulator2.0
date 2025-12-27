import { NextResponse } from 'next/server'
import { PostgrestError } from '@supabase/supabase-js'

/**
 * Standardized API error response
 */
export interface ApiError {
  error: string
  code?: string
  details?: string
}

/**
 * Create a standardized error response
 */
export function apiError(
  message: string,
  status: number = 500,
  code?: string
): NextResponse<ApiError> {
  return NextResponse.json(
    { error: message, code },
    { status }
  )
}

/**
 * Handle Supabase/Postgres errors and return appropriate response
 */
export function handleDbError(
  error: PostgrestError | Error | unknown,
  context: string = 'Database operation'
): NextResponse<ApiError> {
  // Log the full error for debugging
  console.error(`${context} error:`, error)

  // Supabase/Postgres error
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as PostgrestError

    // Common Postgres error codes
    switch (pgError.code) {
      case '23505': // unique_violation
        return apiError('Záznam již existuje', 409, 'DUPLICATE')

      case '23503': // foreign_key_violation
        return apiError('Záznam nelze smazat, je použit jinde', 400, 'FK_VIOLATION')

      case '23514': // check_violation
        return apiError('Neplatná hodnota', 400, 'CHECK_VIOLATION')

      case '42501': // insufficient_privilege
        return apiError('Nedostatečná oprávnění', 403, 'FORBIDDEN')

      case 'PGRST301': // Row not found
        return apiError('Záznam nenalezen', 404, 'NOT_FOUND')

      case 'PGRST205': // Table not found
        return apiError('Tabulka nenalezena - kontaktujte administrátora', 500, 'TABLE_NOT_FOUND')

      default:
        return apiError(
          pgError.message || 'Chyba databáze',
          500,
          pgError.code
        )
    }
  }

  // Standard Error
  if (error instanceof Error) {
    return apiError(error.message, 500)
  }

  // Unknown error
  return apiError('Neznámá chyba', 500)
}

/**
 * Wrapper for async API handlers with automatic error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiError>> {
  return handler().catch((error) => {
    return handleDbError(error, 'API')
  })
}

/**
 * Common HTTP status helpers
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const
