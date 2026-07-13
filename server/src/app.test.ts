import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { PimController } from "./modules/pim/pim.controller.js";
import type { PimRepository } from "./modules/pim/pim.repository.js";
import { PimService } from "./modules/pim/pim.service.js";
import type { SolutionAssetsRepository } from "./modules/solution-assets/solution-assets.repository.js";
import { SolutionAssetsController } from "./modules/solution-assets/solution-assets.controller.js";
import { SolutionAssetsService } from "./modules/solution-assets/solution-assets.service.js";
import { createApp } from "./app.js";
import { DocumentsController } from "./modules/solution-assets/documents.controller.js";
import type { DocumentsRepository } from "./modules/solution-assets/documents.repository.js";
import { DocumentsService } from "./modules/solution-assets/documents.service.js";
import { SelectionController } from "./modules/selection/selection.controller.js";
import { SelectionService } from "./modules/selection/selection.service.js";
import type { SelectionRepository } from "./modules/selection/selection.types.js";
import { IamController } from "./modules/iam/iam.controller.js";
import type { IamRepository } from "./modules/iam/iam.repository.js";
import { IamService } from "./modules/iam/iam.service.js";
import { FileAccessController } from "./modules/solution-assets/file-access.controller.js";
import type { FileAccessRepository } from "./modules/solution-assets/file-access.repository.js";
import { FileAccessService } from "./modules/solution-assets/file-access.service.js";
import type { ObjectStorageAdapter } from "./adapters/object-storage.adapter.js";
import { Readable } from "node:stream";
import { ContentConfigController } from "./modules/content-config/content-config.controller.js";
import type { ContentConfigRepository } from "./modules/content-config/content-config.repository.js";
import { ContentConfigService } from "./modules/content-config/content-config.service.js";
import type { FieldDefinitionsRepository } from "./modules/content-config/field-definitions.repository.js";
import { FieldDefinitionsService } from "./modules/content-config/field-definitions.service.js";
import { ProjectSupportController } from "./modules/project-support/project-support.controller.js";
import type { ProjectSupportRepository } from "./modules/project-support/project-support.repository.js";
import { ProjectSupportService } from "./modules/project-support/project-support.service.js";
import { SupplyQualityController } from "./modules/supply-quality/supply-quality.controller.js";
import type { SupplyQualityRepository } from "./modules/supply-quality/supply-quality.repository.js";
import { SupplyQualityService } from "./modules/supply-quality/supply-quality.service.js";
import { AdminCatalogController } from "./modules/pim/admin-catalog.controller.js";
import type { AdminCatalogRepository } from "./modules/pim/admin-catalog.repository.js";
import { AdminCatalogService } from "./modules/pim/admin-catalog.service.js";

function createTestApp() {
  const pimRepository: PimRepository = {
    searchPublishedProducts: vi.fn().mockResolvedValue([
      {
        productCode: "XMW-001",
        name: "高压电源控制器",
        summary: "受控产品摘要",
        familyName: "电源管理",
        orderableSkus: ["XMW-001-A"]
      }
    ]),
    findPublishedProductByCode: vi.fn().mockResolvedValue(null)
  };
  const solutionRepository: SolutionAssetsRepository = {
    searchPublishedSolutions: vi.fn().mockResolvedValue([]),
    findPublishedSolutionByCode: vi.fn().mockResolvedValue(null)
  };
  const documentsRepository: DocumentsRepository = {
    searchPublishedDocuments: vi.fn().mockResolvedValue([]),
    findPublishedDocument: vi.fn().mockResolvedValue(null)
  };
  const selectionRepository: SelectionRepository = {
    findPublishedCandidates: vi.fn().mockResolvedValue([])
  };
  const iamRepository: IamRepository = {
    findAuthenticationSubject: vi.fn().mockResolvedValue(null),
    createCustomer: vi.fn(),
    createRefreshSession: vi.fn(),
    findRefreshSubject: vi.fn().mockResolvedValue(null),
    rotateRefreshSession: vi.fn()
  };
  const fileAccessRepository: FileAccessRepository = {
    findPublishedResource: vi.fn().mockResolvedValue(null),
    createToken: vi.fn(),
    resolveToken: vi.fn().mockResolvedValue(null)
  };
  const objectStorage: ObjectStorageAdapter = {
    getObject: vi.fn().mockResolvedValue(Readable.from([])),
    putObject: vi.fn()
  };
  const contentConfigRepository: ContentConfigRepository = {
    list: vi.fn().mockResolvedValue([]),
    nextVersion: vi.fn().mockResolvedValue(1),
    createDraft: vi.fn(),
    publish: vi.fn().mockResolvedValue(null),
    findByVersion: vi.fn().mockResolvedValue(null)
  };
  const fieldDefinitionsRepository: FieldDefinitionsRepository = {
    list: vi.fn().mockResolvedValue([]),
    upsertInDraft: vi.fn().mockResolvedValue(null)
  };
  const projectSupportRepository: ProjectSupportRepository = {
    workspace: vi.fn().mockResolvedValue({ organizations: [], projects: [], tickets: [], sampleRequests: [], rfqRequests: [] }),
    createOrganization: vi.fn(),
    createProject: vi.fn().mockResolvedValue(null),
    createTicket: vi.fn().mockResolvedValue(null),
    createSampleRequest: vi.fn().mockResolvedValue(null),
    createRfqRequest: vi.fn().mockResolvedValue(null)
  };
  const supplyQualityRepository: SupplyQualityRepository = {
    workbench: vi.fn().mockResolvedValue({ roles: [], supportTickets: [], sampleRequests: [], rfqRequests: [], qualityEvents: [], verificationTasks: [] }),
    assignSupportTicket: vi.fn().mockResolvedValue(null),
    resolveSupportTicket: vi.fn().mockResolvedValue(null)
  };
  const adminCatalogRepository: AdminCatalogRepository = {
    publishedFieldDefinitions: vi.fn().mockResolvedValue([]),
    createProduct: vi.fn().mockResolvedValue(null),
    publishProduct: vi.fn().mockResolvedValue(null),
    createSolution: vi.fn().mockResolvedValue(null),
    publishSolution: vi.fn().mockResolvedValue(null),
    createDocumentVersion: vi.fn().mockResolvedValue(null),
    publishDocument: vi.fn().mockResolvedValue(null),
    linkProductDocument: vi.fn().mockResolvedValue(null),
    linkSolutionDocument: vi.fn().mockResolvedValue(null)
  };
  return createApp({
    pimController: new PimController(new PimService(pimRepository)),
    solutionAssetsController: new SolutionAssetsController(new SolutionAssetsService(solutionRepository)),
    documentsController: new DocumentsController(new DocumentsService(documentsRepository)),
    selectionController: new SelectionController(new SelectionService(selectionRepository)),
    iamController: new IamController(
      new IamService(iamRepository, "test-access-token-secret-with-32-characters")
    ),
    authenticationMiddleware: (_request, _response, next) => next(),
    fileAccessController: new FileAccessController(
      new FileAccessService(fileAccessRepository, objectStorage),
      "test-access-token-secret-with-32-characters"
    ),
    contentConfigController: new ContentConfigController(
      new ContentConfigService(contentConfigRepository),
      new FieldDefinitionsService(fieldDefinitionsRepository)
    ),
    projectSupportController: new ProjectSupportController(new ProjectSupportService(projectSupportRepository)),
    supplyQualityController: new SupplyQualityController(new SupplyQualityService(supplyQualityRepository)),
    adminCatalogController: new AdminCatalogController(
      new AdminCatalogService(adminCatalogRepository, objectStorage)
    )
  });
}

describe("API", () => {
  it("使用统一成功响应并返回 trace id", async () => {
    const response = await request(createTestApp()).get("/api/v1/products?q=XMW").expect(200);
    expect(response.headers["x-trace-id"]).toBeTypeOf("string");
    expect(response.body).toMatchObject({ code: 0, message: "OK" });
  });

  it("校验非法分页参数", async () => {
    const response = await request(createTestApp()).get("/api/v1/products?limit=500").expect(400);
    expect(response.body).toMatchObject({ code: 40001 });
  });

  it("隐藏未发布或不存在产品", async () => {
    const response = await request(createTestApp()).get("/api/v1/products/DRAFT-1").expect(404);
    expect(response.body).toMatchObject({ code: 40410 });
  });
});
