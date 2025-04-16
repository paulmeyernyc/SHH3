/**
 * Queue Service Module
 * 
 * Provides a robust message queue for asynchronous processing using Redis.
 * Supports reliable message delivery, delayed messages, message retries,
 * and dead letter queues for handling failed messages.
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../observability';

/**
 * Message structure for queue
 */
export interface QueueMessage<T = any> {
  id: string;
  data: T;
  createdAt: string;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  processAfter?: string;
}

/**
 * Queue options for publishing messages
 */
export interface QueuePublishOptions {
  /** Delay processing (in milliseconds) */
  delay?: number;
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Priority (higher numbers are processed first) */
  priority?: number;
  /** Message ID (auto-generated if not provided) */
  id?: string;
}

/**
 * Handler function type for message processing
 */
export type MessageHandler<T = any> = (message: QueueMessage<T>) => Promise<void>;

/**
 * Queue configuration options
 */
export interface QueueOptions {
  /** Redis client instance or connection string */
  redis?: Redis.Redis | string;
  /** Default visibility timeout for messages (ms) */
  visibilityTimeout?: number;
  /** Default maximum retries for failed messages */
  defaultMaxAttempts?: number;
  /** Whether to use a dead letter queue for failed messages */
  useDLQ?: boolean;
  /** Number of concurrent message processors */
  concurrency?: number;
  /** Polling interval for checking new messages (ms) */
  pollingInterval?: number;
}

// Default queue options
const DEFAULT_OPTIONS: QueueOptions = {
  visibilityTimeout: 30000, // 30 seconds
  defaultMaxAttempts: 3,
  useDLQ: true,
  concurrency: 10,
  pollingInterval: 1000, // 1 second
};

/**
 * Message Queue service using Redis
 */
export class QueueService {
  private redisClient: Redis.Redis;
  private options: Required<QueueOptions>;
  private handlers: Map<string, MessageHandler> = new Map();
  private processingTimers: Map<string, NodeJS.Timeout> = new Map();
  private isProcessing: boolean = false;
  private isRedisConnected: boolean = false;
  private activeProcessors: Map<string, Set<string>> = new Map();

  constructor(options: QueueOptions = {}) {
    // Initialize options with defaults
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    } as Required<QueueOptions>;

    // Initialize Redis client only if we have a connection string
    const redisUrl = process.env.REDIS_URL;
    
    if (redisUrl) {
      try {
        // Initialize Redis client
        if (typeof this.options.redis === 'string') {
          this.redisClient = new Redis(this.options.redis);
        } else if (this.options.redis instanceof Redis) {
          this.redisClient = this.options.redis;
        } else {
          this.redisClient = new Redis(redisUrl);
        }

        // Set up Redis event handlers
        this.redisClient.on('connect', () => {
          this.isRedisConnected = true;
          logger.info('Queue service connected to Redis');
        });

        // Track whether we've logged the initial error to prevent log spam
        let redisErrorLogged = false;
        
        this.redisClient.on('error', (err) => {
          this.isRedisConnected = false;
          
          if (!redisErrorLogged) {
            // Only log the first error to avoid log spam
            logger.error('Queue service Redis error', { 
              error: err?.message || 'Unknown error'
            });
            redisErrorLogged = true;
          } else {
            // Use debug level for subsequent errors
            logger.debug('Redis connection still failing', {
              error: err?.message || 'Unknown error'
            });
          }
        });
      } catch (error) {
        logger.warn('Failed to initialize Redis for queue service, running in memory-only mode', {
          error: (error as Error)?.message || 'Unknown error'
        });
        this.isRedisConnected = false;
      }
    } else {
      logger.info('Redis URL not provided for queue service, running in memory-only mode');
      this.isRedisConnected = false;
    }

    logger.info('Queue service initialized');
  }

  /**
   * Get Redis key for a specific queue
   */
  private getQueueKey(queueName: string): string {
    return `queue:${queueName}`;
  }

  /**
   * Get Redis key for a queue's processing set
   */
  private getProcessingKey(queueName: string): string {
    return `queue:${queueName}:processing`;
  }

  /**
   * Get Redis key for a queue's delayed messages
   */
  private getDelayedKey(queueName: string): string {
    return `queue:${queueName}:delayed`;
  }

  /**
   * Get Redis key for a queue's dead letter queue
   */
  private getDLQKey(queueName: string): string {
    return `queue:${queueName}:dlq`;
  }

  /**
   * Publish a message to a queue
   */
  async publish<T>(queueName: string, data: T, options: QueuePublishOptions = {}): Promise<string> {
    if (!this.isRedisConnected) {
      logger.warn('Queue service not connected to Redis, message will not be processed', {
        queueName,
        messageType: typeof data
      });
      return uuidv4(); // Return a dummy ID in memory-only mode
    }

    const messageId = options.id || uuidv4();
    const now = new Date();
    
    const message: QueueMessage<T> = {
      id: messageId,
      data,
      createdAt: now.toISOString(),
      attempts: 0,
      maxAttempts: options.maxAttempts || this.options.defaultMaxAttempts,
    };

    // If delay is specified, add to delayed queue
    if (options.delay && options.delay > 0) {
      message.delay = options.delay;
      const processAfter = new Date(now.getTime() + options.delay);
      message.processAfter = processAfter.toISOString();
      
      await this.redisClient.zadd(
        this.getDelayedKey(queueName),
        processAfter.getTime(),
        JSON.stringify(message)
      );
      
      logger.debug('Message added to delayed queue', { 
        queueName, 
        messageId,
        processAfter: message.processAfter
      });
    } else {
      // Add to regular queue
      const queueKey = this.getQueueKey(queueName);
      
      if (options.priority !== undefined) {
        // Use sorted set if priority is specified
        await this.redisClient.zadd(
          queueKey,
          -options.priority, // Negative because higher priority should be first
          JSON.stringify(message)
        );
      } else {
        // Use list (FIFO) if no priority
        await this.redisClient.rpush(queueKey, JSON.stringify(message));
      }
      
      logger.debug('Message published to queue', { queueName, messageId });
    }

    return messageId;
  }

  /**
   * Subscribe to a queue and process messages
   */
  subscribe<T>(queueName: string, handler: MessageHandler<T>) {
    this.handlers.set(queueName, handler as MessageHandler);
    this.activeProcessors.set(queueName, new Set());
    
    logger.info('Subscribed to queue', { queueName });
    
    // Start processing if not already started
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  /**
   * Unsubscribe from a queue
   */
  unsubscribe(queueName: string) {
    this.handlers.delete(queueName);
    this.activeProcessors.delete(queueName);
    logger.info('Unsubscribed from queue', { queueName });
  }

  /**
   * Start processing messages from all subscribed queues
   */
  private startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    logger.info('Starting queue message processor');
    
    // Process messages on interval
    const processingInterval = setInterval(async () => {
      // Only try to process if Redis is properly initialized
      if (this.redisClient) {
        if (!this.isRedisConnected) {
          // Don't log this warning at all at debug level - we only need it once
          // This is a common situation when Redis is not available
          return;
        }
        
        // Move delayed messages that are ready to their queues
        await this.moveReadyDelayedMessages();
        
        // Process messages for each subscribed queue
        for (const queueName of this.handlers.keys()) {
          await this.processQueueMessages(queueName);
        }
      } else {
        // Memory-only mode - messages can't be processed but we don't spam logs
      }
    }, this.options.pollingInterval);
    
    // Keep interval reference for cleanup
    this.processingTimers.set('main', processingInterval);
  }

  /**
   * Stop processing messages
   */
  async stopProcessing() {
    this.isProcessing = false;
    
    // Clear all timers
    for (const [key, timer] of this.processingTimers.entries()) {
      clearInterval(timer);
      this.processingTimers.delete(key);
    }
    
    logger.info('Stopped queue message processor');
  }

  /**
   * Move delayed messages that are ready to their destination queues
   */
  private async moveReadyDelayedMessages() {
    const now = Date.now();
    
    for (const queueName of this.handlers.keys()) {
      const delayedKey = this.getDelayedKey(queueName);
      
      // Get delayed messages that are ready to be processed
      const readyMessages = await this.redisClient.zrangebyscore(
        delayedKey,
        0,
        now
      );
      
      if (readyMessages.length === 0) continue;
      
      const queueKey = this.getQueueKey(queueName);
      const pipeline = this.redisClient.pipeline();
      
      // Move ready messages to their queues
      for (const msgStr of readyMessages) {
        pipeline.rpush(queueKey, msgStr);
        pipeline.zrem(delayedKey, msgStr);
      }
      
      await pipeline.exec();
      logger.debug('Moved delayed messages to queue', { 
        queueName, 
        count: readyMessages.length 
      });
    }
  }

  /**
   * Process messages for a specific queue
   */
  private async processQueueMessages(queueName: string) {
    const handler = this.handlers.get(queueName);
    if (!handler) return; // No handler for this queue
    
    const activeProcessors = this.activeProcessors.get(queueName) || new Set();
    
    // Only fetch new messages if we're below concurrency limit
    if (activeProcessors.size >= this.options.concurrency) {
      return;
    }
    
    const queueKey = this.getQueueKey(queueName);
    const processingKey = this.getProcessingKey(queueName);
    
    // Determine how many messages to fetch
    const fetchCount = this.options.concurrency - activeProcessors.size;
    
    // Get message(s) from queue (checking priority-based or regular queue)
    const isPriority = await this.redisClient.type(queueKey) === 'zset';
    let messages: string[] = [];
    
    if (isPriority) {
      // For priority queue (zset), get the highest priority messages
      messages = await this.redisClient.zrange(queueKey, 0, fetchCount - 1);
      
      if (messages.length > 0) {
        await this.redisClient.zrem(queueKey, ...messages);
      }
    } else {
      // For regular queue (list), pop from left
      if (fetchCount === 1) {
        const message = await this.redisClient.lpop(queueKey);
        if (message) messages = [message];
      } else {
        messages = await this.redisClient.lrange(queueKey, 0, fetchCount - 1);
        if (messages.length > 0) {
          await this.redisClient.ltrim(queueKey, messages.length, -1);
        }
      }
    }
    
    // Process each message
    for (const msgStr of messages) {
      try {
        const message = JSON.parse(msgStr) as QueueMessage;
        message.attempts++;
        
        // Add to processing set with expiration
        await this.redisClient.set(
          `${processingKey}:${message.id}`,
          msgStr,
          'PX',
          this.options.visibilityTimeout
        );
        
        // Track active processor
        activeProcessors.add(message.id);
        
        // Process message in background
        this.processMessage(queueName, message, handler).finally(() => {
          activeProcessors.delete(message.id);
        });
      } catch (error) {
        logger.error('Error parsing queue message', { 
          queueName, 
          error: (error as Error).message,
          message: msgStr
        });
      }
    }
  }

  /**
   * Process a single message with the handler
   */
  private async processMessage(queueName: string, message: QueueMessage, handler: MessageHandler) {
    const processingKey = `${this.getProcessingKey(queueName)}:${message.id}`;
    
    try {
      // Extend visibility timeout periodically during processing
      const extendInterval = setInterval(async () => {
        try {
          await this.redisClient.pexpire(processingKey, this.options.visibilityTimeout);
        } catch (error) {
          // Ignore errors here
        }
      }, Math.floor(this.options.visibilityTimeout / 2));
      
      // Process the message
      await handler(message);
      
      // Remove from processing after successful processing
      await this.redisClient.del(processingKey);
      
      // Clean up interval
      clearInterval(extendInterval);
      
      logger.debug('Successfully processed message', { 
        queueName, 
        messageId: message.id,
        attempts: message.attempts 
      });
    } catch (error) {
      // Clean up interval
      clearInterval(extendInterval);
      
      logger.error('Error processing message', { 
        queueName, 
        messageId: message.id,
        error: (error as Error).message,
        attempts: message.attempts,
        maxAttempts: message.maxAttempts
      });
      
      // Remove from processing set
      await this.redisClient.del(processingKey);
      
      // Handle failed message
      await this.handleFailedMessage(queueName, message, error as Error);
    }
  }

  /**
   * Handle a failed message (retry or move to DLQ)
   */
  private async handleFailedMessage(queueName: string, message: QueueMessage, error: Error) {
    // Check if we should retry
    if (message.attempts < message.maxAttempts) {
      // Add exponential backoff delay
      const backoffDelay = Math.min(
        60000 * 10, // Max 10 minutes
        1000 * Math.pow(2, message.attempts - 1) // Exponential backoff
      );
      
      // Re-queue with delay
      await this.publish(queueName, message.data, {
        id: message.id,
        maxAttempts: message.maxAttempts,
        delay: backoffDelay
      });
      
      logger.info('Requeued failed message with backoff', { 
        queueName, 
        messageId: message.id,
        attempts: message.attempts,
        backoffDelay
      });
    } else if (this.options.useDLQ) {
      // Move to dead letter queue
      const dlqKey = this.getDLQKey(queueName);
      
      // Add error information to message
      const dlqMessage = {
        ...message,
        error: {
          message: error.message,
          stack: error.stack,
          time: new Date().toISOString()
        }
      };
      
      await this.redisClient.rpush(dlqKey, JSON.stringify(dlqMessage));
      
      logger.warn('Moved failed message to DLQ', { 
        queueName, 
        messageId: message.id,
        attempts: message.attempts
      });
    } else {
      // Just log the permanent failure
      logger.error('Message permanently failed', { 
        queueName, 
        messageId: message.id,
        attempts: message.attempts
      });
    }
  }

  /**
   * Get queue depth (number of pending messages)
   */
  async getQueueDepth(queueName: string): Promise<{ pending: number, delayed: number, processing: number, failed: number }> {
    const queueKey = this.getQueueKey(queueName);
    const delayedKey = this.getDelayedKey(queueName);
    const processingKey = this.getProcessingKey(queueName);
    const dlqKey = this.getDLQKey(queueName);
    
    const isPriority = await this.redisClient.type(queueKey) === 'zset';
    
    const [pendingCount, delayedCount, failedCount] = await Promise.all([
      isPriority 
        ? this.redisClient.zcard(queueKey)
        : this.redisClient.llen(queueKey),
      this.redisClient.zcard(delayedKey),
      this.redisClient.llen(dlqKey)
    ]);
    
    // Processing count requires scanning keys
    const processingCount = await this.getProcessingCount(queueName);
    
    return {
      pending: typeof pendingCount === 'number' ? pendingCount : 0,
      delayed: typeof delayedCount === 'number' ? delayedCount : 0,
      processing: processingCount,
      failed: typeof failedCount === 'number' ? failedCount : 0
    };
  }
  
  /**
   * Get count of currently processing messages
   */
  private async getProcessingCount(queueName: string): Promise<number> {
    const processingPattern = `${this.getProcessingKey(queueName)}:*`;
    let cursor = '0';
    let count = 0;
    
    do {
      const [nextCursor, keys] = await this.redisClient.scan(
        cursor, 
        'MATCH', 
        processingPattern,
        'COUNT',
        '100'
      );
      
      cursor = nextCursor;
      count += keys.length;
    } while (cursor !== '0');
    
    return count;
  }

  /**
   * Retry a message from the dead letter queue
   */
  async retryDLQMessage(queueName: string, messageId: string): Promise<boolean> {
    const dlqKey = this.getDLQKey(queueName);
    
    // Find the message in the DLQ
    const messages = await this.redisClient.lrange(dlqKey, 0, -1);
    
    for (const [index, msgStr] of messages.entries()) {
      try {
        const message = JSON.parse(msgStr) as QueueMessage;
        
        if (message.id === messageId) {
          // Remove from DLQ
          await this.redisClient.lrem(dlqKey, 1, msgStr);
          
          // Reset attempts and publish to main queue
          message.attempts = 0;
          delete (message as any).error; // Remove error info
          
          await this.publish(queueName, message.data, {
            id: message.id,
            maxAttempts: message.maxAttempts
          });
          
          logger.info('Retried message from DLQ', { queueName, messageId });
          return true;
        }
      } catch (error) {
        logger.error('Error parsing DLQ message', { 
          error: (error as Error).message 
        });
      }
    }
    
    return false;
  }

  /**
   * Purge all messages from a queue
   */
  async purgeQueue(queueName: string): Promise<number> {
    const queueKey = this.getQueueKey(queueName);
    const delayedKey = this.getDelayedKey(queueName);
    const processingPattern = `${this.getProcessingKey(queueName)}:*`;
    const dlqKey = this.getDLQKey(queueName);
    
    // Delete all related keys
    const pipeline = this.redisClient.pipeline();
    pipeline.del(queueKey);
    pipeline.del(delayedKey);
    pipeline.del(dlqKey);
    
    // Delete processing keys (need to scan first)
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redisClient.scan(
        cursor, 
        'MATCH', 
        processingPattern,
        'COUNT',
        '100'
      );
      
      cursor = nextCursor;
      
      if (keys.length > 0) {
        pipeline.del(...keys);
      }
    } while (cursor !== '0');
    
    // Execute all deletions
    const results = await pipeline.exec();
    
    // Calculate total deleted keys
    let totalDeleted = 0;
    if (results) {
      for (const result of results) {
        if (result && result[1] && typeof result[1] === 'number') {
          totalDeleted += result[1] as number;
        }
      }
    }
    
    logger.info('Purged queue', { queueName, deletedCount: totalDeleted });
    return totalDeleted;
  }

  /**
   * Health check for the queue service
   */
  async healthCheck(): Promise<{ status: string, details: any }> {
    if (!this.isRedisConnected) {
      return {
        status: 'unhealthy',
        details: {
          redis: 'disconnected'
        }
      };
    }
    
    try {
      // Check if Redis connection works
      await this.redisClient.ping();
      
      // Get queue stats
      const queueStats: Record<string, any> = {};
      
      for (const queueName of this.handlers.keys()) {
        queueStats[queueName] = await this.getQueueDepth(queueName);
      }
      
      return {
        status: 'healthy',
        details: {
          redis: 'connected',
          isProcessing: this.isProcessing,
          concurrency: this.options.concurrency,
          queues: queueStats
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * Gracefully shut down the queue service
   */
  async shutdown(): Promise<void> {
    // Stop processing new messages
    await this.stopProcessing();
    
    // Wait for active processors to complete (with timeout)
    const startTime = Date.now();
    const shutdownTimeout = 30000; // 30 seconds
    
    while (true) {
      let activeProcessorsCount = 0;
      
      for (const processors of this.activeProcessors.values()) {
        activeProcessorsCount += processors.size;
      }
      
      if (activeProcessorsCount === 0) {
        break;
      }
      
      // Check timeout
      if (Date.now() - startTime > shutdownTimeout) {
        logger.warn('Queue shutdown timeout reached with active processors', {
          activeProcessorsCount
        });
        break;
      }
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Close Redis connection if initialized
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch (error) {
        // Ignore Redis quit errors
      }
    }
    
    logger.info('Queue service shut down');
  }
}

// Export singleton instance
export const queueService = new QueueService();