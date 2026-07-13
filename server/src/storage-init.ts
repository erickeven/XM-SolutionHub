import "dotenv/config";
import { Client } from "minio";
import { z } from "zod";

const environment = z.object({
  S3_ENDPOINT: z.string().min(1),
  S3_PORT: z.coerce.number().int().min(1).max(65535),
  S3_USE_SSL: z.enum(["true", "false"]).transform((value) => value === "true"),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(3)
}).parse(process.env);

const client = new Client({
  endPoint: environment.S3_ENDPOINT,
  port: environment.S3_PORT,
  useSSL: environment.S3_USE_SSL,
  accessKey: environment.S3_ACCESS_KEY,
  secretKey: environment.S3_SECRET_KEY
});

async function initializeStorage(): Promise<void> {
  if (!(await client.bucketExists(environment.S3_BUCKET))) {
    await client.makeBucket(environment.S3_BUCKET);
  }
  await client.setBucketVersioning(environment.S3_BUCKET, { Status: "Enabled" });
  const versioning = await client.getBucketVersioning(environment.S3_BUCKET);
  if (versioning.Status !== "Enabled") {
    throw new Error("S3_VERSIONING_NOT_ENABLED");
  }
  process.stdout.write("S3_STORAGE_INITIALIZED\n");
}

void initializeStorage().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "S3_STORAGE_INIT_FAILED";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
