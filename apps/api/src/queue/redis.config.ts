import { ConnectionOptions } from 'bullmq';

export const getRedisConnection = (): ConnectionOptions => {
  const url = process.env.REDIS_URL;
  
  if (!url) {
    // En producción esto lanzará un error claro si falta la configuración
    throw new Error('REDIS_URL is not defined. Please check your environment variables.');
  }
  
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
    console.error('Invalid REDIS_URL provided:', url);
    throw e;
  }
};
