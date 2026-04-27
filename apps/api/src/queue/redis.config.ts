import { ConnectionOptions } from 'bullmq';

export const getRedisConnection = (): ConnectionOptions => {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    const parsed = new URL(url);
    const isTls = parsed.protocol === 'rediss:';
    
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || (isTls ? 6380 : 6379),
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
      maxRetriesPerRequest: null,
    };
  } catch (e) {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
};
