import { Writable } from 'node:stream';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { LOG_REDACT_PATHS } from './logger';

describe('logger redaction', () => {
  it('removes authorization, cookie, csrf and response cookies', () => {
    let output = '';
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    const testLogger = pino(
      { redact: { paths: LOG_REDACT_PATHS, censor: '[REDACTED]' } },
      destination,
    );

    testLogger.info({
      req: {
        headers: {
          authorization: 'Bearer secret-access-token',
          cookie: 'refreshToken=secret-refresh-token',
          'x-csrf-token': 'secret-csrf-token',
        },
      },
      res: { headers: { 'set-cookie': ['refreshToken=rotated-secret'] } },
    });

    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('secret-access-token');
    expect(output).not.toContain('secret-refresh-token');
    expect(output).not.toContain('secret-csrf-token');
    expect(output).not.toContain('rotated-secret');
  });
});
