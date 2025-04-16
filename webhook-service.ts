/**
 * Webhook Service
 * 
 * This service handles the creation, management, and delivery of webhooks.
 * It provides functionality to:
 * - Register webhook event types
 * - Create webhook subscriptions
 * - Trigger webhook events
 * - Deliver webhooks to subscribers
 * - Manage retry logic for failed deliveries
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { 
  webhookEvents, 
  webhookSubscriptions, 
  webhookDeliveries,
  WebhookEvent, 
  WebhookSubscription, 
  WebhookDelivery,
  InsertWebhookEvent,
  InsertWebhookSubscription
} from '../../shared/webhook-schema';
import { eq, inArray, and } from 'drizzle-orm';
import axios, { AxiosRequestConfig } from 'axios';
import { createHmac } from 'crypto';
import { queueService } from '../queue/queue-service';
import { logger } from '../observability';

/**
 * Configuration for the Webhook Service
 */
export interface WebhookServiceOptions {
  signatureSecret?: string;
  signatureHeader?: string;
  defaultTimeout?: number;
  maxRetries?: number;
  retryDelays?: number[];
  defaultContentType?: string;
}

/**
 * Payload for triggering a webhook event
 */
export interface WebhookEventPayload {
  eventName: string;
  payload: any;
  metadata?: Record<string, any>;
}

/**
 * Webhook Service
 */
export class WebhookService {
  private options: WebhookServiceOptions;
  private subscriptionsCache: Map<string, WebhookSubscription[]> = new Map();
  private cacheExpiryTime: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly QUEUE_NAME = 'webhooks';

  constructor(options: WebhookServiceOptions = {}) {
    this.options = {
      signatureSecret: options.signatureSecret || process.env.WEBHOOK_SIGNATURE_SECRET,
      signatureHeader: options.signatureHeader || 'X-Webhook-Signature',
      defaultTimeout: options.defaultTimeout || 5000,
      maxRetries: options.maxRetries || 3,
      retryDelays: options.retryDelays || [60, 300, 1800], // 1min, 5min, 30min
      defaultContentType: options.defaultContentType || 'application/json'
    };

    // Initialize queue subscriber
    this.initializeQueue();
  }

  /**
   * Initialize the queue for processing webhook deliveries
   */
  private initializeQueue(): void {
    queueService.subscribe(this.QUEUE_NAME, async (message) => {
      try {
        const delivery = message.data as WebhookDelivery;
        await this.processDelivery(delivery);
      } catch (error) {
        logger.error('Error processing webhook delivery', {
          error: (error as Error).message,
          messageId: message.id
        });
        throw error; // Throw to trigger retry logic in queue service
      }
    });

    logger.info('Webhook delivery queue initialized');
  }

  /**
   * Register a new webhook event type
   */
  async registerEvent(event: InsertWebhookEvent): Promise<WebhookEvent> {
    try {
      // Check if event already exists
      const existingEvent = await db.query.webhookEvents.findFirst({
        where: eq(webhookEvents.name, event.name)
      });

      if (existingEvent) {
        throw new Error(`Webhook event '${event.name}' already exists`);
      }

      // Create the new event
      const [newEvent] = await db.insert(webhookEvents).values(event).returning();
      
      logger.info('Webhook event registered', { eventName: event.name });
      return newEvent;
    } catch (error) {
      logger.error('Error registering webhook event', { 
        error: (error as Error).message,
        eventName: event.name
      });
      throw error;
    }
  }

  /**
   * Get all registered webhook events
   */
  async getEvents(): Promise<WebhookEvent[]> {
    return await db.query.webhookEvents.findMany({
      orderBy: (events, { asc }) => [asc(events.category), asc(events.name)]
    });
  }

  /**
   * Create a new webhook subscription
   */
  async createSubscription(subscription: InsertWebhookSubscription): Promise<WebhookSubscription> {
    try {
      // Validate events
      const events = await db.query.webhookEvents.findMany({
        where: inArray(webhookEvents.name, subscription.events as string[])
      });

      if (events.length !== (subscription.events as string[]).length) {
        throw new Error('One or more event types do not exist');
      }

      // Create the subscription
      const [newSubscription] = await db.insert(webhookSubscriptions)
        .values(subscription)
        .returning();

      // Invalidate the cache
      this.invalidateCache();
      
      logger.info('Webhook subscription created', { 
        subscriberId: subscription.subscriberId,
        subscriberType: subscription.subscriberType,
        name: subscription.name,
        events: subscription.events
      });

      return newSubscription;
    } catch (error) {
      logger.error('Error creating webhook subscription', { 
        error: (error as Error).message,
        subscriberId: subscription.subscriberId
      });
      throw error;
    }
  }

  /**
   * Get webhook subscriptions for a subscriber
   */
  async getSubscriptions(subscriberId: number, subscriberType: string): Promise<WebhookSubscription[]> {
    return await db.query.webhookSubscriptions.findMany({
      where: and(
        eq(webhookSubscriptions.subscriberId, subscriberId),
        eq(webhookSubscriptions.subscriberType, subscriberType)
      ),
      orderBy: (subscriptions, { asc }) => [asc(subscriptions.name)]
    });
  }

  /**
   * Update a webhook subscription
   */
  async updateSubscription(
    id: number, 
    updates: Partial<Omit<InsertWebhookSubscription, 'subscriberId' | 'subscriberType'>>
  ): Promise<WebhookSubscription> {
    try {
      // Validate events if provided
      if (updates.events && updates.events.length > 0) {
        const events = await db.query.webhookEvents.findMany({
          where: inArray(webhookEvents.name, updates.events as string[])
        });

        if (events.length !== (updates.events as string[]).length) {
          throw new Error('One or more event types do not exist');
        }
      }

      // Update the subscription
      const [updatedSubscription] = await db.update(webhookSubscriptions)
        .set({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .where(eq(webhookSubscriptions.id, id))
        .returning();

      if (!updatedSubscription) {
        throw new Error(`Webhook subscription with ID ${id} not found`);
      }

      // Invalidate the cache
      this.invalidateCache();
      
      logger.info('Webhook subscription updated', { subscriptionId: id });
      return updatedSubscription;
    } catch (error) {
      logger.error('Error updating webhook subscription', { 
        error: (error as Error).message,
        subscriptionId: id
      });
      throw error;
    }
  }

  /**
   * Delete a webhook subscription
   */
  async deleteSubscription(id: number): Promise<void> {
    try {
      const result = await db.delete(webhookSubscriptions)
        .where(eq(webhookSubscriptions.id, id))
        .returning({ id: webhookSubscriptions.id });

      if (result.length === 0) {
        throw new Error(`Webhook subscription with ID ${id} not found`);
      }

      // Invalidate the cache
      this.invalidateCache();
      
      logger.info('Webhook subscription deleted', { subscriptionId: id });
    } catch (error) {
      logger.error('Error deleting webhook subscription', { 
        error: (error as Error).message,
        subscriptionId: id
      });
      throw error;
    }
  }

  /**
   * Trigger a webhook event
   * This finds all subscriptions for the event and queues deliveries
   */
  async triggerEvent(eventPayload: WebhookEventPayload): Promise<void> {
    const { eventName, payload, metadata = {} } = eventPayload;
    
    try {
      // Validate event exists
      const event = await db.query.webhookEvents.findFirst({
        where: eq(webhookEvents.name, eventName)
      });

      if (!event) {
        throw new Error(`Webhook event '${eventName}' does not exist`);
      }

      // Get subscriptions for this event
      const subscriptions = await this.getSubscriptionsForEvent(eventName);
      
      if (subscriptions.length === 0) {
        logger.info('No subscriptions found for event', { eventName });
        return;
      }

      logger.info('Triggering webhook event', { 
        eventName, 
        subscriptionCount: subscriptions.length
      });

      // Generate a unique ID for this event instance
      const eventId = uuidv4();

      // Create and queue deliveries for each subscription
      for (const subscription of subscriptions) {
        // Apply filters if needed
        if (subscription.filters && Object.keys(subscription.filters).length > 0) {
          const shouldDeliver = this.applyFilters(payload, subscription.filters as Record<string, any>);
          if (!shouldDeliver) {
            logger.debug('Webhook filtered out', { 
              eventName,
              subscriptionId: subscription.id 
            });
            continue;
          }
        }

        // Create a delivery record
        const [delivery] = await db.insert(webhookDeliveries).values({
          subscriptionId: subscription.id,
          eventName,
          eventId,
          status: 'pending',
          payload,
          requestHeaders: {},
          metadata: {
            ...metadata,
            subscriptionName: subscription.name
          }
        }).returning();

        // Queue the delivery
        await queueService.publish(this.QUEUE_NAME, delivery, {
          maxAttempts: subscription.maxRetries || this.options.maxRetries as number
        });
      }
    } catch (error) {
      logger.error('Error triggering webhook event', { 
        error: (error as Error).message,
        eventName
      });
      throw error;
    }
  }

  /**
   * Get webhook deliveries for a subscription
   */
  async getDeliveries(
    subscriptionId: number, 
    limit = 100, 
    offset = 0
  ): Promise<{ deliveries: WebhookDelivery[], total: number }> {
    try {
      const deliveries = await db.query.webhookDeliveries.findMany({
        where: eq(webhookDeliveries.subscriptionId, subscriptionId),
        orderBy: (deliveries, { desc }) => [desc(deliveries.createdAt)],
        limit,
        offset
      });

      const [{ count }] = await db
        .select({ count: db.fn.count() })
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.subscriptionId, subscriptionId));

      return {
        deliveries,
        total: Number(count)
      };
    } catch (error) {
      logger.error('Error getting webhook deliveries', { 
        error: (error as Error).message,
        subscriptionId
      });
      throw error;
    }
  }

  /**
   * Retry a specific webhook delivery
   */
  async retryDelivery(deliveryId: number): Promise<WebhookDelivery> {
    try {
      // Get the delivery
      const delivery = await db.query.webhookDeliveries.findFirst({
        where: eq(webhookDeliveries.id, deliveryId)
      });

      if (!delivery) {
        throw new Error(`Webhook delivery with ID ${deliveryId} not found`);
      }

      // Get the subscription
      const subscription = await db.query.webhookSubscriptions.findFirst({
        where: eq(webhookSubscriptions.id, delivery.subscriptionId)
      });

      if (!subscription) {
        throw new Error(`Webhook subscription for delivery ${deliveryId} not found`);
      }

      // Update the delivery
      const [updatedDelivery] = await db.update(webhookDeliveries)
        .set({
          status: 'pending',
          retryCount: delivery.retryCount + 1,
          nextRetryAt: null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(webhookDeliveries.id, deliveryId))
        .returning();

      // Queue the delivery
      await queueService.publish(this.QUEUE_NAME, updatedDelivery, {
        maxAttempts: subscription.maxRetries || this.options.maxRetries as number
      });

      logger.info('Webhook delivery queued for retry', { 
        deliveryId,
        retryCount: updatedDelivery.retryCount
      });

      return updatedDelivery;
    } catch (error) {
      logger.error('Error retrying webhook delivery', { 
        error: (error as Error).message,
        deliveryId
      });
      throw error;
    }
  }

  /**
   * Process a webhook delivery
   * This is called by the queue system
   */
  private async processDelivery(delivery: WebhookDelivery): Promise<void> {
    try {
      // Get the subscription
      const subscription = await db.query.webhookSubscriptions.findFirst({
        where: eq(webhookSubscriptions.id, delivery.subscriptionId)
      });

      if (!subscription) {
        throw new Error(`Webhook subscription for delivery ${delivery.id} not found`);
      }

      if (subscription.status !== 'active' && subscription.status !== 'testing') {
        logger.info('Skipping webhook delivery for inactive subscription', { 
          deliveryId: delivery.id,
          subscriptionId: subscription.id,
          status: subscription.status
        });

        // Mark as failed
        await db.update(webhookDeliveries)
          .set({
            status: 'failed',
            error: 'Subscription is not active',
            updatedAt: new Date().toISOString()
          })
          .where(eq(webhookDeliveries.id, delivery.id));

        return;
      }

      logger.debug('Processing webhook delivery', { 
        deliveryId: delivery.id,
        eventName: delivery.eventName,
        subscriptionId: subscription.id
      });

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': subscription.contentType || this.options.defaultContentType as string,
        'User-Agent': 'SmartHealthHub-Webhook-Service/1.0',
        'X-Webhook-ID': delivery.id.toString(),
        'X-Event-Name': delivery.eventName,
        'X-Event-ID': delivery.eventId
      };

      // Add custom headers
      if (subscription.customHeaders && Object.keys(subscription.customHeaders).length > 0) {
        Object.assign(headers, subscription.customHeaders);
      }

      // Add security headers
      this.addSecurityHeaders(headers, subscription, delivery);

      // Prepare request
      const requestOptions: AxiosRequestConfig = {
        method: 'POST',
        url: subscription.endpointUrl,
        headers,
        data: delivery.payload,
        timeout: subscription.timeout || this.options.defaultTimeout,
        validateStatus: () => true // Accept any status code to log the response
      };

      // Make the request
      const startTime = Date.now();
      const response = await axios(requestOptions);
      const duration = Date.now() - startTime;

      // Prepare update
      const updateData: Partial<WebhookDelivery> = {
        requestHeaders: headers,
        responseStatus: response.status,
        responseBody: typeof response.data === 'string' 
          ? response.data.substring(0, 10000) // Truncate if too long
          : JSON.stringify(response.data).substring(0, 10000),
        responseHeaders: response.headers,
        respondedAt: new Date().toISOString(),
        duration,
        updatedAt: new Date().toISOString()
      };

      // Determine status
      if (response.status >= 200 && response.status < 300) {
        // Success
        updateData.status = 'delivered';

        // Update subscription stats
        await db.update(webhookSubscriptions)
          .set({
            lastSuccessAt: new Date().toISOString(),
            successCount: subscription.successCount + 1,
            updatedAt: new Date().toISOString()
          })
          .where(eq(webhookSubscriptions.id, subscription.id));

        logger.info('Webhook delivered successfully', { 
          deliveryId: delivery.id,
          status: response.status,
          duration
        });
      } else {
        // Failure
        updateData.status = 'failed';
        updateData.error = `HTTP ${response.status}: ${response.statusText}`;

        // Update subscription stats
        await db.update(webhookSubscriptions)
          .set({
            lastFailureAt: new Date().toISOString(),
            failureCount: subscription.failureCount + 1,
            updatedAt: new Date().toISOString()
          })
          .where(eq(webhookSubscriptions.id, subscription.id));

        // Determine if we should retry
        if (delivery.retryCount < (subscription.maxRetries || this.options.maxRetries as number)) {
          const retryDelay = this.calculateRetryDelay(delivery.retryCount);
          const nextRetryAt = new Date(Date.now() + retryDelay * 1000);
          
          updateData.status = 'retry';
          updateData.nextRetryAt = nextRetryAt.toISOString();

          logger.info('Webhook delivery failed, will retry', { 
            deliveryId: delivery.id,
            status: response.status,
            retryCount: delivery.retryCount,
            nextRetryAt: nextRetryAt.toISOString()
          });
        } else {
          logger.warn('Webhook delivery failed permanently', { 
            deliveryId: delivery.id,
            status: response.status,
            retryCount: delivery.retryCount
          });
        }
      }

      // Update the delivery
      await db.update(webhookDeliveries)
        .set(updateData)
        .where(eq(webhookDeliveries.id, delivery.id));

      // If we need to retry, queue it
      if (updateData.status === 'retry' && updateData.nextRetryAt) {
        const retryDelay = Math.max(1, Math.floor((new Date(updateData.nextRetryAt).getTime() - Date.now()) / 1000));
        
        // Get the updated delivery record
        const [updatedDelivery] = await db.select()
          .from(webhookDeliveries)
          .where(eq(webhookDeliveries.id, delivery.id));

        // Queue the delivery with delay
        await queueService.publish(this.QUEUE_NAME, updatedDelivery, {
          delay: retryDelay * 1000,
          maxAttempts: subscription.maxRetries || this.options.maxRetries as number
        });

        logger.debug('Webhook delivery queued for retry', {
          deliveryId: delivery.id,
          delaySeconds: retryDelay
        });
      }
    } catch (error) {
      logger.error('Error processing webhook delivery', {
        error: (error as Error).message,
        deliveryId: delivery.id,
        stack: (error as Error).stack
      });

      // Update the delivery
      await db.update(webhookDeliveries)
        .set({
          status: 'failed',
          error: (error as Error).message,
          errorDetail: { stack: (error as Error).stack },
          updatedAt: new Date().toISOString()
        })
        .where(eq(webhookDeliveries.id, delivery.id));

      // Re-throw to trigger retry
      throw error;
    }
  }

  /**
   * Calculate the retry delay for a failed delivery
   */
  private calculateRetryDelay(retryCount: number): number {
    const { retryDelays = [60, 300, 1800] } = this.options;
    
    if (retryCount < retryDelays.length) {
      return retryDelays[retryCount];
    }
    
    // Default to last defined delay
    return retryDelays[retryDelays.length - 1];
  }

  /**
   * Add security headers to the request
   */
  private addSecurityHeaders(
    headers: Record<string, string>, 
    subscription: WebhookSubscription, 
    delivery: WebhookDelivery
  ): void {
    const { securityScheme, securityKey, securityConfig } = subscription;

    switch (securityScheme) {
      case 'basic':
        const username = (securityConfig as any)?.username || 'api';
        headers['Authorization'] = `Basic ${Buffer.from(`${username}:${securityKey}`).toString('base64')}`;
        break;

      case 'bearer':
        headers['Authorization'] = `Bearer ${securityKey}`;
        break;

      case 'hmac':
        const timestamp = Date.now().toString();
        const payload = typeof delivery.payload === 'string' 
          ? delivery.payload
          : JSON.stringify(delivery.payload);
        
        const signature = this.generateHmacSignature(
          payload,
          securityKey || this.options.signatureSecret || 'webhook-secret',
          timestamp
        );

        headers[this.options.signatureHeader as string] = signature;
        headers['X-Webhook-Timestamp'] = timestamp;
        break;

      case 'oauth2':
        // OAuth2 would typically be handled by a separate auth flow
        // For now, we'll just use the securityKey as a bearer token
        headers['Authorization'] = `Bearer ${securityKey}`;
        break;

      case 'none':
      default:
        // No security headers needed
        break;
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateHmacSignature(payload: string, secret: string, timestamp: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(`${timestamp}.${payload}`);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Get subscriptions for a specific event
   */
  private async getSubscriptionsForEvent(eventName: string): Promise<WebhookSubscription[]> {
    // Check if cache is expired
    if (Date.now() > this.cacheExpiryTime) {
      this.invalidateCache();
    }

    // Check if we have the event in cache
    if (this.subscriptionsCache.has(eventName)) {
      return this.subscriptionsCache.get(eventName) || [];
    }

    // Load all active subscriptions for this event
    const subscriptions = await db.query.webhookSubscriptions.findMany({
      where: and(
        eq(webhookSubscriptions.status, 'active'),
        // This is a workaround as we can't directly query arrays in Drizzle yet
        // In a real implementation, you'd want to use a database-specific approach
        // or restructure the schema to better support this query pattern
      )
    });

    // Filter subscriptions that have this event
    const filteredSubscriptions = subscriptions.filter(sub => 
      (sub.events as string[]).includes(eventName)
    );

    // Cache the results
    this.subscriptionsCache.set(eventName, filteredSubscriptions);
    this.cacheExpiryTime = Date.now() + this.CACHE_TTL_MS;

    return filteredSubscriptions;
  }

  /**
   * Invalidate the subscriptions cache
   */
  private invalidateCache(): void {
    this.subscriptionsCache.clear();
    this.cacheExpiryTime = 0;
    logger.debug('Webhook subscriptions cache invalidated');
  }

  /**
   * Apply filters to determine if webhook should be delivered
   */
  private applyFilters(payload: any, filters: Record<string, any>): boolean {
    // Simple implementation - can be expanded with more complex filter logic
    for (const [path, expectedValue] of Object.entries(filters)) {
      const actualValue = this.getNestedValue(payload, path);
      
      if (Array.isArray(expectedValue)) {
        // If filter value is an array, check if actual value is in the array
        if (!expectedValue.includes(actualValue)) {
          return false;
        }
      } else if (actualValue !== expectedValue) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get a nested value from an object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((prev, curr) => {
      return prev && prev[curr] !== undefined ? prev[curr] : undefined;
    }, obj);
  }
}

// Export singleton instance
export const webhookService = new WebhookService();