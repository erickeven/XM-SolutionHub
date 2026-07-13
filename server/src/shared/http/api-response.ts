import type { Response } from "express";

export interface ApiResponse<T> {
  readonly code: number;
  readonly message: string;
  readonly data: T;
}

export function sendSuccess<T>(response: Response, data: T, message = "OK"): void {
  const body: ApiResponse<T> = { code: 0, message, data };
  response.json(body);
}
