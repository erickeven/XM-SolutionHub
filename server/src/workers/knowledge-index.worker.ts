import { randomUUID } from 'node:crypto';
import { env } from '../config';
import { logger } from '../lib/logger';
import redis from '../lib/redis';
import prisma from '../lib/prisma';
import { getStorageAdapter } from '../lib/storage';
import { extractTextFromPdf } from '../lib/pdf/extract-text';
import { chunkText } from '../lib/text/chunker';
import { embed, embedBatch, toVectorString } from '../lib/ai/embedding';
import { extractEventAndEntities } from '../lib/ai/extract';

const STREAM = 'knowledge:index';
const GROUP = 'knowledge-index-workers';
const CONSUMER = `worker-${process.pid}`;
const BLOCK_MS = 5000;

// ── Stream consumer group management ─────────────────────

async function ensureGroup(): Promise<void> {
  try {
    await redis.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM');
    logger.info({ stream: STREAM, group: GROUP }, 'Consumer group created');
  } catch (err: unknown) {
    // BUSYGROUP means group already exists — fine
    if (err instanceof Error && err.message.includes('BUSYGROUP')) {
      logger.debug('Consumer group already exists');
      return;
    }
    throw err;
  }
}

// ── Job processing ──────────────────────────────────────

async function processJob(jobId: string): Promise<void> {
  logger.info({ jobId }, 'Processing knowledge index job');

  // 1. Load job
  const job = await prisma.knowledgeIndexJob.findUnique({
    where: { id: jobId },
  });
  if (!job) {
    logger.warn({ jobId }, 'Job not found, skipping');
    return;
  }

  // 2. Set job status=PROCESSING
  await prisma.knowledgeIndexJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  const { docId, indexVersion } = job;

  // 3. Load KnowledgeDoc → get materialId
  const doc = await prisma.knowledgeDoc.findUnique({
    where: { id: docId },
  });
  if (!doc) {
    throw new Error(`KnowledgeDoc not found: ${docId}`);
  }

  // 4. Load Material → get storageKey
  const material = await prisma.material.findUnique({
    where: { id: doc.materialId },
  });
  if (!material) {
    throw new Error(`Material not found: ${doc.materialId}`);
  }

  // 5. Download file
  const storage = getStorageAdapter();
  const buffer = await storage.getObject(material.originalStorageKey);

  // 6. Extract text
  const { text, pages } = await extractTextFromPdf(buffer);
  logger.info({ docId, textLength: text.length, pageCount: pages.length }, 'Text extracted');

  // 7. Chunk text
  const chunks = chunkText(text, pages);
  logger.info({ docId, chunkCount: chunks.length }, 'Text chunked');

  // 8. Process each chunk (idempotent by contentHash)
  for (const chunk of chunks) {
    // Idempotency check: skip if chunk already exists for this doc+version+hash
    const existing = await prisma.knowledgeChunk.findUnique({
      where: {
        docId_indexVersion_contentHash: {
          docId,
          indexVersion,
          contentHash: chunk.contentHash,
        },
      },
    });
    if (existing) {
      logger.debug({ docId, contentHash: chunk.contentHash }, 'Chunk already exists, skipping');
      continue;
    }

    // 8a. Extract event + entities via LLM (graceful degradation)
    const { event, entities } = await extractEventAndEntities(chunk.content);

    // 8b. Embed chunk content
    const chunkEmbedding = await embed(chunk.content);

    // 8c. Embed event summary (if event extracted)
    const eventEmbedding = event ? await embed(event.summary) : null;

    // 8d. Embed each entity name
    const entityEmbeddings: Map<string, number[]> = new Map();
    if (entities.length > 0) {
      const embeddings = await embedBatch(entities.map((e) => e.name));
      entities.forEach((entity, i) => {
        entityEmbeddings.set(entity.name, embeddings[i]!);
      });
    }

    // 8e. Transaction: write chunk + event + entities + relations
    await prisma.$transaction(async (tx) => {
      const chunkId = randomUUID();

      // INSERT KnowledgeChunk with embedding via raw SQL
      await tx.$executeRaw`
        INSERT INTO "KnowledgeChunk" (id, "docId", "indexVersion", content, page, "contentHash", embedding)
        VALUES (${chunkId}, ${docId}, ${indexVersion}, ${chunk.content}, ${chunk.page}, ${chunk.contentHash}, ${toVectorString(chunkEmbedding)}::vector)
      `;

      // INSERT KnowledgeEvent (if event extracted)
      let eventId: string | null = null;
      if (event) {
        eventId = randomUUID();
        await tx.$executeRaw`
          INSERT INTO "KnowledgeEvent" (id, "chunkId", summary, "eventType", embedding, "createdAt")
          VALUES (${eventId}, ${chunkId}, ${event.summary}, ${event.eventType}, ${toVectorString(eventEmbedding!)}::vector, NOW())
        `;
      }

      // INSERT KnowledgeEntity (upsert by normalizedName) + KnowledgeEventEntity
      for (const entity of entities) {
        const normalizedName = entity.name.toLowerCase().trim();
        const entityEmbedding = entityEmbeddings.get(entity.name);
        if (!entityEmbedding) continue;

        // Upsert entity — create if not exists, return id
        const proposedEntityId = randomUUID();
        const persistedEntities = await tx.$queryRaw<{ id: string }[]>`
          INSERT INTO "KnowledgeEntity" (id, name, "normalizedName", "entityType", embedding, "createdAt")
          VALUES (${proposedEntityId}, ${entity.name}, ${normalizedName}, ${entity.entityType}, ${toVectorString(entityEmbedding)}::vector, NOW())
          ON CONFLICT ("normalizedName") DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `;
        const persistedEntityId = persistedEntities[0]?.id;
        if (!persistedEntityId) {
          throw new Error(`Entity upsert returned no id: ${normalizedName}`);
        }

        // Link event to entity (if event exists)
        if (eventId) {
          await tx.$executeRaw`
            INSERT INTO "KnowledgeEventEntity" (id, "eventId", "entityId", role)
            VALUES (${randomUUID()}, ${eventId}, ${persistedEntityId}, ${entity.role})
            ON CONFLICT ("eventId", "entityId", role) DO NOTHING
          `;
        }
      }
    });
  }

  // 9. Completeness check
  const chunkCount = await prisma.knowledgeChunk.count({
    where: { docId, indexVersion },
  });
  const eventCount = await prisma.knowledgeEvent.count({
    where: { chunk: { docId, indexVersion } },
  });
  if (chunkCount !== chunks.length || eventCount !== chunks.length) {
    throw new Error(
      `Completeness check failed: expected ${chunks.length} chunks/events, found ${chunkCount} chunks and ${eventCount} events`,
    );
  }
  logger.info({ docId, chunkCount, eventCount }, 'Completeness check passed');

  // 10. Atomic switch: update KnowledgeDoc status=READY, indexVersion, indexedAt
  await prisma.knowledgeDoc.update({
    where: { id: docId },
    data: {
      status: 'READY',
      indexVersion,
      indexedAt: new Date(),
      errorMessage: null,
    },
  });

  // 11. Update job status=SUCCEEDED
  await prisma.knowledgeIndexJob.update({
    where: { id: jobId },
    data: { status: 'SUCCEEDED', finishedAt: new Date() },
  });

  logger.info({ jobId, docId, indexVersion }, 'Job completed successfully');
}

// ── Retry / failure handling ────────────────────────────

async function handleJobFailure(jobId: string, error: unknown): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error({ jobId, err: errorMessage }, 'Job failed');

  const job = await prisma.knowledgeIndexJob.findUnique({
    where: { id: jobId },
  });
  if (!job) return;

  const newAttempts = job.attempts + 1;
  const maxRetries = env.INDEX_JOB_MAX_RETRIES;

  if (newAttempts < maxRetries) {
    // Re-queue: push jobId back to stream
    await redis.xadd(STREAM, '*', 'jobId', jobId);
    await prisma.knowledgeIndexJob.update({
      where: { id: jobId },
      data: { attempts: newAttempts, errorMessage },
    });
    logger.info({ jobId, attempts: newAttempts }, 'Job re-queued for retry');
  } else {
    // Max retries reached → FAILED
    await prisma.knowledgeIndexJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        attempts: newAttempts,
        errorMessage,
        finishedAt: new Date(),
      },
    });

    // Also mark doc as FAILED
    await prisma.knowledgeDoc.updateMany({
      where: { id: job.docId },
      data: { status: 'FAILED', errorMessage },
    });

    logger.error({ jobId, attempts: newAttempts }, 'Job permanently failed');
  }
}

// ── Main worker loop ────────────────────────────────────

// XREADGROUP returns: [streamName, [messageId, fields[]][]][] | null
type StreamMessages = [string, [string, string[]][]][] | null;

async function processMessages(): Promise<number> {
  // Read new messages for this consumer
  const raw = await redis.xreadgroup(
    'GROUP', GROUP, CONSUMER,
    'COUNT', 10,
    'STREAMS', STREAM, '>',
  );

  const messages = raw as unknown as StreamMessages;
  if (!messages || messages.length === 0) return 0;

  let processed = 0;
  for (const [, entries] of messages) {
    for (const [messageId, fields] of entries) {
      const jobIdIndex = fields.indexOf('jobId');
      const jobId = jobIdIndex >= 0 ? fields[jobIdIndex + 1] : undefined;
      if (!jobId) {
        logger.warn({ messageId }, 'Message missing jobId field, acking');
        await redis.xack(STREAM, GROUP, messageId);
        continue;
      }

      try {
        await processJob(jobId);
        await redis.xack(STREAM, GROUP, messageId);
        processed++;
      } catch (err) {
        await handleJobFailure(jobId, err);
        // Ack the message — retry is handled by re-queuing
        await redis.xack(STREAM, GROUP, messageId);
        processed++;
      }
    }
  }

  return processed;
}

export async function startKnowledgeIndexWorker(): Promise<void> {
  logger.info({ consumer: CONSUMER }, 'Starting knowledge index worker');

  await ensureGroup();

  // Main loop
  for (;;) {
    try {
      const processed = await processMessages();
      if (processed === 0) {
        // No messages available — blocking read
        await new Promise((resolve) => setTimeout(resolve, BLOCK_MS));
      }
    } catch (err) {
      logger.error({ err }, 'Worker loop error, retrying in 5s');
      await new Promise((resolve) => setTimeout(resolve, BLOCK_MS));
    }
  }
}

// ── Entry point ─────────────────────────────────────────

if (require.main === module) {
  startKnowledgeIndexWorker().catch((err) => {
    logger.error({ err }, 'Fatal worker error');
    process.exit(1);
  });
}
