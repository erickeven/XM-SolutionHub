export interface SignedUrlOptions {
  storageKey: string;
  expiresInSeconds: number;
  disposition: 'inline' | 'attachment';
}

export interface PutObjectOptions {
  storageKey: string;
  body: Buffer | Uint8Array;
  contentType: string;
}

export interface StorageAdapter {
  getObject(storageKey: string): Promise<Buffer>;
  createSignedUrl(options: SignedUrlOptions): Promise<string>;
  putObject(options: PutObjectOptions): Promise<void>;
  removeObject(storageKey: string): Promise<void>;
}