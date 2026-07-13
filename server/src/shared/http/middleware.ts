import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { ApplicationError } from "./application-error.js";

export const traceMiddleware: RequestHandler = (request, response, next) => {
  const inbound = request.header("x-trace-id");
  const traceId = inbound !== undefined && /^[A-Za-z0-9_-]{8,64}$/u.test(inbound) ? inbound : randomUUID();
  response.setHeader("x-trace-id", traceId);
  response.locals.traceId = traceId;
  next();
};

export const notFoundMiddleware: RequestHandler = (_request, _response, next) => {
  next(new ApplicationError(404, 40400, "请求的资源不存在"));
};

export const errorMiddleware: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  void _next;
  if (error instanceof ZodError) {
    response.status(400).json({
      code: 40001,
      message: "请求参数不符合约束",
      data: { issues: error.issues }
    });
    return;
  }
  if (error instanceof ApplicationError) {
    response.status(error.status).json({
      code: error.code,
      message: error.message,
      data: error.details ?? null
    });
    return;
  }
  const traceId = typeof response.locals.traceId === "string" ? response.locals.traceId : "unknown";
  process.stderr.write(`${JSON.stringify({ level: "error", message: "UNHANDLED_REQUEST_ERROR", traceId })}\n`);
  response.status(500).json({ code: 50000, message: "服务暂时不可用", data: null });
};
