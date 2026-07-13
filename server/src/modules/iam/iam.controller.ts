import type { Request, Response } from "express";
import { z } from "zod";
import { ApplicationError } from "../../shared/http/application-error.js";
import { sendSuccess } from "../../shared/http/api-response.js";
import type { IamService, SessionMetadata, SessionResult } from "./iam.service.js";

const credentialsSchema = z.object({
  email: z.email().transform((value) => value.toLocaleLowerCase("en-US")),
  password: z.string().min(12).max(128)
});
const registerSchema = credentialsSchema.extend({ displayName: z.string().trim().min(2).max(120) });

function metadata(request: Request): SessionMetadata {
  return { sourceIp: request.ip ?? "unknown", userAgent: request.header("user-agent") ?? null };
}

function readCookie(request: Request, name: string): string | null {
  const cookie = request.header("cookie");
  if (cookie === undefined) return null;
  for (const part of cookie.split(";")) {
    const [key, value] = part.trim().split("=", 2);
    if (key === name && value !== undefined) return decodeURIComponent(value);
  }
  return null;
}

function sendSession(response: Response, result: SessionResult): void {
  response.cookie("refresh_token", result.refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/v1/iam"
  });
  sendSuccess(response, { accessToken: result.accessToken, subject: result.subject });
}

export class IamController {
  public constructor(private readonly service: IamService) {}

  public readonly register = async (request: Request, response: Response): Promise<void> => {
    sendSession(response, await this.service.register(registerSchema.parse(request.body), metadata(request)));
  };

  public readonly login = async (request: Request, response: Response): Promise<void> => {
    const input = credentialsSchema.parse(request.body);
    sendSession(response, await this.service.login(input.email, input.password, metadata(request)));
  };

  public readonly refresh = async (request: Request, response: Response): Promise<void> => {
    const refreshToken = readCookie(request, "refresh_token");
    if (refreshToken === null) throw new ApplicationError(401, 40102, "缺少刷新会话");
    sendSession(response, await this.service.refresh(refreshToken, metadata(request)));
  };
}
