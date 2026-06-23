import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '../errors';
import type { SignedUrlOptions } from './types';

type StorageTokenPayload = {
  key: string;
  expiresAt: number;
  disposition: 'inline' | 'attachment';
};

const DEVELOPMENT_SECRET = 'development-storage-signing-secret-change-me';

function getSigningSecret(): string {
  const secret = process.env.STORAGE_SIGNING_SECRET ?? DEVELOPMENT_SECRET;
  if (process.env.NODE_ENV === 'production' && secret === DEVELOPMENT_SECRET) {
    throw new Error('STORAGE_SIGNING_SECRET must be configured in production');
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('base64url');
}

export function createStorageSignedUrl(options: SignedUrlOptions): string {
  const payload: StorageTokenPayload = {
    key: options.storageKey,
    expiresAt: Math.floor(Date.now() / 1000) + options.expiresInSeconds,
    disposition: options.disposition,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `/api/v1/files/${encoded}.${sign(encoded)}`;
}

export function verifyStorageToken(token: string): StorageTokenPayload {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) {
    throw new AppError(2003, 'Invalid file token', 403);
  }

  const encoded = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = sign(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new AppError(2003, 'Invalid file token', 403);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw new AppError(2003, 'Invalid file token', 403);
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('key' in payload) ||
    typeof payload.key !== 'string' ||
    !('expiresAt' in payload) ||
    typeof payload.expiresAt !== 'number' ||
    !('disposition' in payload) ||
    (payload.disposition !== 'inline' && payload.disposition !== 'attachment')
  ) {
    throw new AppError(2003, 'Invalid file token', 403);
  }

  if (payload.expiresAt < Math.floor(Date.now() / 1000)) {
    throw new AppError(2003, 'File token expired', 403);
  }

  return payload as StorageTokenPayload;
}
