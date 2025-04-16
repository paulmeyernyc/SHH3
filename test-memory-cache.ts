/**
 * Memory Cache Test Utility
 * 
 * Provides a utility for testing in-memory cache functionality.
 */

import { cacheService } from './cache-service';
import { logger } from '../observability';

/**
 * Test the memory cache by performing set/get/delete operations
 * and validating results.
 */
export async function testMemoryCache() {
  logger.info('Starting memory cache test...');
  
  const testKey = 'test-memory-cache-key';
  const testValue = {
    message: 'Test Value',
    timestamp: Date.now(),
    nested: {
      array: [1, 2, 3],
      object: { a: 1, b: 2 }
    }
  };
  
  // Test set
  logger.info('Testing cache set operation...');
  const setResult = await cacheService.set(testKey, testValue, {
    ttl: 60,
    useMemoryCache: true,
    useRedisCache: false
  });
  
  if (!setResult) {
    throw new Error('Failed to set value in memory cache');
  }
  
  logger.info('Set operation successful');
  
  // Test get
  logger.info('Testing cache get operation...');
  const getValue = await cacheService.get(testKey, {
    useMemoryCache: true,
    useRedisCache: false
  });
  
  if (!getValue) {
    throw new Error('Failed to get value from memory cache');
  }
  
  // Validate the retrieved value
  if (JSON.stringify(getValue) !== JSON.stringify(testValue)) {
    throw new Error('Retrieved value does not match the original value');
  }
  
  logger.info('Get operation successful, values match');
  
  // Test delete
  logger.info('Testing cache delete operation...');
  const deleteResult = await cacheService.delete(testKey);
  
  if (!deleteResult) {
    throw new Error('Failed to delete value from memory cache');
  }
  
  logger.info('Delete operation successful');
  
  // Verify deletion
  const getAfterDelete = await cacheService.get(testKey, {
    useMemoryCache: true,
    useRedisCache: false
  });
  
  if (getAfterDelete !== null) {
    throw new Error('Value still exists in memory cache after deletion');
  }
  
  logger.info('Get after delete operation verified null value');
  
  // Test pattern invalidation
  const patternKeys = [
    'test-pattern:1',
    'test-pattern:2',
    'test-pattern:3',
    'test-other:1'
  ];
  
  logger.info('Testing pattern invalidation...');
  
  // Set multiple keys
  for (const key of patternKeys) {
    await cacheService.set(key, { value: key }, {
      useMemoryCache: true,
      useRedisCache: false
    });
  }
  
  // Invalidate pattern
  await cacheService.invalidatePattern('test-pattern');
  
  // Check which keys remain
  const testOtherExists = await cacheService.get('test-other:1', {
    useMemoryCache: true,
    useRedisCache: false
  });
  
  const testPatternExists = await cacheService.get('test-pattern:1', {
    useMemoryCache: true,
    useRedisCache: false
  });
  
  if (testPatternExists !== null) {
    throw new Error('Pattern invalidation failed for memory cache');
  }
  
  if (testOtherExists === null) {
    throw new Error('Pattern invalidation incorrectly deleted unrelated key');
  }
  
  logger.info('Pattern invalidation successful');
  
  // Clean up
  await cacheService.delete('test-other:1');
  
  logger.info('Memory cache test completed successfully');
  
  return true;
}