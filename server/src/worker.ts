import "dotenv/config";
import { createClient } from "redis";
import { createPrismaClient } from "./shared/database/prisma.js";
import { parseEnvironment } from "./shared/config/env.js";
import { S3ObjectStorageAdapter } from "./adapters/s3-object-storage.adapter.js";
import { PrismaPreviewProcessingRepository } from "./modules/solution-assets/prisma-preview-processing.repository.js";
import { PreviewProcessingService } from "./modules/solution-assets/preview-processing.service.js";

const environment = parseEnvironment(process.env);
const prisma = createPrismaClient(environment.DATABASE_URL);
const redis = createClient({ url: environment.REDIS_URL });
const storage = new S3ObjectStorageAdapter({
  endPoint: environment.S3_ENDPOINT,
  port: environment.S3_PORT,
  useSSL: environment.S3_USE_SSL,
  accessKey: environment.S3_ACCESS_KEY,
  secretKey: environment.S3_SECRET_KEY,
  bucket: environment.S3_BUCKET
});
const previewProcessing = new PreviewProcessingService(
  new PrismaPreviewProcessingRepository(prisma),
  storage
);
let stopping = false;

function documentVersionId(payload: unknown): string | null {
  return typeof payload === "object" && payload !== null && "documentVersionId" in payload &&
    typeof payload.documentVersionId === "string"
    ? payload.documentVersionId
    : null;
}

async function processOutboxBatch(): Promise<void> {
  const events = await prisma.outboxEvent.findMany({
    where: { processedAt: null, availableAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: 20
  });
  for (const event of events) {
    try {
      if (event.eventType === "document.preview.requested") {
        const versionId = documentVersionId(event.payload);
        if (versionId === null) throw new Error("OUTBOX_DOCUMENT_VERSION_ID_MISSING");
        await previewProcessing.process(versionId);
      }
      await redis.publish(`outbox:${event.eventType}`, JSON.stringify({ id: event.id, payload: event.payload }));
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date(), attempts: { increment: 1 }, lastError: null }
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "UNKNOWN_OUTBOX_ERROR";
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          attempts: { increment: 1 },
          lastError: message.slice(0, 2000),
          availableAt: new Date(Date.now() + 5_000)
        }
      });
    }
  }
}

async function run(): Promise<void> {
  await redis.connect();
  process.stdout.write(`${JSON.stringify({ level: "info", message: "WORKER_STARTED", service: "worker" })}\n`);
  while (!stopping) {
    await processOutboxBatch();
    await new Promise<void>((resolve) => setTimeout(resolve, 1_000));
  }
}

async function shutdown(signal: string): Promise<void> {
  stopping = true;
  process.stdout.write(`${JSON.stringify({ level: "info", message: "WORKER_STOPPING", signal, service: "worker" })}\n`);
  if (redis.isOpen) await redis.quit();
  await prisma.$disconnect();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
void run().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : "UNKNOWN_WORKER_ERROR";
  process.stderr.write(`${JSON.stringify({ level: "error", message, service: "worker" })}\n`);
  await shutdown("FATAL");
  process.exitCode = 1;
});
