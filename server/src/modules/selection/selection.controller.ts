import type { Request, Response } from "express";
import { z } from "zod";
import { sendSuccess } from "../../shared/http/api-response.js";
import type { SelectionService } from "./selection.service.js";

const selectionSchema = z.object({
  application: z.string().trim().min(1).max(160),
  keywords: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  limit: z.number().int().min(1).max(20).default(8)
});

export class SelectionController {
  public constructor(private readonly service: SelectionService) {}

  public readonly match = async (request: Request, response: Response): Promise<void> => {
    const input = selectionSchema.parse(request.body);
    sendSuccess(response, await this.service.match(input.application, input.keywords, input.limit));
  };
}
