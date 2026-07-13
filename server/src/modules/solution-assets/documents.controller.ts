import type { Request, Response } from "express";
import { sendSuccess } from "../../shared/http/api-response.js";
import type { DocumentsService } from "./documents.service.js";
import { z } from "zod";
import { getRequestAccessSubject } from "../iam/authentication.middleware.js";

const searchSchema = z.object({
  q: z.string().trim().max(120).default(""),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});
const codeSchema = z.object({ documentCode: z.string().trim().min(1).max(100) });

export class DocumentsController {
  public constructor(private readonly service: DocumentsService) {}

  public readonly search = async (request: Request, response: Response): Promise<void> => {
    const input = searchSchema.parse(request.query);
    sendSuccess(response, await this.service.search(input.q, input.limit));
  };

  public readonly previewPolicy = async (request: Request, response: Response): Promise<void> => {
    const input = codeSchema.parse(request.params);
    sendSuccess(response, await this.service.previewPolicy(input.documentCode, getRequestAccessSubject(request)));
  };
}
