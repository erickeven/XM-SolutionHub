import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
  S3_ENDPOINT: z.string().min(1).default("127.0.0.1"),
  S3_PORT: z.coerce.number().int().min(1).max(65535).default(8333),
  S3_USE_SSL: booleanFromString.default(false),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(3).default("xinmaowei-files"),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  FILE_TOKEN_SECRET: z.string().min(32)
});

export type AppEnvironment = z.infer<typeof envSchema>;

export function parseEnvironment(source: NodeJS.ProcessEnv): AppEnvironment {
  return envSchema.parse(source);
}
