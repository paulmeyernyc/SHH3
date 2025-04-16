/**
 * Redis Helper Utility Module
 * 
 * Provides utility functions for Redis configuration.
 */

import { logger } from '../observability';

/**
 * Get the Redis URL from environment variables
 */
export function getRedisUrl(): string | undefined {
  // Check for Redis URL in different formats
  const redisUrl = process.env.REDIS_URL || 
                  process.env.REDISCLOUD_URL || 
                  process.env.REDISTOGO_URL;
  
  return redisUrl;
}

/**
 * Log Redis configuration details (with masked credentials)
 */
export function logRedisConfiguration(): void {
  const redisUrl = getRedisUrl();
  
  if (!redisUrl) {
    logger.info('Redis is not configured. Using memory cache only.');
    return;
  }
  
  try {
    // Mask password in Redis URL for logging
    const maskedUrl = redisUrl.replace(
      /(redis:\/\/[^:]*:)([^@]*)(@.*)/,
      '$1********$3'
    );
    
    logger.info('Redis is configured', { url: maskedUrl });
  } catch (error) {
    logger.warn('Unable to parse Redis URL', { 
      error: (error as Error).message 
    });
  }
}

/**
 * Parse Redis connection options from URL
 */
export function getRedisOptions(url?: string): any {
  const redisUrl = url || getRedisUrl();
  
  if (!redisUrl) {
    return null;
  }
  
  try {
    // Basic URL parsing - in a real implementation, use a more robust URL parser
    const urlMatch = redisUrl.match(/redis:\/\/([^:]+):([^@]+)@([^:]+):(\d+)/);
    
    if (!urlMatch) {
      logger.warn('Invalid Redis URL format');
      return null;
    }
    
    const [, username, password, host, port] = urlMatch;
    
    return {
      host,
      port: parseInt(port, 10),
      username,
      password,
      // Default Redis options
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
      enableReadyCheck: true,
      maxRetriesPerRequest: 3
    };
  } catch (error) {
    logger.error('Error parsing Redis URL', { 
      error: (error as Error).message 
    });
    return null;
  }
}