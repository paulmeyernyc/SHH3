/**
 * Internal Rules Engine
 * 
 * This service implements a rules-based engine for processing claims
 * within the Hub, without forwarding to external payers.
 */
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { claims, claimLineItems, claimEvents, claimRulesCache, Claim, ClaimLineItem, InsertClaimEvent } from '@shared/claims-schema';
import logger from '../../logger';

// Types for rule evaluation
interface EvaluationContext {
  claim: Claim;
  lineItems: ClaimLineItem[];
  config: RulesConfig;
}

interface RulesConfig {
  useCaching: boolean;
  maxCacheAge: number; // in milliseconds
}

interface RuleEvaluationResult {
  success: boolean;
  claimStatus: string;
  allowedAmount?: number;
  patientResponsibility?: number;
  adjudicationDetails: any;
  errors?: string[];
  warnings?: string[];
}

export class InternalRulesEngine {
  private db: any; // Replace with proper type when available
  private config: RulesConfig;

  constructor(db: any, config?: Partial<RulesConfig>) {
    this.db = db;
    this.config = {
      useCaching: true,
      maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours by default
      ...config
    };
  }

  /**
   * Process a claim using the internal rules engine
   * @param claim The claim to process
   * @returns The result of processing
   */
  async processClaim(claimId: string): Promise<RuleEvaluationResult> {
    try {
      logger.info(`Processing claim ${claimId} using internal rules engine`);
      
      // Get claim and line items
      const [claim] = await this.db
        .select()
        .from(claims)
        .where(eq(claims.id, claimId));
      
      if (!claim) {
        throw new Error(`Claim ${claimId} not found`);
      }
      
      const lineItems = await this.db
        .select()
        .from(claimLineItems)
        .where(eq(claimLineItems.claimId, claimId));
      
      // Check cache if enabled
      if (this.config.useCaching) {
        const cachedResult = await this.checkRulesCache(claim, lineItems);
        if (cachedResult) {
          logger.info(`Using cached rule result for claim ${claimId}`);
          
          // Log the event
          await this.logClaimEvent(claimId, claim.status, 'INTERNAL_RULES_APPLIED', {
            source: 'cache',
            result: cachedResult
          });
          
          return cachedResult;
        }
      }
      
      // Evaluate claim against rules
      const result = await this.evaluateRules({
        claim,
        lineItems,
        config: this.config
      });
      
      // Cache the result if successful
      if (this.config.useCaching && result.success) {
        await this.cacheRuleResult(claim, lineItems, result);
      }
      
      // Update claim status
      await this.db
        .update(claims)
        .set({
          status: result.success ? 'COMPLETE' : 'REJECTED',
          responseData: result,
          processedDate: new Date(),
          lastStatusUpdate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(claims.id, claimId));
      
      // Log the event
      await this.logClaimEvent(claimId, result.success ? 'COMPLETE' : 'REJECTED', 'INTERNAL_RULES_APPLIED', {
        result
      });
      
      return result;
    } catch (error) {
      logger.error(`Error processing claim ${claimId} with internal rules engine`, { error });
      
      if (claimId) {
        // Update claim status to error
        await this.db
          .update(claims)
          .set({
            status: 'ERROR',
            lastStatusUpdate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(claims.id, claimId));
        
        // Log the error event
        await this.logClaimEvent(claimId, 'ERROR', 'INTERNAL_RULES_ERROR', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      throw error;
    }
  }

  /**
   * Evaluate rules against the claim
   * @param context The evaluation context
   * @returns The evaluation result
   */
  private async evaluateRules(context: EvaluationContext): Promise<RuleEvaluationResult> {
    const { claim, lineItems } = context;
    
    // In a real implementation, this would be a much more complex rules engine
    // with configurations loaded from a database or rules management system.
    // For this prototype, we'll implement a simplified approach.
    
    const result: RuleEvaluationResult = {
      success: true,
      claimStatus: 'COMPLETE',
      allowedAmount: 0,
      patientResponsibility: 0,
      adjudicationDetails: {
        lineItems: []
      },
      errors: [],
      warnings: []
    };
    
    // Simple validation rules
    if (!claim.patientId) {
      result.success = false;
      result.errors.push('Missing patient identifier');
    }
    
    if (!claim.providerId) {
      result.success = false;
      result.errors.push('Missing provider identifier');
    }
    
    if (!lineItems || lineItems.length === 0) {
      result.success = false;
      result.errors.push('Claim has no line items');
    }
    
    // If basic validation failed, return early
    if (!result.success) {
      result.claimStatus = 'REJECTED';
      return result;
    }
    
    // Process line items
    let totalBilled = 0;
    let totalAllowed = 0;
    let totalPatientResponsibility = 0;
    
    for (const lineItem of lineItems) {
      // Get service code
      const serviceCode = lineItem.serviceCode;
      
      // In a real system, we would look up fee schedules, network status,
      // coverage details, and apply complex rules here.
      
      // For this prototype, use a simple calculation:
      // - Allow 80% of billed amount for in-network services
      // - Patient responsible for 20% after deductible
      
      const billedAmount = lineItem.amount || 0;
      let allowedAmount = billedAmount * 0.8; // Simple 80% of billed
      let patientAmount = billedAmount * 0.2; // Simple 20% coinsurance
      
      // Add to totals
      totalBilled += billedAmount;
      totalAllowed += allowedAmount;
      totalPatientResponsibility += patientAmount;
      
      // Add line item adjudication details
      result.adjudicationDetails.lineItems.push({
        lineItemId: lineItem.id,
        serviceCode,
        billedAmount,
        allowedAmount,
        patientResponsibility: patientAmount,
        adjudicationStatus: 'APPROVED'
      });
    }
    
    // Set overall amounts
    result.allowedAmount = totalAllowed;
    result.patientResponsibility = totalPatientResponsibility;
    
    // Add summary to adjudication details
    result.adjudicationDetails.summary = {
      totalBilled,
      totalAllowed,
      totalPatientResponsibility
    };
    
    return result;
  }

  /**
   * Check if there's a valid cached result for this claim
   * @param claim The claim
   * @param lineItems The claim line items
   * @returns The cached result, if found and valid
   */
  private async checkRulesCache(claim: Claim, lineItems: ClaimLineItem[]): Promise<RuleEvaluationResult | null> {
    try {
      // Create a cache key based on claim properties and line items
      const cacheKey = this.createCacheKey(claim, lineItems);
      
      // Check for a cached entry
      const [cachedEntry] = await this.db
        .select()
        .from(claimRulesCache)
        .where(eq(claimRulesCache.cacheKey, cacheKey));
      
      if (!cachedEntry) {
        return null;
      }
      
      // Check if the cache entry is still valid (not expired)
      const now = new Date();
      const cacheAge = now.getTime() - cachedEntry.updatedAt.getTime();
      
      if (cacheAge > this.config.maxCacheAge) {
        logger.debug(`Cache entry expired for key ${cacheKey}`);
        return null;
      }
      
      // Return the cached result
      return cachedEntry.result as RuleEvaluationResult;
    } catch (error) {
      logger.error('Error checking rules cache', { error });
      return null; // In case of error, proceed without cache
    }
  }

  /**
   * Cache a rule evaluation result
   * @param claim The claim
   * @param lineItems The claim line items
   * @param result The evaluation result
   */
  private async cacheRuleResult(claim: Claim, lineItems: ClaimLineItem[], result: RuleEvaluationResult): Promise<void> {
    try {
      const cacheKey = this.createCacheKey(claim, lineItems);
      
      // Check if entry already exists
      const [existingEntry] = await this.db
        .select()
        .from(claimRulesCache)
        .where(eq(claimRulesCache.cacheKey, cacheKey));
      
      const now = new Date();
      
      if (existingEntry) {
        // Update existing entry
        await this.db
          .update(claimRulesCache)
          .set({
            result,
            updatedAt: now
          })
          .where(eq(claimRulesCache.id, existingEntry.id));
      } else {
        // Create new entry
        await this.db
          .insert(claimRulesCache)
          .values({
            id: uuidv4(),
            cacheKey,
            claimType: claim.type,
            payerId: claim.payerId,
            result,
            createdAt: now,
            updatedAt: now
          });
      }
      
      logger.debug(`Cached rule result for key ${cacheKey}`);
    } catch (error) {
      logger.error('Error caching rule result', { error });
      // Cache errors shouldn't fail the overall claim processing
    }
  }

  /**
   * Create a cache key for a claim and its line items
   * @param claim The claim
   * @param lineItems The claim line items
   * @returns A unique cache key
   */
  private createCacheKey(claim: Claim, lineItems: ClaimLineItem[]): string {
    // This is a simplified version for the prototype
    // In a real system, you might hash more properties for a more precise key
    
    // Include essential claim properties
    const claimProps = {
      type: claim.type,
      payerId: claim.payerId,
      providerId: claim.providerId,
      patientId: claim.patientId
    };
    
    // Include essential line item properties
    const lineItemsProps = lineItems.map(item => ({
      serviceCode: item.serviceCode,
      amount: item.amount
    }));
    
    // Create a hash of these properties
    const combinedProps = {
      claim: claimProps,
      lineItems: lineItemsProps
    };
    
    return JSON.stringify(combinedProps);
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
      // Event logging errors shouldn't fail the overall claim processing
    }
  }
}