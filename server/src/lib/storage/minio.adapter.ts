import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import type { PutObjectOptions, SignedUrlOptions, StorageAdapter } from './types';

export interface MinioStorageAdapterOptions {
  endpoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  bucket: string;
  useSSL: boolean;
}

export class MinioStorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: MinioStorageAdapterOptions) {
    this.bucket = options.bucket;
    const protocol = options.useSSL ? 'https' : 'http';
    this.client = new S3Client({
      endpoint: `${protocol}://${options.endpoint}:${options.port}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: options.accessKey,
        secretAccessKey: options.secretKey,
      },
      forcePathStyle: true,
    });
  }

  async getObject(storageKey: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });
    const response = await this.client.send(command);
    const body = response.Body;
    if (!body) throw new Error(`Empty response body for key: ${storageKey}`);
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async putObject(options: PutObjectOptions): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: options.storageKey,
      Body: options.body,
      ContentType: options.contentType,
    });
    await this.client.send(command);
  }

  async createSignedUrl(options: SignedUrlOptions): Promise<string> {
    // ponytail: @aws-sdk/s3-request-presigner not installed (locked deps),
    // return proxy URL — real presigning added when presigner package available
    const expiresAt = Math.floor(Date.now() / 1000) + options.expiresInSeconds;
    const encodedKey = encodeURIComponent(options.storageKey);
    return `http://localhost:3000/api/v1/files/${encodedKey}?expires=${expiresAt}`;
  }

  async removeObject(storageKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });
    await this.client.send(command);
  }
}