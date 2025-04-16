import { Request, Response, NextFunction } from 'express';
import { MeteringService } from '../services/billing/metering-service';

/**
 * Middleware for tracking billable API usage
 * 
 * This middleware can be applied to routes that should be tracked for billing purposes.
 * It records the API call in the metering service for later aggregation and billing.
 */
export function trackApiUsage(options: {
  serviceName: string;
  usageType: string;
  unit: string;
  getQuantity?: (req: Request) => number;
  getBillingAccountId: (req: Request) => string | null | Promise<string | null>;
  getResourceId?: (req: Request) => string | null | Promise<string | null>;
  getResourceType?: (req: Request) => string | null | Promise<string | null>;
}) {
  const meteringService = new MeteringService();
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime();
    
    // Capture the original end method
    const originalEnd = res.end;
    
    // Override the end method
    // @ts-ignore
    res.end = async function(chunk?: any, encoding?: any, callback?: any) {
      // Get the elapsed time in milliseconds
      const elapsedHrTime = process.hrtime(startTime);
      const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1000000;
      
      try {
        // Determine the billing account
        const billingAccountId = await options.getBillingAccountId(req);
        
        // Only track if we have a billing account
        if (billingAccountId) {
          // Determine the quantity to bill
          // This could be a fixed amount or based on something like data size
          const quantity = options.getQuantity ? options.getQuantity(req) : 1;
          
          // Get resource IDs if available
          const resourceId = options.getResourceId ? await options.getResourceId(req) : null;
          const resourceType = options.getResourceType ? await options.getResourceType(req) : null;
          
          // Record the usage
          await meteringService.recordUsage({
            billingAccountId,
            serviceId: '00000000-0000-0000-0000-000000000000', // Replace with actual service ID
            serviceName: options.serviceName,
            usageType: options.usageType,
            unit: options.unit,
            quantity: quantity.toString(),
            resourceId: resourceId || undefined,
            resourceType: resourceType || undefined,
            sourceIp: req.ip,
            userId: req.user?.id,
            metadata: {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              responseTime: elapsedTimeInMs,
              userAgent: req.headers['user-agent']
            }
          });
        }
      } catch (error) {
        // Log error but don't block the response
        console.error('Error tracking API usage:', error);
      }
      
      // Call the original end method
      // @ts-ignore
      originalEnd.apply(res, arguments);
    };
    
    next();
  };
}

/**
 * Middleware for tracking resource usage (storage, data processing, etc.)
 * 
 * This middleware can be used for tracking non-API resource consumption,
 * such as storage space used, data processing, or other custom metrics.
 */
export function trackResourceUsage(
  billingAccountId: string,
  serviceName: string,
  usageType: string,
  unit: string,
  quantity: number,
  metadata: any = {}
) {
  const meteringService = new MeteringService();
  
  return async () => {
    try {
      await meteringService.recordUsage({
        billingAccountId,
        serviceId: '00000000-0000-0000-0000-000000000000', // Replace with actual service ID
        serviceName,
        usageType,
        unit,
        quantity: quantity.toString(),
        metadata
      });
    } catch (error) {
      console.error('Error tracking resource usage:', error);
      throw error;
    }
  };
}

/**
 * Rate limiting middleware with tracking
 * 
 * This combines rate limiting with usage tracking for billing.
 * It can be used to implement tiered pricing based on API usage.
 */
export function rateLimitWithTracking(options: {
  windowMs: number;
  maxRequests: number;
  serviceName: string;
  usageType: string;
  unit: string;
  getBillingAccountId: (req: Request) => string | null | Promise<string | null>;
}) {
  // This would typically use a package like 'express-rate-limit'
  // Here's a simplified version that just tracks usage
  const meteringService = new MeteringService();
  
  // Keep track of request counts
  const requestCounts: Record<string, {
    count: number;
    resetTime: number;
  }> = {};
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const billingAccountId = await options.getBillingAccountId(req);
      
      if (!billingAccountId) {
        // No billing account to track, just proceed
        return next();
      }
      
      const key = `${billingAccountId}:${req.ip}`;
      const now = Date.now();
      
      // Initialize or reset counter if needed
      if (!requestCounts[key] || requestCounts[key].resetTime <= now) {
        requestCounts[key] = {
          count: 0,
          resetTime: now + options.windowMs
        };
      }
      
      // Increment the counter
      requestCounts[key].count += 1;
      
      // Track the API call
      await meteringService.recordUsage({
        billingAccountId,
        serviceId: '00000000-0000-0000-0000-000000000000', // Replace with actual service ID
        serviceName: options.serviceName,
        usageType: options.usageType,
        unit: options.unit,
        quantity: '1',
        sourceIp: req.ip,
        userId: req.user?.id,
        metadata: {
          method: req.method,
          path: req.path,
          requestsInWindow: requestCounts[key].count,
          windowMs: options.windowMs
        }
      });
      
      // Check if we're over the limit
      if (requestCounts[key].count > options.maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((requestCounts[key].resetTime - now) / 1000)
        });
      }
      
      next();
    } catch (error) {
      console.error('Error in rate limit middleware:', error);
      next(error);
    }
  };
}