import Redis from 'ioredis';

// ponytail: read env directly to avoid circular dependency when config re-exports redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default redis;