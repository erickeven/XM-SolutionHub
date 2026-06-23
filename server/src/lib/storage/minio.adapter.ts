import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import type { PutObjectOptions, SignedUrlOptions, StorageAdapter } from './types';
import { createStorageSignedUrl } from './signed-token';

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
  private bucketReady: Promise<void> | null = null;

  constructor(options: MinioStorageAdapterOptions) {
    this.bucket = options.bucket;
    const protocol = options.useSSL ? 'https' : 'http';
    const endpoint = /^https?:\/\//.test(options.endpoint)
      ? options.endpoint
      : `${protocol}://${options.endpoint}:${options.port}`;
    this.client = new S3Client({
      endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: options.accessKey,
        secretAccessKey: options.secretKey,
      },
      forcePathStyle: true,
    });
  }

  private async ensureBucket(): Promise<void> {
    if (!this.bucketReady) {
      this.bucketReady = (async () => {
        try {
          await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
        } catch {
          await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        }
      })().catch((error: unknown) => {
        this.bucketReady = null;
        throw error;
      });
    }
    await this.bucketReady;
  }

  async getObject(storageKey: string): Promise<Buffer> {
    await this.ensureBucket();
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
    await this.ensureBucket();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: options.storageKey,
      Body: options.body,
      ContentType: options.contentType,
    });
    await this.client.send(command);
  }

  async createSignedUrl(options: SignedUrlOptions): Promise<string> {
    return createStorageSignedUrl(options);
  }

  async removeObject(storageKey: string): Promise<void> {
    await this.ensureBucket();
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });
    await this.client.send(command);
  }
}
