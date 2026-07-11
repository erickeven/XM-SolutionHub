import helmet from 'helmet';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
});
