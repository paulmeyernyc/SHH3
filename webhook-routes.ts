/**
 * Webhook API Routes
 * 
 * This module provides REST API endpoints for managing webhook subscriptions and events.
 */

import express from 'express';
import { webhookService } from './webhook-service';
import { logger } from '../observability';
import { insertWebhookEventSchema, insertWebhookSubscriptionSchema } from '../../shared/webhook-schema';
import { z } from 'zod';

// Create a router
const router = express.Router();

// Middleware to check if the user is authenticated
const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  next();
};

// Middleware to check if the user has admin permissions
const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};

/**
 * @swagger
 * /api/webhooks/events:
 *   get:
 *     summary: Get all webhook event types
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of webhook event types
 *       401:
 *         description: Not authenticated
 */
router.get('/events', isAuthenticated, async (req, res) => {
  try {
    const events = await webhookService.getEvents();
    res.json(events);
  } catch (error) {
    logger.error('Error getting webhook events', { error: (error as Error).message });
    res.status(500).json({ message: 'Failed to get webhook events', error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/webhooks/events:
 *   post:
 *     summary: Register a new webhook event type
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookEvent'
 *     responses:
 *       201:
 *         description: Webhook event registered successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 */
router.post('/events', isAdmin, async (req, res) => {
  try {
    // Validate request body
    const validatedData = insertWebhookEventSchema.parse(req.body);
    
    // Create the event
    const event = await webhookService.registerEvent({
      ...validatedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    res.status(201).json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid webhook event data', errors: error.errors });
    }
    
    logger.error('Error registering webhook event', { error: (error as Error).message });
    res.status(500).json({ message: 'Failed to register webhook event', error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/webhooks/subscriptions:
 *   get:
 *     summary: Get webhook subscriptions for the current user
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of webhook subscriptions
 *       401:
 *         description: Not authenticated
 */
router.get('/subscriptions', isAuthenticated, async (req, res) => {
  try {
    // Get user ID from authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }

    const subscriptions = await webhookService.getSubscriptions(userId, 'user');
    res.json(subscriptions);
  } catch (error) {
    logger.error('Error getting webhook subscriptions', { error: (error as Error).message });
    res.status(500).json({ message: 'Failed to get webhook subscriptions', error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/webhooks/subscriptions:
 *   post:
 *     summary: Create a new webhook subscription
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookSubscription'
 *     responses:
 *       201:
 *         description: Webhook subscription created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Not authenticated
 */
router.post('/subscriptions', isAuthenticated, async (req, res) => {
  try {
    // Get user ID from authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }

    // Validate request body
    const validatedData = insertWebhookSubscriptionSchema.parse({
      ...req.body,
      subscriberId: userId,
      subscriberType: 'user'
    });
    
    // Create the subscription
    const subscription = await webhookService.createSubscription({
      ...validatedData,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    res.status(201).json(subscription);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid webhook subscription data', errors: error.errors });
    }
    
    logger.error('Error creating webhook subscription', { error: (error as Error).message });
    res.status(500).json({ message: 'Failed to create webhook subscription', error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/webhooks/subscriptions/{id}:
 *   get:
 *     summary: Get a specific webhook subscription
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Webhook subscription details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden - not owner of subscription
 *       404:
 *         description: Subscription not found
 */
router.get('/subscriptions/:id', isAuthenticated, async (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    if (isNaN(subscriptionId)) {
      return res.status(400).json({ message: 'Invalid subscription ID' });
    }

    // Get user ID from authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }

    // Get the subscription
    const subscriptions = await webhookService.getSubscriptions(userId, 'user');
    const subscription = subscriptions.find(s => s.id === subscriptionId);

    if (!subscription) {
      return res.status(404).json({ message: 'Webhook subscription not found' });
    }

    res.json(subscription);
  } catch (error) {
    logger.error('Error getting webhook subscription', { error: (error as Error).message });
    res.status(500).json({ message: 'Failed to get webhook subscription', error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/webhooks/subscriptions/{id}:
 *   put:
 *     summary: Update a webhook subscription
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookSubscriptionUpdate'
 *     responses:
 *       200:
 *         description: Webhook subscription updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden - not owner of subscription
 *       404:
 *         description: Subscription not found
 */
router.put('/subscriptions/:id', isAuthenticated, async (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    if (isNaN(subscriptionId)) {
      return res.status(400).json({ message: 'Invalid subscription ID' });
    }

    // Get user ID from authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }

    // Verify ownership
    const subscriptions = await webhookService.getSubscriptions(userId, 'user');
    const subscription = subscriptions.find(s => s.id === subscriptionId);

    if (!subscription) {
      return res.status(404).json({ message: 'Webhook subscription not found' });
    }

    // Validate request body (excluding certain fields)
    const updateSchema = insertWebhookSubscriptionSchema.omit({
      subscriberId: true,
      subscriberType: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true
    });

    const validatedData = updateSchema.parse(req.body);
    
    // Update the subscription
    const updatedSubscription = await webhookService.updateSubscription(
      subscriptionId,
      validatedData
    );
    
    res.json(updatedSubscription);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid webhook subscription data', errors: error.errors });
    }
    
    logger.error('Error updating webhook subscription', { error: (error as Error).message });
    res.status(500).json({ message: 'Failed to update webhook subscription', error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/webhooks/subscriptions/{id}:
 *   delete:
 *     summary: Delete a webhook subscription
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Webhook subscription deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden - not owner of subscription
 *       404:
 *         description: Subscription not found
 */
router.delete('/subscriptions/:id', isAuthenticated, async (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    if (isNaN(subscriptionId)) {
      return res.status(400).json({ message: 'Invalid subscription ID' });
    }

    // Get user ID from authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }

    // Verify ownership
    const subscriptions = await webhookService.getSubscriptions(userId, 'user');
    const subscription = subscriptions.find(s => s.id === subscriptionId);

    if (!subscription) {
      return res.status(404).json({ message: 'Webhook subscription not found' });
    }

    // Delete the subscription
    await webhookService.deleteSubscription(subscriptionId);
    
    res.status(204).end();
  } catch (error) {
    logger.error('Error deleting webhook subscription', { error: (error as Error).message });
    res.status(500).json({ message: 'Failed to delete webhook subscription', error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/webhooks/deliveries/{subscriptionId}:
 *   get:
 *     summary: Get webhook deliveries for a subscription
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: subscriptionId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 100
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of webhook deliveries
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden - not owner of subscription
 *       404:
 *         description: Subscription not found
 */
router.get('/deliveries/:subscriptionId', isAuthenticated, async (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.subscriptionId);
    if (isNaN(subscriptionId)) {
      return res.status(400).json({ message: 'Invalid subscription ID' });
    }

    // Get user ID from authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }

    // Verify ownership
    const subscriptions = await webhookService.getSubscriptions(userId, 'user');
    const subscription = subscriptions.find(s => s.id === subscriptionId);

    if (!subscription) {
      return res.status(404).json({ message: 'Webhook subscription not found' });
    }

    // Parse pagination params
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get deliveries
    const result = await webhookService.getDeliveries(subscriptionId, limit, offset);
    
    res.json(result);
  } catch (error) {
    logger.error('Error getting webhook deliveries', { error: (error as Error).message });
    res.status(500).json({ message: 'Failed to get webhook deliveries', error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/webhooks/deliveries/{id}/retry:
 *   post:
 *     summary: Retry a failed webhook delivery
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Webhook delivery queued for retry
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden - not owner of subscription
 *       404:
 *         description: Delivery not found
 */
router.post('/deliveries/:id/retry', isAuthenticated, async (req, res) => {
  try {
    const deliveryId = parseInt(req.params.id);
    if (isNaN(deliveryId)) {
      return res.status(400).json({ message: 'Invalid delivery ID' });
    }

    // Get user ID from authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }

    // Get the delivery, this will throw if not found
    const updatedDelivery = await webhookService.retryDelivery(deliveryId);
    
    res.json(updatedDelivery);
  } catch (error) {
    logger.error('Error retrying webhook delivery', { error: (error as Error).message });
    res.status(500).json({ message: 'Failed to retry webhook delivery', error: (error as Error).message });
  }
});

// Export the router
export default router;