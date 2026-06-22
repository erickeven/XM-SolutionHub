export function successResponse<T>(data: T, message = 'ok') {
  return { code: 0, message, data };
}

export function errorResponse(code: number, message: string) {
  return { code, message, data: null };
}