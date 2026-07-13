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

async function assertEmptyStorage(): Promise<void> {
  let objectCount = 0;
  const stream = client.listObjects(environment.S3_BUCKET, "", true);
  await new Promise<void>((resolve, reject) => {
    stream.on("data", () => {
      objectCount += 1;
    });
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  if (objectCount !== 0) throw new Error(`S3_STORAGE_NOT_EMPTY:${objectCount}`);
  process.stdout.write("S3_BUSINESS_OBJECTS=0\n");
}

void assertEmptyStorage().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "S3_STORAGE_EMPTY_CHECK_FAILED";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
