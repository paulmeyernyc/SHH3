/**
 * Claims Service
 * 
 * This service implements the dual-path claims processing architecture.
 * It orchestrates between the internal rules engine and external payer gateway.
 */
import { v4 as uuidv4 } from 'uuid';
import { eq, and, asc, desc, sql, like } from 'drizzle-orm';
import { claims, claimLineItems, claimEvents, Claim, ClaimLineItem, InsertClaim, InsertClaimLineItem, InsertClaimEvent } from '@shared/claims-schema';
import { InternalRulesEngine } from './internal-rules-engine';
import { ExternalPayerGateway } from './external-payer-gateway';
import logger from '../../logger';

export enum ProcessingPath {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
  AUTO = 'auto'
}

type ProcessingOptions = {
  path?: ProcessingPath;
  bypassCache?: boolean;
  payerId?: string;
  priority?: 'normal' | 'urgent' | 'low';
  simulateOnly?: boolean;
  notifyUserId?: string;
};

export class ClaimsService {
  private db: any; // Replace with proper type when available
  private internalRulesEngine: InternalRulesEngine;
  private externalPayerGateway: ExternalPayerGateway;

  constructor(db: any) {
    this.db = db;
    this.internalRulesEngine = new InternalRulesEngine(db);
    this.externalPayerGateway = new ExternalPayerGateway(db);
    
    // Start the external payer gateway's periodic processing
    this.externalPayerGateway.startPeriodicProcessing();
  }

  /**
   * Submit a new claim
   * @param claimData The claim data to submit
   * @param lineItems The line items for the claim
   * @param options Processing options
   * @returns The created claim
   */
  async submitClaim(
    claimData: Omit<InsertClaim, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'lastStatusUpdate'>,
    lineItems: Omit<InsertClaimLineItem, 'id' | 'claimId'>[],
    options: ProcessingOptions = {}
  ): Promise<Claim> {
    try {
      logger.info('Submitting new claim', { patientId: claimData.patientId, providerId: claimData.providerId });
      
      const now = new Date();
      const claimId = uuidv4();
      
      // Determine processing path
      const path = options.path || ProcessingPath.AUTO;
      const simulateOnly = options.simulateOnly || false;
      
      // If simulating, force internal path
      const effectivePath = simulateOnly ? ProcessingPath.INTERNAL : path;
      
      // Create the claim record
      const claim: InsertClaim = {
        id: claimId,
        patientId: claimData.patientId,
        providerId: claimData.providerId,
        organizationId: claimData.organizationId,
        payerId: claimData.payerId || options.payerId,
        type: claimData.type || 'medical',
        status: 'NEW',
        processingPath: effectivePath,
        priority: options.priority || 'normal',
        serviceDate: claimData.serviceDate,
        submissionDate: now,
        createdAt: now,
        updatedAt: now,
        lastStatusUpdate: now
      };
      
      // Insert claim
      await this.db.insert(claims).values(claim);
      
      // Insert line items
      for (const item of lineItems) {
        const lineItemId = uuidv4();
        await this.db.insert(claimLineItems).values({
          id: lineItemId,
          claimId,
          serviceCode: item.serviceCode,
          description: item.description,
          amount: item.amount,
          quantity: item.quantity || 1,
          serviceDate: item.serviceDate || claimData.serviceDate,
          createdAt: now,
          updatedAt: now
        });
      }
      
      // Log event
      await this.logClaimEvent(claimId, 'NEW', 'CLAIM_CREATED', {
        path: effectivePath,
        simulateOnly,
        lineItemCount: lineItems.length
      });
      
      // Process the claim based on the selected path
      this.processClaim(claimId, options).catch(error => {
        logger.error(`Error processing claim ${claimId}`, { error });
      });
      
      // Get the full claim for return
      const [createdClaim] = await this.db
        .select()
        .from(claims)
        .where(eq(claims.id, claimId));
      
      return createdClaim;
    } catch (error) {
      logger.error('Error submitting claim', { error });
      throw error;
    }
  }

  /**
   * Process a claim based on the selected path
   * @param claimId The ID of the claim to process
   * @param options Processing options
   */
  async processClaim(claimId: string, options: ProcessingOptions = {}): Promise<void> {
    try {
      logger.info(`Processing claim ${claimId}`);
      
      // Get the claim
      const [claim] = await this.db
        .select()
        .from(claims)
        .where(eq(claims.id, claimId));
      
      if (!claim) {
        throw new Error(`Claim ${claimId} not found`);
      }
      
      // Update status to PROCESSING
      await this.db
        .update(claims)
        .set({
          status: 'PROCESSING',
          lastStatusUpdate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(claims.id, claimId));
      
      // Log event
      await this.logClaimEvent(claimId, 'PROCESSING', 'PROCESSING_STARTED', {
        path: options.path || claim.processingPath
      });
      
      // Determine processing path
      const path = options.path || claim.processingPath || ProcessingPath.AUTO;
      
      let effectivePath = path;
      if (path === ProcessingPath.AUTO) {
        // Auto-determine path based on business rules
        // For prototype, we'll use a simple rule: use internal for small claims
        const lineItems = await this.db
          .select()
          .from(claimLineItems)
          .where(eq(claimLineItems.claimId, claimId));
        
        const totalAmount = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
        
        if (options.simulateOnly || totalAmount < 500) {
          effectivePath = ProcessingPath.INTERNAL;
        } else {
          effectivePath = ProcessingPath.EXTERNAL;
        }
        
        // Update the claim with the determined path
        await this.db
          .update(claims)
          .set({
            processingPath: effectivePath,
            updatedAt: new Date()
          })
          .where(eq(claims.id, claimId));
        
        // Log the path selection
        await this.logClaimEvent(claimId, 'PROCESSING', 'PATH_SELECTED', {
          path: effectivePath,
          reason: options.simulateOnly ? 'Simulation requested' : `Claim amount: $${totalAmount}`
        });
      }
      
      // Process based on the selected path
      if (effectivePath === ProcessingPath.INTERNAL) {
        // Process using internal rules engine
        const result = await this.internalRulesEngine.processClaim(claimId);
        
        // Additional processing after internal rules
        if (result.success) {
          // If simulation only, update claim status
          if (options.simulateOnly) {
            await this.db
              .update(claims)
              .set({
                status: 'SIMULATED',
                simulationResult: result,
                lastStatusUpdate: new Date(),
                updatedAt: new Date()
              })
              .where(eq(claims.id, claimId));
            
            // Log simulation event
            await this.logClaimEvent(claimId, 'SIMULATED', 'SIMULATION_COMPLETED', {
              result
            });
          }
        }
      } else if (effectivePath === ProcessingPath.EXTERNAL) {
        // Process using external payer gateway
        const result = await this.externalPayerGateway.submitClaim(claimId);
        
        // No additional processing needed here as the gateway handles status updates
      }
    } catch (error) {
      logger.error(`Error processing claim ${claimId}`, { error });
      
      // Update claim status to error
      await this.db
        .update(claims)
        .set({
          status: 'ERROR',
          lastStatusUpdate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(claims.id, claimId));
      
      // Log error event
      await this.logClaimEvent(claimId, 'ERROR', 'PROCESSING_ERROR', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get a claim by ID
   * @param claimId The ID of the claim
   * @returns The claim
   */
  async getClaim(claimId: string): Promise<{
    claim: Claim;
    lineItems: ClaimLineItem[];
    events: any[];
  } | null> {
    try {
      // Get the claim
      const [claim] = await this.db
        .select()
        .from(claims)
        .where(eq(claims.id, claimId));
      
      if (!claim) {
        return null;
      }
      
      // Get line items
      const lineItems = await this.db
        .select()
        .from(claimLineItems)
        .where(eq(claimLineItems.claimId, claimId));
      
      // Get events
      const events = await this.db
        .select()
        .from(claimEvents)
        .where(eq(claimEvents.claimId, claimId))
        .orderBy(desc(claimEvents.timestamp));
      
      return {
        claim,
        lineItems,
        events
      };
    } catch (error) {
      logger.error(`Error getting claim ${claimId}`, { error });
      throw error;
    }
  }

  /**
   * Search for claims with optional filters
   * @param filters Optional search filters
   * @returns A list of matching claims
   */
  async searchClaims(filters: {
    patientId?: string;
    providerId?: string;
    organizationId?: string;
    payerId?: string;
    status?: string;
    type?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    claims: Claim[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      // Default pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;
      
      // Build query conditions
      let conditions = sql`TRUE`;
      
      if (filters.patientId) {
        conditions = sql`${conditions} AND ${claims.patientId} = ${filters.patientId}`;
      }
      
      if (filters.providerId) {
        conditions = sql`${conditions} AND ${claims.providerId} = ${filters.providerId}`;
      }
      
      if (filters.organizationId) {
        conditions = sql`${conditions} AND ${claims.organizationId} = ${filters.organizationId}`;
      }
      
      if (filters.payerId) {
        conditions = sql`${conditions} AND ${claims.payerId} = ${filters.payerId}`;
      }
      
      if (filters.status) {
        conditions = sql`${conditions} AND ${claims.status} = ${filters.status}`;
      }
      
      if (filters.type) {
        conditions = sql`${conditions} AND ${claims.type} = ${filters.type}`;
      }
      
      if (filters.dateFrom) {
        conditions = sql`${conditions} AND ${claims.serviceDate} >= ${filters.dateFrom}`;
      }
      
      if (filters.dateTo) {
        conditions = sql`${conditions} AND ${claims.serviceDate} <= ${filters.dateTo}`;
      }
      
      // Get total count
      const [totalResult] = await this.db
        .select({ count: sql`COUNT(*)` })
        .from(claims)
        .where(conditions);
      
      const total = parseInt(totalResult.count);
      
      // Get paginated results
      const results = await this.db
        .select()
        .from(claims)
        .where(conditions)
        .orderBy(desc(claims.createdAt))
        .limit(limit)
        .offset(offset);
      
      return {
        claims: results,
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error searching claims', { error });
      throw error;
    }
  }

  /**
   * Cancel a claim
   * @param claimId The ID of the claim to cancel
   * @param reason The reason for cancellation
   * @returns Success status
   */
  async cancelClaim(claimId: string, reason: string): Promise<boolean> {
    try {
      // Get the claim
      const [claim] = await this.db
        .select()
        .from(claims)
        .where(eq(claims.id, claimId));
      
      if (!claim) {
        throw new Error(`Claim ${claimId} not found`);
      }
      
      // Check if claim can be canceled
      const cancelableStatuses = ['NEW', 'PROCESSING', 'PENDING', 'ERROR'];
      if (!cancelableStatuses.includes(claim.status)) {
        throw new Error(`Cannot cancel claim in ${claim.status} status`);
      }
      
      // Update claim status
      await this.db
        .update(claims)
        .set({
          status: 'CANCELED',
          lastStatusUpdate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(claims.id, claimId));
      
      // Log event
      await this.logClaimEvent(claimId, 'CANCELED', 'CLAIM_CANCELED', {
        reason
      });
      
      return true;
    } catch (error) {
      logger.error(`Error canceling claim ${claimId}`, { error });
      throw error;
    }
  }

  /**
   * Resubmit a claim for processing
   * @param claimId The ID of the claim to resubmit
   * @param options Processing options
   * @returns Success status
   */
  async resubmitClaim(claimId: string, options: ProcessingOptions = {}): Promise<boolean> {
    try {
      // Get the claim
      const [claim] = await this.db
        .select()
        .from(claims)
        .where(eq(claims.id, claimId));
      
      if (!claim) {
        throw new Error(`Claim ${claimId} not found`);
      }
      
      // Check if claim can be resubmitted
      const resubmittableStatuses = ['FAILED', 'ERROR', 'REJECTED', 'CANCELED'];
      if (!resubmittableStatuses.includes(claim.status)) {
        throw new Error(`Cannot resubmit claim in ${claim.status} status`);
      }
      
      // Update claim status
      const now = new Date();
      await this.db
        .update(claims)
        .set({
          status: 'RESUBMITTED',
          processingPath: options.path || claim.processingPath,
          lastStatusUpdate: now,
          submissionDate: now,
          updatedAt: now
        })
        .where(eq(claims.id, claimId));
      
      // Log event
      await this.logClaimEvent(claimId, 'RESUBMITTED', 'CLAIM_RESUBMITTED', {
        previousStatus: claim.status,
        path: options.path || claim.processingPath
      });
      
      // Process the claim
      this.processClaim(claimId, options).catch(error => {
        logger.error(`Error processing resubmitted claim ${claimId}`, { error });
      });
      
      return true;
    } catch (error) {
      logger.error(`Error resubmitting claim ${claimId}`, { error });
      throw error;
    }
  }

  /**
   * Get statistics for claims
   * @returns Statistics about claims
   */
  async getClaimsStatistics(): Promise<{
    totalClaims: number;
    activeClaimsCount: number;
    completedClaimsCount: number;
    pendingClaimsCount: number;
    failedClaimsCount: number;
    byStatusCounts: Record<string, number>;
    byTypeCounts: Record<string, number>;
    averageProcessingTime: number;
    averageClaimAmount: number;
  }> {
    try {
      // Count all claims
      const [totalResult] = await this.db
        .select({ count: sql`COUNT(*)` })
        .from(claims);
      
      const totalClaims = parseInt(totalResult.count);
      
      // Count claims by status
      const statusCounts = await this.db
        .select({
          status: claims.status,
          count: sql`COUNT(*)`
        })
        .from(claims)
        .groupBy(claims.status);
      
      const byStatusCounts: Record<string, number> = {};
      for (const statusCount of statusCounts) {
        byStatusCounts[statusCount.status] = parseInt(statusCount.count);
      }
      
      // Count claims by type
      const typeCounts = await this.db
        .select({
          type: claims.type,
          count: sql`COUNT(*)`
        })
        .from(claims)
        .groupBy(claims.type);
      
      const byTypeCounts: Record<string, number> = {};
      for (const typeCount of typeCounts) {
        byTypeCounts[typeCount.type] = parseInt(typeCount.count);
      }
      
      // Calculate active, completed, pending, and failed counts
      const activeStatuses = ['NEW', 'PROCESSING', 'PENDING', 'QUEUED', 'SUBMITTED', 'RESUBMITTED'];
      const completedStatuses = ['COMPLETE', 'SIMULATED'];
      const pendingStatuses = ['PENDING', 'QUEUED', 'SUBMITTED'];
      const failedStatuses = ['FAILED', 'ERROR', 'REJECTED'];
      
      const activeClaimsCount = Object.entries(byStatusCounts)
        .filter(([status]) => activeStatuses.includes(status))
        .reduce((sum, [, count]) => sum + count, 0);
      
      const completedClaimsCount = Object.entries(byStatusCounts)
        .filter(([status]) => completedStatuses.includes(status))
        .reduce((sum, [, count]) => sum + count, 0);
      
      const pendingClaimsCount = Object.entries(byStatusCounts)
        .filter(([status]) => pendingStatuses.includes(status))
        .reduce((sum, [, count]) => sum + count, 0);
      
      const failedClaimsCount = Object.entries(byStatusCounts)
        .filter(([status]) => failedStatuses.includes(status))
        .reduce((sum, [, count]) => sum + count, 0);
      
      // Calculate average processing time for completed claims
      let averageProcessingTime = 0;
      
      if (completedClaimsCount > 0) {
        const [processingTimeResult] = await this.db
          .select({
            avgTime: sql`AVG(
              EXTRACT(EPOCH FROM (${claims.processedDate} - ${claims.submissionDate})) * 1000
            )`
          })
          .from(claims)
          .where(sql`${claims.status} IN ('COMPLETE', 'SIMULATED') AND ${claims.processedDate} IS NOT NULL`);
        
        averageProcessingTime = processingTimeResult.avgTime || 0;
      }
      
      // Calculate average claim amount
      let averageClaimAmount = 0;
      
      const [totalAmountResult] = await this.db
        .select({
          avgAmount: sql`AVG(subquery.total_amount)`
        })
        .from(
          this.db
            .select({
              claim_id: claimLineItems.claimId,
              total_amount: sql`SUM(${claimLineItems.amount})`
            })
            .from(claimLineItems)
            .groupBy(claimLineItems.claimId)
            .as('subquery')
        );
      
      averageClaimAmount = totalAmountResult.avgAmount || 0;
      
      return {
        totalClaims,
        activeClaimsCount,
        completedClaimsCount,
        pendingClaimsCount,
        failedClaimsCount,
        byStatusCounts,
        byTypeCounts,
        averageProcessingTime,
        averageClaimAmount
      };
    } catch (error) {
      logger.error('Error getting claims statistics', { error });
      throw error;
    }
  }

  /**
   * Log a claim event
   * @param claimId The claim ID
   * @param status The claim status
   * @param eventType The event type
   * @param details Additional details
   */
  private async logClaimEvent(
    claimId: string,
    status: string,
    eventType: string,
    details: any
  ): Promise<void> {
    try {
      const eventData: InsertClaimEvent = {
        id: uuidv4(),
        claimId,
        eventType,
        status,
        timestamp: new Date(),
        details
      };
      
      await this.db.insert(claimEvents).values(eventData);
    } catch (error) {
      logger.error(`Error logging claim event for claim ${claimId}`, { error });
      // Event logging errors shouldn't fail the overall processing
    }
  }

  /**
   * Cleanup method - call before shutdown
   */
  cleanup(): void {
    this.externalPayerGateway.cleanup();
  }
}