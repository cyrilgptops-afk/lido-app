/** Standard success response shape */
export function successResponse<T>(data: T) {
  return { success: true as const, data };
}

/** Standard error response shape */
export function errorResponse(code: string, message: string) {
  return {
    success: false as const,
    error: { code, message },
  };
}

export type SuccessResponse<T> = ReturnType<typeof successResponse<T>>;
export type ErrorResponse = ReturnType<typeof errorResponse>;
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
