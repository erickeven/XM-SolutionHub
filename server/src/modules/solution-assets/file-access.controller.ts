import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { getRequestAccessSubject } from "../iam/authentication.middleware.js";
import { verifyAccessToken } from "../../shared/security/signed-token.js";
import { sendSuccess } from "../../shared/http/api-response.js";
import type { FileAccessService } from "./file-access.service.js";

const issueSchema = z.object({ action: z.enum(["PREVIEW", "DOWNLOAD"]) });
const documentCodeSchema = z.object({ documentCode: z.string().trim().min(1).max(100) });
const tokenSchema = z.object({ token: z.string().min(40).max(100) });

export class FileAccessController {
  public constructor(private readonly service: FileAccessService, private readonly accessTokenSecret: string) {}

  public readonly issue = async (request: Request, response: Response): Promise<void> => {
    const { documentCode } = documentCodeSchema.parse(request.params);
    const { action } = issueSchema.parse(request.body);
    const authorization = request.header("authorization");
    const payload = authorization?.startsWith("Bearer ") === true
      ? verifyAccessToken(authorization.slice(7), this.accessTokenSecret)
      : null;
    sendSuccess(
      response,
      await this.service.issue(documentCode, action, getRequestAccessSubject(request), payload?.sub ?? null)
    );
  };

  public readonly stream = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const { token } = tokenSchema.parse(request.params);
    const file = await this.service.resolve(token);
    response.setHeader("content-type", file.mimeType);
    response.setHeader("cache-control", "private, no-store");
    response.setHeader(
      "content-disposition",
      `${file.download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.filename)}`
    );
    file.stream.once("error", next);
    file.stream.pipe(response);
  };
}
