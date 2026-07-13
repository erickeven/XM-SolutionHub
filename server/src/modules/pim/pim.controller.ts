import type { Request, Response } from "express";
import { sendSuccess } from "../../shared/http/api-response.js";
import type { PimService } from "./pim.service.js";
import { productCodeSchema, productSearchSchema } from "./pim.schema.js";

export class PimController {
  public constructor(private readonly service: PimService) {}

  public readonly search = async (request: Request, response: Response): Promise<void> => {
    const input = productSearchSchema.parse(request.query);
    sendSuccess(response, await this.service.search(input.q, input.limit));
  };

  public readonly detail = async (request: Request, response: Response): Promise<void> => {
    const input = productCodeSchema.parse(request.params);
    sendSuccess(response, await this.service.getProduct(input.productCode));
  };
}
