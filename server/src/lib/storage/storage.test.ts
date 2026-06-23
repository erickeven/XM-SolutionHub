import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { LocalStorageAdapter } from './local.adapter';

const tmpDir = path.resolve('./test-uploads-tmp');

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    adapter = new LocalStorageAdapter({ localDir: tmpDir });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('putObject writes file to local dir', async () => {
    const body = Buffer.from('hello world');
    await adapter.putObject({
      storageKey: 'sub/dir/test.txt',
      body,
      contentType: 'text/plain',
    });
    const content = await fs.readFile(path.join(tmpDir, 'sub/dir/test.txt'));
    expect(content.toString()).toBe('hello world');
  });

  it('createSignedUrl returns a URL string', async () => {
    const url = await adapter.createSignedUrl({
      storageKey: 'test.txt',
      expiresInSeconds: 600,
      disposition: 'inline',
    });
    expect(typeof url).toBe('string');
    expect(url).toContain('test.txt');
    expect(url).toContain('expires=');
  });

  it('removeObject deletes the file', async () => {
    await adapter.putObject({
      storageKey: 'to-delete.txt',
      body: Buffer.from('bye'),
      contentType: 'text/plain',
    });
    await adapter.removeObject('to-delete.txt');
    await expect(fs.access(path.join(tmpDir, 'to-delete.txt'))).rejects.toThrow();
  });

  it('removeObject on non-existent key throws error', async () => {
    await expect(adapter.removeObject('no-such-file.txt')).rejects.toThrow();
  });
});