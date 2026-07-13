import type { Readable } from "node:stream";

export interface ObjectStorageAdapter {
  getObject(objectKey: string): Promise<Readable>;
  putObject(objectKey: string, content: Buffer, contentType: string): Promise<void>;
}
