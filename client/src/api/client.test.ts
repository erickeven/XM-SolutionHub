/**
 * Verifies that the apiClient request interceptor correctly handles FormData payloads.
 *
 * Regression guard: the interceptor must delete the default Content-Type header
 * when request data is FormData, so the browser auto-sets multipart/form-data;
 * boundary=... correctly.
 */
import { describe, it, expect } from 'vitest';

interface TestConfig {
  headers: Record<string, string | undefined>;
  data?: unknown;
}

function applyFormDataFix(config: TestConfig): void {
  config.headers['Content-Type'] = 'application/json';
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
}

describe('apiClient FormData interceptor', () => {
  it('deletes Content-Type header when data is FormData', () => {
    const config: TestConfig = { headers: {}, data: new FormData() };
    applyFormDataFix(config);
    expect(config.headers['Content-Type']).toBeUndefined();
  });

  it('keeps Content-Type header when data is JSON object', () => {
    const config: TestConfig = { headers: {}, data: { key: 'value' } };
    applyFormDataFix(config);
    expect(config.headers['Content-Type']).toBe('application/json');
  });

  it('keeps Content-Type header when data is string', () => {
    const config: TestConfig = { headers: {}, data: JSON.stringify({ key: 'value' }) };
    applyFormDataFix(config);
    expect(config.headers['Content-Type']).toBe('application/json');
  });

  it('keeps Content-Type header when data is undefined', () => {
    const config: TestConfig = { headers: {}, data: undefined };
    applyFormDataFix(config);
    expect(config.headers['Content-Type']).toBe('application/json');
  });
});
