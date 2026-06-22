import pino from 'pino';

// ponytail: no pino-pretty transport (not in devDependencies), plain JSON output
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  redact: {
    paths: [
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.tokenHash',
      '*.refreshToken',
      '*.accessToken',
      '*.apiKey',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
});