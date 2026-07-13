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

async function readObject(objectKey: string, versionId?: string): Promise<Buffer> {
  const stream = await client.getObject(
    environment.S3_BUCKET,
    objectKey,
    versionId === undefined ? undefined : { versionId }
  );
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    const value: unknown = chunk;
    if (Buffer.isBuffer(value)) {
      chunks.push(Buffer.from(value));
    } else if (value instanceof Uint8Array || typeof value === "string") {
      chunks.push(Buffer.from(value));
    } else {
      throw new Error("S3_OBJECT_STREAM_CHUNK_INVALID");
    }
  }
  return Buffer.concat(chunks);
}

async function verifyVersionRestore(): Promise<void> {
  const objectKey = `operations/version-restore-${Date.now()}.txt`;
  await client.putObject(environment.S3_BUCKET, objectKey, Buffer.from("v1"), 2);
  const v2 = await client.putObject(environment.S3_BUCKET, objectKey, Buffer.from("v2"), 2);
  if (v2.versionId === null) throw new Error("S3_VERSION_ID_MISSING");
  await client.removeObject(environment.S3_BUCKET, objectKey);
  const prior = await readObject(objectKey, v2.versionId);
  if (prior.toString("utf8") !== "v2") throw new Error("S3_PRIOR_VERSION_READ_FAILED");
  await client.putObject(environment.S3_BUCKET, objectKey, prior, prior.length);
  const restored = await readObject(objectKey);
  if (restored.toString("utf8") !== "v2") throw new Error("S3_VERSION_RESTORE_FAILED");
  process.stdout.write("S3_VERSION_RESTORE=PASSED\n");
}

void verifyVersionRestore().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "S3_VERSION_RESTORE_FAILED";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
