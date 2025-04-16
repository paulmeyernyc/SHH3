import { eq, and, sql, desc, lt, inArray } from 'drizzle-orm';
import { db } from '../db';
import { logger } from '../utils/logger';
import { 
  eligibilityRequests, EligibilityRequest, InsertEligibilityRequest,
  eligibilityResponses, EligibilityResponse, InsertEligibilityResponse,
  eligibilityBenefits, EligibilityBenefit, InsertEligibilityBenefit,
  eligibilityCache, EligibilityCache, InsertEligibilityCache,
  eligibilityPayerRouting, EligibilityPayerRouting, InsertEligibilityPayerRouting,
  eligibilityClearinghouses, EligibilityClearinghouse, InsertEligibilityClearinghouse,
  eligibilityAuditLogs, EligibilityAuditLog, InsertEligibilityAuditLog
} from '../../shared/eligibility-schema';

/**
 * Storage service for Eligibility-related database operations
 */
class EligibilityStorage {
  /**
   * Create a new eligibility request
   */
  async createEligibilityRequest(data: InsertEligibilityRequest): Promise<EligibilityRequest> {
    try {
      logger.info('Creating eligibility request', { transactionId: data.transactionId });
      const [request] = await db.insert(eligibilityRequests).values(data).returning();
      return request;
    } catch (error) {
      logger.error('Error creating eligibility request', { error, data });
      throw new Error(`Failed to create eligibility request: ${error.message}`);
    }
  }

  /**
   * Get eligibility request by ID
   */
  async getEligibilityRequest(id: number): Promise<EligibilityRequest | undefined> {
    try {
      const [request] = await db.select().from(eligibilityRequests).where(eq(eligibilityRequests.id, id));
      return request;
    } catch (error) {
      logger.error('Error getting eligibility request', { error, id });
      throw new Error(`Failed to get eligibility request: ${error.message}`);
    }
  }

  /**
   * Get eligibility request by transaction ID
   */
  async getEligibilityRequestByTransactionId(transactionId: string): Promise<EligibilityRequest | undefined> {
    try {
      const [request] = await db.select().from(eligibilityRequests).where(eq(eligibilityRequests.transactionId, transactionId));
      return request;
    } catch (error) {
      logger.error('Error getting eligibility request by transaction ID', { error, transactionId });
      throw new Error(`Failed to get eligibility request by transaction ID: ${error.message}`);
    }
  }

  /**
   * Update eligibility request status
   */
  async updateEligibilityRequestStatus(id: number, status: string, updateData: Partial<EligibilityRequest> = {}): Promise<EligibilityRequest> {
    try {
      const [updated] = await db.update(eligibilityRequests)
        .set({ 
          status: status as any, 
          updatedAt: new Date(),
          ...updateData
        })
        .where(eq(eligibilityRequests.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      logger.error('Error updating eligibility request status', { error, id, status });
      throw new Error(`Failed to update eligibility request status: ${error.message}`);
    }
  }

  /**
   * Get pending eligibility requests for processing
   */
  async getPendingEligibilityRequests(limit = 10): Promise<EligibilityRequest[]> {
    try {
      const requests = await db.select().from(eligibilityRequests)
        .where(eq(eligibilityRequests.status, 'pending'))
        .orderBy(eligibilityRequests.createdAt)
        .limit(limit);
      
      return requests;
    } catch (error) {
      logger.error('Error getting pending eligibility requests', { error, limit });
      throw new Error(`Failed to get pending eligibility requests: ${error.message}`);
    }
  }

  /**
   * Get retry-ready eligibility requests
   */
  async getRetryReadyRequests(limit = 10): Promise<EligibilityRequest[]> {
    try {
      const now = new Date();
      
      const requests = await db.select().from(eligibilityRequests)
        .where(
          and(
            eq(eligibilityRequests.status, 'failed'),
            lt(eligibilityRequests.nextRetryAt, now)
          )
        )
        .orderBy(eligibilityRequests.nextRetryAt)
        .limit(limit);
      
      return requests;
    } catch (error) {
      logger.error('Error getting retry-ready eligibility requests', { error, limit });
      throw new Error(`Failed to get retry-ready eligibility requests: ${error.message}`);
    }
  }

  /**
   * Create a new eligibility response
   */
  async createEligibilityResponse(data: InsertEligibilityResponse): Promise<EligibilityResponse> {
    try {
      logger.info('Creating eligibility response', { requestId: data.requestId });
      const [response] = await db.insert(eligibilityResponses).values(data).returning();
      return response;
    } catch (error) {
      logger.error('Error creating eligibility response', { error, data });
      throw new Error(`Failed to create eligibility response: ${error.message}`);
    }
  }

  /**
   * Get eligibility response by ID
   */
  async getEligibilityResponse(id: number): Promise<EligibilityResponse | undefined> {
    try {
      const [response] = await db.select().from(eligibilityResponses).where(eq(eligibilityResponses.id, id));
      return response;
    } catch (error) {
      logger.error('Error getting eligibility response', { error, id });
      throw new Error(`Failed to get eligibility response: ${error.message}`);
    }
  }

  /**
   * Get eligibility response by request ID
   */
  async getEligibilityResponseByRequestId(requestId: number): Promise<EligibilityResponse | undefined> {
    try {
      const [response] = await db.select().from(eligibilityResponses).where(eq(eligibilityResponses.requestId, requestId));
      return response;
    } catch (error) {
      logger.error('Error getting eligibility response by request ID', { error, requestId });
      throw new Error(`Failed to get eligibility response by request ID: ${error.message}`);
    }
  }

  /**
   * Update eligibility response
   */
  async updateEligibilityResponse(id: number, updateData: Partial<EligibilityResponse>): Promise<EligibilityResponse> {
    try {
      const [updated] = await db.update(eligibilityResponses)
        .set({ 
          ...updateData,
          processedAt: new Date()
        })
        .where(eq(eligibilityResponses.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      logger.error('Error updating eligibility response', { error, id, updateData });
      throw new Error(`Failed to update eligibility response: ${error.message}`);
    }
  }

  /**
   * Create multiple eligibility benefits
   */
  async createEligibilityBenefits(benefits: InsertEligibilityBenefit[]): Promise<EligibilityBenefit[]> {
    try {
      if (benefits.length === 0) {
        return [];
      }
      
      logger.info('Creating eligibility benefits', { count: benefits.length, responseId: benefits[0].responseId });
      const createdBenefits = await db.insert(eligibilityBenefits).values(benefits).returning();
      return createdBenefits;
    } catch (error) {
      logger.error('Error creating eligibility benefits', { error, benefitsCount: benefits.length });
      throw new Error(`Failed to create eligibility benefits: ${error.message}`);
    }
  }

  /**
   * Get eligibility benefits by response ID
   */
  async getEligibilityBenefitsByResponseId(responseId: number): Promise<EligibilityBenefit[]> {
    try {
      const benefits = await db.select().from(eligibilityBenefits).where(eq(eligibilityBenefits.responseId, responseId));
      return benefits;
    } catch (error) {
      logger.error('Error getting eligibility benefits by response ID', { error, responseId });
      throw new Error(`Failed to get eligibility benefits by response ID: ${error.message}`);
    }
  }

  /**
   * Check eligibility cache
   */
  async checkEligibilityCache(
    subscriberId: string,
    payerId: string,
    serviceType?: string,
    servicedDate?: string
  ): Promise<EligibilityCache | undefined> {
    try {
      logger.info('Checking eligibility cache', { subscriberId, payerId, serviceType, servicedDate });
      
      const now = new Date();
      
      // Build query conditions
      const conditions = [
        eq(eligibilityCache.subscriberId, subscriberId),
        eq(eligibilityCache.payerId, payerId),
        lt(now, eligibilityCache.expiresAt)
      ];
      
      if (serviceType) {
        conditions.push(eq(eligibilityCache.serviceType, serviceType));
      }
      
      if (servicedDate) {
        conditions.push(eq(eligibilityCache.servicedDate, servicedDate));
      }
      
      const [cacheEntry] = await db.select().from(eligibilityCache)
        .where(and(...conditions))
        .orderBy(desc(eligibilityCache.createdAt))
        .limit(1);
      
      if (cacheEntry) {
        // Update hit count and last hit time
        await db.update(eligibilityCache)
          .set({ 
            hitCount: sql`${eligibilityCache.hitCount} + 1`,
            lastHitAt: now
          })
          .where(eq(eligibilityCache.id, cacheEntry.id));
      }
      
      return cacheEntry;
    } catch (error) {
      logger.error('Error checking eligibility cache', { error, subscriberId, payerId });
      throw new Error(`Failed to check eligibility cache: ${error.message}`);
    }
  }

  /**
   * Create eligibility cache entry
   */
  async createEligibilityCache(data: InsertEligibilityCache): Promise<EligibilityCache> {
    try {
      logger.info('Creating eligibility cache entry', { 
        subscriberId: data.subscriberId, 
        payerId: data.payerId 
      });
      
      const [cacheEntry] = await db.insert(eligibilityCache).values(data).returning();
      return cacheEntry;
    } catch (error) {
      logger.error('Error creating eligibility cache entry', { error, data });
      throw new Error(`Failed to create eligibility cache entry: ${error.message}`);
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCacheEntries(): Promise<number> {
    try {
      const now = new Date();
      
      const { count } = await db.delete(eligibilityCache)
        .where(lt(eligibilityCache.expiresAt, now))
        .returning({ count: sql`count(*)` })
        .then(result => result[0] || { count: 0 });
      
      logger.info(`Cleared ${count} expired eligibility cache entries`);
      return count;
    } catch (error) {
      logger.error('Error clearing expired eligibility cache entries', { error });
      throw new Error(`Failed to clear expired eligibility cache entries: ${error.message}`);
    }
  }

  /**
   * Get payer routing information
   */
  async getPayerRouting(payerId: string): Promise<EligibilityPayerRouting | undefined> {
    try {
      const [payerRouting] = await db.select().from(eligibilityPayerRouting)
        .where(and(
          eq(eligibilityPayerRouting.payerId, payerId),
          eq(eligibilityPayerRouting.isActive, true)
        ));
      
      return payerRouting;
    } catch (error) {
      logger.error('Error getting payer routing', { error, payerId });
      throw new Error(`Failed to get payer routing: ${error.message}`);
    }
  }

  /**
   * Get multiple payer routing configurations
   */
  async getPayerRoutings(payerIds: string[]): Promise<EligibilityPayerRouting[]> {
    try {
      if (payerIds.length === 0) {
        return [];
      }
      
      const payerRoutings = await db.select().from(eligibilityPayerRouting)
        .where(and(
          inArray(eligibilityPayerRouting.payerId, payerIds),
          eq(eligibilityPayerRouting.isActive, true)
        ));
      
      return payerRoutings;
    } catch (error) {
      logger.error('Error getting multiple payer routings', { error, payerIds });
      throw new Error(`Failed to get multiple payer routings: ${error.message}`);
    }
  }

  /**
   * Create payer routing
   */
  async createPayerRouting(data: InsertEligibilityPayerRouting): Promise<EligibilityPayerRouting> {
    try {
      logger.info('Creating payer routing', { payerId: data.payerId, payerName: data.payerName });
      const [payerRouting] = await db.insert(eligibilityPayerRouting).values(data).returning();
      return payerRouting;
    } catch (error) {
      logger.error('Error creating payer routing', { error, data });
      throw new Error(`Failed to create payer routing: ${error.message}`);
    }
  }

  /**
   * Update payer routing
   */
  async updatePayerRouting(payerId: string, updateData: Partial<EligibilityPayerRouting>): Promise<EligibilityPayerRouting> {
    try {
      const [updated] = await db.update(eligibilityPayerRouting)
        .set({ 
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(eligibilityPayerRouting.payerId, payerId))
        .returning();
      
      return updated;
    } catch (error) {
      logger.error('Error updating payer routing', { error, payerId, updateData });
      throw new Error(`Failed to update payer routing: ${error.message}`);
    }
  }

  /**
   * Get clearinghouse configuration
   */
  async getClearinghouse(clearinghouseId: string): Promise<EligibilityClearinghouse | undefined> {
    try {
      const [clearinghouse] = await db.select().from(eligibilityClearinghouses)
        .where(and(
          eq(eligibilityClearinghouses.clearinghouseId, clearinghouseId),
          eq(eligibilityClearinghouses.isActive, true)
        ));
      
      return clearinghouse;
    } catch (error) {
      logger.error('Error getting clearinghouse', { error, clearinghouseId });
      throw new Error(`Failed to get clearinghouse: ${error.message}`);
    }
  }

  /**
   * Create clearinghouse configuration
   */
  async createClearinghouse(data: InsertEligibilityClearinghouse): Promise<EligibilityClearinghouse> {
    try {
      logger.info('Creating clearinghouse', { clearinghouseId: data.clearinghouseId, name: data.name });
      const [clearinghouse] = await db.insert(eligibilityClearinghouses).values(data).returning();
      return clearinghouse;
    } catch (error) {
      logger.error('Error creating clearinghouse', { error, data });
      throw new Error(`Failed to create clearinghouse: ${error.message}`);
    }
  }

  /**
   * Log eligibility event for audit
   */
  async logAuditEvent(data: InsertEligibilityAuditLog): Promise<EligibilityAuditLog> {
    try {
      // Don't log detailed event information in the standard logs for privacy
      logger.info('Logging eligibility audit event', { 
        eventType: data.eventType, 
        requestId: data.requestId,
        responseId: data.responseId
      });
      
      const [auditLog] = await db.insert(eligibilityAuditLogs).values(data).returning();
      return auditLog;
    } catch (error) {
      logger.error('Error logging eligibility audit event', { 
        error, 
        eventType: data.eventType,
        requestId: data.requestId 
      });
      throw new Error(`Failed to log eligibility audit event: ${error.message}`);
    }
  }

  /**
   * Get audit logs for a request
   */
  async getAuditLogsByRequestId(requestId: number): Promise<EligibilityAuditLog[]> {
    try {
      const auditLogs = await db.select().from(eligibilityAuditLogs)
        .where(eq(eligibilityAuditLogs.requestId, requestId))
        .orderBy(eligibilityAuditLogs.eventTimestamp);
      
      return auditLogs;
    } catch (error) {
      logger.error('Error getting audit logs by request ID', { error, requestId });
      throw new Error(`Failed to get audit logs by request ID: ${error.message}`);
    }
  }

  /**
   * Lookup a response by cache parameters
   */
  async getResponseByCacheParams(
    subscriberId: string,
    payerId: string,
    serviceType?: string | null,
    servicedDate?: string | null
  ): Promise<EligibilityResponse | undefined> {
    try {
      const cacheEntry = await this.checkEligibilityCache(subscriberId, payerId, serviceType || undefined, servicedDate || undefined);
      
      if (!cacheEntry) {
        return undefined;
      }
      
      const response = await this.getEligibilityResponse(cacheEntry.responseId);
      return response;
    } catch (error) {
      logger.error('Error getting response by cache parameters', { error, subscriberId, payerId });
      throw new Error(`Failed to get response by cache parameters: ${error.message}`);
    }
  }
}

export const eligibilityStorage = new EligibilityStorage();