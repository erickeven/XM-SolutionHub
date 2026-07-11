import pino from 'pino';

export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.tokenHash',
  '*.refreshToken',
  '*.accessToken',
  '*.apiKey',
  '*.secret',
];

// Keep plain JSON output because pino-pretty is not a project dependency.
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  redact: {
    paths: LOG_REDACT_PATHS,
    censor: '[REDACTED]',
  },
});
