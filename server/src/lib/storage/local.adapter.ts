import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { PutObjectOptions, SignedUrlOptions, StorageAdapter } from './types';

export interface LocalStorageAdapterOptions {
  localDir: string;
}

export class LocalStorageAdapter implements StorageAdapter {
  private readonly localDir: string;

  constructor(options: LocalStorageAdapterOptions) {
    this.localDir = options.localDir;
  }

  async getObject(storageKey: string): Promise<Buffer> {
    const filePath = path.join(this.localDir, storageKey);
    return fs.readFile(filePath);
  }

  async putObject(options: PutObjectOptions): Promise<void> {
    const filePath = path.join(this.localDir, options.storageKey);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, options.body);
  }

  async createSignedUrl(options: SignedUrlOptions): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + options.expiresInSeconds;
    const encodedKey = encodeURIComponent(options.storageKey);
    // ponytail: local dev URL, not a real signed URL — no HMAC in dev
    return `http://localhost:3000/api/v1/files/${encodedKey}?expires=${expiresAt}`;
  }

  async removeObject(storageKey: string): Promise<void> {
    const filePath = path.join(this.localDir, storageKey);
    await fs.unlink(filePath);
  }
}