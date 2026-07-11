import Redis from 'ioredis';

// Read the URL directly to avoid a circular dependency through the config exports.
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default redis;
