import type { Request, Response } from "express";
import { sendSuccess } from "../../shared/http/api-response.js";
import { solutionCodeSchema, solutionSearchSchema } from "./solution-assets.schema.js";
import type { SolutionAssetsService } from "./solution-assets.service.js";

export class SolutionAssetsController {
  public constructor(private readonly service: SolutionAssetsService) {}

  public readonly search = async (request: Request, response: Response): Promise<void> => {
    const input = solutionSearchSchema.parse(request.query);
    sendSuccess(response, await this.service.search(input.q, input.limit));
  };

  public readonly detail = async (request: Request, response: Response): Promise<void> => {
    const input = solutionCodeSchema.parse(request.params);
    sendSuccess(response, await this.service.getSolution(input.solutionCode));
  };
}
