import { z } from 'zod';
import { logger } from '../lib/logger';

const DEVELOPMENT_STORAGE_SIGNING_SECRET =
  'development-storage-signing-secret-change-me';

const envBoolean = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  COOKIE_SECURE: envBoolean.optional(),
  PORT: z.coerce.number().default(3000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  PGVECTOR_ENABLED: envBoolean.default(true),
  KNOWLEDGE_SEARCH_MODE: z.enum(['fast', 'standard']).default('fast'),
  KNOWLEDGE_INDEX_VERSION: z.string().default('v1'),
  KNOWLEDGE_SCORE_THRESHOLD: z.coerce.number().default(0.72),
  INDEX_JOB_MAX_RETRIES: z.coerce.number().default(3),
  SSE_HEARTBEAT_MS: z.coerce.number().default(15000),
  RERANK_PROVIDER: z.string().default('openai-compatible'),
  RERANK_BASE_URL: z.string().optional(),
  RERANK_API_KEY: z.string().optional(),
  RERANK_MODEL: z.string().default('your-model-name'),
  STORAGE_DRIVER: z.enum(['local', 'minio']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./uploads'),
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_USE_SSL: envBoolean.default(false),
  MINIO_BUCKET: z.string().default('xinmaowei'),
  STORAGE_SIGNING_SECRET: z
    .string()
    .min(32)
    .default(DEVELOPMENT_STORAGE_SIGNING_SECRET),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  CSRF_SECRET: z.string(),
  LLM_PROVIDER: z.string().default('openai-compatible'),
  LLM_BASE_URL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('your-model-name'),
  EMBEDDING_PROVIDER: z.string().default('openai-compatible'),
  EMBEDDING_BASE_URL: z.string().optional(),
  EMBEDDING_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('your-model-name'),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@example.com'),
  SEED_ADMIN_PASSWORD: z.string(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

if (
  parsed.data.NODE_ENV === 'production' &&
  parsed.data.STORAGE_SIGNING_SECRET === DEVELOPMENT_STORAGE_SIGNING_SECRET
) {
  throw new Error('STORAGE_SIGNING_SECRET must be configured in production');
}

export const env = parsed.data;

export { logger };
export { default as redis } from '../lib/redis';

export const config = {
  ...parsed.data,
  logger,
  // camelCase aliases for storage config
  storageDriver: parsed.data.STORAGE_DRIVER,
  storageLocalDir: parsed.data.STORAGE_LOCAL_DIR,
  storageBucket: parsed.data.MINIO_BUCKET,
  minioEndpoint: parsed.data.MINIO_ENDPOINT,
  minioPort: parsed.data.MINIO_PORT,
  minioAccessKey: parsed.data.MINIO_ACCESS_KEY,
  minioSecretKey: parsed.data.MINIO_SECRET_KEY,
  minioUseSSL: parsed.data.MINIO_USE_SSL,
} as const;

export type AppConfig = typeof config;
