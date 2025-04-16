/**
 * Redis Cache Test Utility
 * 
 * Provides a utility for testing Redis cache functionality.
 */

import { cacheService } from './cache-service';
import { logger } from '../observability';

/**
 * Test the Redis cache by performing set/get/delete operations
 * and validating results.
 */
export async function testRedisCache(): Promise<boolean> {
  logger.info('Starting Redis cache test...');
  
  const testKey = 'test-redis-cache-key';
  const testValue = {
    message: 'Test Redis Value',
    timestamp: Date.now(),
    nested: {
      array: [1, 2, 3],
      object: { a: 1, b: 2 }
    }
  };
  
  try {
    // Test set
    logger.info('Testing Redis cache set operation...');
    const setResult = await cacheService.set(testKey, testValue, {
      ttl: 60,
      useMemoryCache: false,
      useRedisCache: true
    });
    
    if (!setResult) {
      throw new Error('Failed to set value in Redis cache');
    }
    
    logger.info('Redis set operation successful');
    
    // Test get
    logger.info('Testing Redis cache get operation...');
    const getValue = await cacheService.get(testKey, {
      useMemoryCache: false,
      useRedisCache: true
    });
    
    if (!getValue) {
      throw new Error('Failed to get value from Redis cache');
    }
    
    // Validate the retrieved value
    if (JSON.stringify(getValue) !== JSON.stringify(testValue)) {
      throw new Error('Retrieved value from Redis does not match the original value');
    }
    
    logger.info('Redis get operation successful, values match');
    
    // Test delete
    logger.info('Testing Redis cache delete operation...');
    const deleteResult = await cacheService.delete(testKey);
    
    if (!deleteResult) {
      throw new Error('Failed to delete value from Redis cache');
    }
    
    logger.info('Redis delete operation successful');
    
    // Verify deletion
    const getAfterDelete = await cacheService.get(testKey, {
      useMemoryCache: false,
      useRedisCache: true
    });
    
    if (getAfterDelete !== null) {
      throw new Error('Value still exists in Redis cache after deletion');
    }
    
    logger.info('Redis get after delete operation verified null value');
    
    // Test pattern invalidation
    const patternKeys = [
      'test-redis-pattern:1',
      'test-redis-pattern:2',
      'test-redis-pattern:3',
      'test-redis-other:1'
    ];
    
    logger.info('Testing Redis pattern invalidation...');
    
    // Set multiple keys
    for (const key of patternKeys) {
      await cacheService.set(key, { value: key }, {
        useMemoryCache: false,
        useRedisCache: true
      });
    }
    
    // Invalidate pattern
    await cacheService.invalidatePattern('test-redis-pattern');
    
    // Check which keys remain
    const testOtherExists = await cacheService.get('test-redis-other:1', {
      useMemoryCache: false,
      useRedisCache: true
    });
    
    const testPatternExists = await cacheService.get('test-redis-pattern:1', {
      useMemoryCache: false,
      useRedisCache: true
    });
    
    if (testPatternExists !== null) {
      throw new Error('Pattern invalidation failed for Redis cache');
    }
    
    if (testOtherExists === null) {
      throw new Error('Pattern invalidation incorrectly deleted unrelated key');
    }
    
    logger.info('Redis pattern invalidation successful');
    
    // Clean up
    await cacheService.delete('test-redis-other:1');
    
    logger.info('Redis cache test completed successfully');
    
    return true;
  } catch (error) {
    logger.error('Redis cache test failed', { error: (error as Error).message });
    return false;
  }
}