import { config } from '../../config';
import { LocalStorageAdapter } from './local.adapter';
import { MinioStorageAdapter } from './minio.adapter';
import type { StorageAdapter } from './types';

let adapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (adapter) return adapter;
  if (config.storageDriver === 'minio') {
    adapter = new MinioStorageAdapter({
      endpoint: config.minioEndpoint ?? 'localhost',
      port: config.minioPort,
      accessKey: config.minioAccessKey ?? '',
      secretKey: config.minioSecretKey ?? '',
      bucket: config.storageBucket,
      useSSL: config.minioUseSSL,
    });
  } else {
    adapter = new LocalStorageAdapter({ localDir: config.storageLocalDir });
  }
  return adapter;
}

export type { StorageAdapter, SignedUrlOptions, PutObjectOptions } from './types';
export { LocalStorageAdapter } from './local.adapter';
export { MinioStorageAdapter } from './minio.adapter';