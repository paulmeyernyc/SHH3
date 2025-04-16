/**
 * Rate Limiter Middleware
 * 
 * Provides sophisticated rate limiting with different strategies:
 * - Fixed window rate limiting
 * - Sliding window rate limiting
 * - Token bucket rate limiting
 * 
 * Supports different storage backends:
 * - Redis (recommended for distributed deployments)
 * - Memory (for single-instance deployments)
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { logger } from '../observability';

/**
 * Rate limiting strategies
 */
export enum RateLimitStrategy {
  /** Fixed time window (simple but can cause traffic spikes at window boundaries) */
  FIXED_WINDOW = 'fixed-window',
  
  /** Sliding window (smooths traffic at window boundaries) */
  SLIDING_WINDOW = 'sliding-window',
  
  /** Token bucket (allows bursts within limits) */
  TOKEN_BUCKET = 'token-bucket',
}

/**
 * Rate limit configuration
 */
export interface RateLimitOptions {
  /** Requests allowed per window */
  limit: number;
  
  /** Time window in seconds */
  windowSizeInSeconds: number;
  
  /** Rate limiting strategy */
  strategy?: RateLimitStrategy;
  
  /** Redis client for distributed rate limiting (uses memory if not provided) */
  redisClient?: Redis.Redis;
  
  /** Skip rate limiting for certain requests */
  skip?: (req: Request) => boolean;
  
  /** Key generator function to create different limits for different clients */
  keyGenerator?: (req: Request) => string;
  
  /** When true, returns rate limit headers even when not rate limited */
  alwaysSendHeaders?: boolean;
  
  /** Name to use in X-RateLimit-* headers */
  headerName?: string;
  
  /** Response format when rate limited */
  handler?: (req: Request, res: Response) => void;
  
  /** Status code to send when rate limited */
  statusCode?: number;
  
  /** Allow bursts for token bucket strategy */
  maxBurstSize?: number;
}

/**
 * Default client identifier function (uses IP address)
 */
const defaultKeyGenerator = (req: Request) => {
  return req.ip || req.connection.remoteAddress || 'unknown';
};

/**
 * Default rate limit exceeded handler
 */
const defaultHandler = (req: Request, res: Response) => {
  res.status(429).json({
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit. Please try again later.'
  });
};

/**
 * Create a Redis-based rate limiter
 */
export function createRateLimiter(options: RateLimitOptions) {
  // Merge options with defaults
  const opts = {
    limit: options.limit,
    windowSizeInSeconds: options.windowSizeInSeconds,
    strategy: options.strategy || RateLimitStrategy.SLIDING_WINDOW,
    keyGenerator: options.keyGenerator || defaultKeyGenerator,
    skip: options.skip,
    alwaysSendHeaders: options.alwaysSendHeaders || true,
    headerName: options.headerName || 'Global',
    handler: options.handler || defaultHandler,
    statusCode: options.statusCode || 429,
    maxBurstSize: options.maxBurstSize || options.limit,
    redisClient: options.redisClient,
  };

  // Create middleware function
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting if needed
    if (opts.skip && opts.skip(req)) {
      return next();
    }

    // Generate rate limit key for this request
    const clientId = opts.keyGenerator(req);
    const rateLimitKey = `ratelimit:${opts.headerName.toLowerCase()}:${clientId}`;
    
    try {
      // Apply different strategies
      let result: RateLimitResult;
      
      switch (opts.strategy) {
        case RateLimitStrategy.TOKEN_BUCKET:
          result = await tokenBucketRateLimit(rateLimitKey, opts);
          break;
        case RateLimitStrategy.SLIDING_WINDOW:
          result = await slidingWindowRateLimit(rateLimitKey, opts);
          break;
        case RateLimitStrategy.FIXED_WINDOW:
        default:
          result = await fixedWindowRateLimit(rateLimitKey, opts);
          break;
      }
      
      // Add rate limiting headers
      if (result.limited || opts.alwaysSendHeaders) {
        res.setHeader('X-RateLimit-Limit', String(opts.limit));
        res.setHeader('X-RateLimit-Remaining', String(result.remaining));
        res.setHeader('X-RateLimit-Reset', String(result.reset));
        res.setHeader('X-RateLimit-Resource', opts.headerName);
        
        if (result.limited) {
          res.setHeader('Retry-After', Math.ceil((result.reset - Date.now()) / 1000).toString());
        }
      }
      
      // If rate limited, send 429 response
      if (result.limited) {
        logger.warn('Rate limit exceeded', { 
          clientId, 
          rateLimitKey, 
          limit: opts.limit,
          remaining: result.remaining,
          reset: new Date(result.reset).toISOString()
        });
        
        return opts.handler(req, res);
      }
      
      // Continue to next middleware
      next();
    } catch (error) {
      // Log error but allow request in case of rate limiter failure
      logger.error('Rate limit error', { 
        error: (error as Error).message,
        clientId,
        rateLimitKey
      });
      
      next();
    }
  };
}

/**
 * Rate limit result structure
 */
interface RateLimitResult {
  /** Whether the request should be limited */
  limited: boolean;
  
  /** Remaining requests in window */
  remaining: number;
  
  /** Timestamp when the limit resets */
  reset: number;
}

/**
 * Fixed window rate limiting
 * Uses a simple counter per time window
 */
async function fixedWindowRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  // Current time window timestamp
  const windowKey = Math.floor(now / (options.windowSizeInSeconds * 1000));
  const fullKey = `${key}:${windowKey}`;
  
  // When this window expires
  const resetTime = (windowKey + 1) * options.windowSizeInSeconds * 1000;
  
  let requestCount: number;
  
  if (options.redisClient) {
    // Redis-based implementation
    const redis = options.redisClient;
    
    // Increment counter and set expiry
    requestCount = await redis.incr(fullKey);
    
    // Set expiry on first request to window
    if (requestCount === 1) {
      await redis.pexpire(fullKey, resetTime - now);
    }
  } else {
    // Memory-based implementation using global variable
    (global as any).memoryRateLimiters = (global as any).memoryRateLimiters || {};
    (global as any).memoryRateLimiters[fullKey] = ((global as any).memoryRateLimiters[fullKey] || 0) + 1;
    requestCount = (global as any).memoryRateLimiters[fullKey];
  }
  
  return {
    limited: requestCount > options.limit,
    remaining: Math.max(0, options.limit - requestCount),
    reset: resetTime
  };
}

/**
 * Sliding window rate limiting
 * Smooths traffic at window boundaries
 */
async function slidingWindowRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const windowSizeMs = options.windowSizeInSeconds * 1000;
  
  // Current and previous time window timestamps
  const currentWindow = Math.floor(now / windowSizeMs);
  const previousWindow = currentWindow - 1;
  
  const currentKey = `${key}:${currentWindow}`;
  const previousKey = `${key}:${previousWindow}`;
  
  // When current window expires
  const resetTime = (currentWindow + 1) * windowSizeMs;
  
  if (options.redisClient) {
    // Redis-based implementation
    const redis = options.redisClient;
    
    // Increment current window counter
    const currentCount = await redis.incr(currentKey);
    
    // Set expiry on first request to window
    if (currentCount === 1) {
      await redis.pexpire(currentKey, windowSizeMs * 2); // Keep one extra window
    }
    
    // Get previous window counter
    const previousCount = parseInt(await redis.get(previousKey) || '0', 10);
    
    // Calculate weighted count
    // As we move through current window, previous window's weight decreases
    const weightOfPrevious = 1 - ((now % windowSizeMs) / windowSizeMs);
    const weightedCount = Math.floor(currentCount + (previousCount * weightOfPrevious));
    
    return {
      limited: weightedCount > options.limit,
      remaining: Math.max(0, options.limit - weightedCount),
      reset: resetTime
    };
  } else {
    // Memory-based implementation
    (global as any).memoryRateLimiters = (global as any).memoryRateLimiters || {};
    
    // Increment current window
    (global as any).memoryRateLimiters[currentKey] = ((global as any).memoryRateLimiters[currentKey] || 0) + 1;
    const currentCount = (global as any).memoryRateLimiters[currentKey];
    
    // Get previous window
    const previousCount = (global as any).memoryRateLimiters[previousKey] || 0;
    
    // Calculate weighted count
    const weightOfPrevious = 1 - ((now % windowSizeMs) / windowSizeMs);
    const weightedCount = Math.floor(currentCount + (previousCount * weightOfPrevious));
    
    // Cleanup old windows (simple manual expiry for memory implementation)
    for (const k of Object.keys((global as any).memoryRateLimiters)) {
      if (k.startsWith(key) && !k.endsWith(`:${currentWindow}`) && !k.endsWith(`:${previousWindow}`)) {
        delete (global as any).memoryRateLimiters[k];
      }
    }
    
    return {
      limited: weightedCount > options.limit,
      remaining: Math.max(0, options.limit - weightedCount),
      reset: resetTime
    };
  }
}

/**
 * Token bucket rate limiting
 * Allows for bursts within overall limit
 */
async function tokenBucketRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  
  // Key components
  const tokenKey = `${key}:tokens`;
  const timestampKey = `${key}:ts`;
  
  if (options.redisClient) {
    // Redis-based implementation
    const redis = options.redisClient;
    
    // Use Lua script for atomic operations
    const script = `
      local tokens = tonumber(redis.call('get', KEYS[1]) or "${options.maxBurstSize}")
      local last_refill = tonumber(redis.call('get', KEYS[2]) or "0")
      local now = tonumber(ARGV[1])
      local window_size = tonumber(ARGV[2])
      local refill_rate = tonumber(ARGV[3])
      local max_tokens = tonumber(ARGV[4])
      
      -- Calculate token refill based on time elapsed
      local elapsed_seconds = (now - last_refill) / 1000
      local new_tokens = math.min(max_tokens, tokens + math.floor(elapsed_seconds * refill_rate))
      
      -- Update last refill time if tokens were added
      if new_tokens > tokens then
        redis.call('set', KEYS[2], now)
      end
      
      -- Try to consume a token
      if new_tokens >= 1 then
        -- Token available, consume it
        redis.call('set', KEYS[1], new_tokens - 1)
        return {0, new_tokens - 1, now + (window_size * 1000)}
      else
        -- No tokens available, calculate when next token will be available
        local next_token_ms = math.ceil((1 - tokens) * (1000 / refill_rate))
        return {1, 0, now + next_token_ms}
      end
    `;
    
    // Execute script
    const result = await redis.eval(
      script,
      2, // number of keys
      tokenKey,
      timestampKey,
      now.toString(),
      options.windowSizeInSeconds.toString(),
      (options.limit / options.windowSizeInSeconds).toString(), // refill rate
      options.maxBurstSize!.toString()
    ) as [number, number, number];
    
    // Parse results
    const [limited, remaining, reset] = result;
    
    // Set expiry on keys
    const pipeline = redis.pipeline();
    pipeline.pexpire(tokenKey, options.windowSizeInSeconds * 1000 * 2);
    pipeline.pexpire(timestampKey, options.windowSizeInSeconds * 1000 * 2);
    await pipeline.exec();
    
    return {
      limited: limited === 1,
      remaining,
      reset
    };
  } else {
    // Memory-based implementation
    (global as any).tokenBuckets = (global as any).tokenBuckets || {};
    
    // Get or initialize bucket
    const bucket = (global as any).tokenBuckets[key] || {
      tokens: options.maxBurstSize,
      lastRefill: 0
    };
    
    // Calculate token refill
    const refillRate = options.limit / options.windowSizeInSeconds; // tokens per second
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    
    if (elapsedSeconds > 0) {
      bucket.tokens = Math.min(
        options.maxBurstSize!, 
        bucket.tokens + Math.floor(elapsedSeconds * refillRate)
      );
      bucket.lastRefill = now;
    }
    
    // Try to consume a token
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      (global as any).tokenBuckets[key] = bucket;
      
      return {
        limited: false,
        remaining: bucket.tokens,
        reset: now + Math.ceil(options.windowSizeInSeconds * 1000)
      };
    } else {
      // No tokens available, calculate when next token will be available
      const nextTokenMs = Math.ceil((1 - bucket.tokens) * (1000 / refillRate));
      
      return {
        limited: true,
        remaining: 0,
        reset: now + nextTokenMs
      };
    }
  }
}

// Export convenient factory functions
export const fixedWindowRateLimiter = (options: RateLimitOptions) => 
  createRateLimiter({ ...options, strategy: RateLimitStrategy.FIXED_WINDOW });

export const slidingWindowRateLimiter = (options: RateLimitOptions) => 
  createRateLimiter({ ...options, strategy: RateLimitStrategy.SLIDING_WINDOW });

export const tokenBucketRateLimiter = (options: RateLimitOptions) => 
  createRateLimiter({ ...options, strategy: RateLimitStrategy.TOKEN_BUCKET });