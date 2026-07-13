import { Client } from "minio";
import type { ObjectStorageAdapter } from "./object-storage.adapter.js";

export interface S3ObjectStorageOptions {
  readonly endPoint: string;
  readonly port: number;
  readonly useSSL: boolean;
  readonly accessKey: string;
  readonly secretKey: string;
  readonly bucket: string;
}

export class S3ObjectStorageAdapter implements ObjectStorageAdapter {
  private readonly client: Client;

  public constructor(private readonly options: S3ObjectStorageOptions) {
    this.client = new Client(options);
  }

  public getObject(objectKey: string) {
    return this.client.getObject(this.options.bucket, objectKey);
  }

  public async putObject(objectKey: string, content: Buffer, contentType: string): Promise<void> {
    await this.client.putObject(this.options.bucket, objectKey, content, content.length, {
      "content-type": contentType
    });
  }
}
