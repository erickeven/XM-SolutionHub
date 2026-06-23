import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { PutObjectOptions, SignedUrlOptions, StorageAdapter } from './types';
import { createStorageSignedUrl } from './signed-token';

export interface LocalStorageAdapterOptions {
  localDir: string;
}

export class LocalStorageAdapter implements StorageAdapter {
  private readonly localDir: string;

  constructor(options: LocalStorageAdapterOptions) {
    this.localDir = path.resolve(options.localDir);
  }

  private resolvePath(storageKey: string): string {
    const filePath = path.resolve(this.localDir, storageKey);
    if (!filePath.startsWith(`${this.localDir}${path.sep}`)) {
      throw new Error('Invalid storage key');
    }
    return filePath;
  }

  async getObject(storageKey: string): Promise<Buffer> {
    const filePath = this.resolvePath(storageKey);
    return fs.readFile(filePath);
  }

  async putObject(options: PutObjectOptions): Promise<void> {
    const filePath = this.resolvePath(options.storageKey);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, options.body);
  }

  async createSignedUrl(options: SignedUrlOptions): Promise<string> {
    return createStorageSignedUrl(options);
  }

  async removeObject(storageKey: string): Promise<void> {
    const filePath = this.resolvePath(storageKey);
    await fs.unlink(filePath);
  }
}
