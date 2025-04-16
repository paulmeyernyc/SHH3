/**
 * Goldcarding Service
 * 
 * This service implements the Smart Health Hub's Goldcarding functionality,
 * which allows trusted providers to bypass or receive expedited prior authorization
 * based on their historical approval rates and compliance.
 */
import { v4 as uuidv4 } from 'uuid';
import { eq, and, or, gt, gte, lt, lte, desc, sql, inArray } from 'drizzle-orm';
import { db } from '../../db';
import logger from '../../../server/utils/logger';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { 
  goldcardProviderProfiles, 
  goldcardEligibility, 
  goldcardRules, 
  goldcardEvents, 
  goldcardPriorAuthTracker, 
  goldcardClaimTracker,
  GoldcardProviderProfile,
  GoldcardEligibility,
  GoldcardRule,
  GoldcardEvent,
  GoldcardPriorAuthTracker,
  GoldcardClaimTracker,
  GoldcardCheckRequest,
  GoldcardDecision,
  InsertGoldcardProviderProfile,
  InsertGoldcardEligibility,
  InsertGoldcardEvent,
  InsertGoldcardPriorAuthTracker,
  InsertGoldcardClaimTracker
} from '@shared/goldcarding-schema';

export class GoldcardingService {
  /**
   * Check if a provider is eligible for goldcarding for a specific service
   * This is the main entry point called by the Prior Authorization module
   */
  async checkEligibility(request: GoldcardCheckRequest): Promise<GoldcardDecision> {
    try {
      const { providerId, serviceCode, patientId, payerId, additionalContext } = request;
      
      logger.info(`Checking goldcarding eligibility for provider ${providerId} and service ${serviceCode}`);
      
      // Find the provider profile
      const providerProfile = await this.getProviderProfile(providerId);
      if (!providerProfile) {
        return {
          isEligible: false,
          providerId,
          serviceCode,
          reason: 'Provider profile not found'
        };
      }

      // Check if provider is active
      if (!providerProfile.isActive) {
        return {
          isEligible: false,
          providerId,
          serviceCode,
          reason: 'Provider profile is not active'
        };
      }

      // Find the eligibility record for this service
      const eligibility = await this.getEligibilityForService(providerProfile.id, serviceCode);
      if (!eligibility) {
        // No specific eligibility record found - check if provider would be eligible based on rules
        return await this.evaluateEligibilityByRules(providerId, serviceCode, payerId);
      }

      // Check if existing eligibility is active and not expired
      if (eligibility.status !== 'active') {
        return {
          isEligible: false,
          providerId,
          serviceCode,
          reason: `Provider eligibility status is ${eligibility.status}`
        };
      }

      // Check if eligibility is expired
      if (eligibility.endDate && new Date(eligibility.endDate) < new Date()) {
        // Update the status to expired
        await db.update(goldcardEligibility)
          .set({ 
            status: 'expired',
            updatedAt: new Date()
          })
          .where(eq(goldcardEligibility.id, eligibility.id));

        // Log the expiration event
        await this.recordEvent({
          providerProfileId: providerProfile.id,
          eligibilityId: eligibility.id,
          eventType: 'EXPIRED',
          serviceCode,
          serviceName: eligibility.serviceName,
          reason: 'Eligibility period ended',
          details: { automaticExpiration: true }
        });

        return {
          isEligible: false,
          providerId,
          serviceCode,
          reason: 'Eligibility has expired'
        };
      }

      // Provider is eligible
      return {
        isEligible: true,
        providerId,
        serviceCode,
        reason: 'Provider is goldcarded for this service',
        details: {
          eligibilityId: eligibility.id,
          startDate: eligibility.startDate,
          endDate: eligibility.endDate,
          approvalRate: eligibility.approvalRate
        }
      };
    } catch (error) {
      logger.error('Error checking goldcarding eligibility:', error);
      // Default to not eligible when errors occur for safety
      return {
        isEligible: false,
        providerId: request.providerId,
        serviceCode: request.serviceCode,
        reason: 'Error occurred during eligibility check'
      };
    }
  }

  /**
   * Evaluate eligibility based on rules when no explicit eligibility record exists
   */
  private async evaluateEligibilityByRules(
    providerId: string, 
    serviceCode: string, 
    payerId?: string
  ): Promise<GoldcardDecision> {
    try {
      // Get the provider profile
      const providerProfile = await this.getProviderProfile(providerId);
      if (!providerProfile) {
        return {
          isEligible: false,
          providerId,
          serviceCode,
          reason: 'Provider profile not found'
        };
      }

      // Find applicable rules for this service
      const rules = await this.getApplicableRules(serviceCode, payerId);
      if (rules.length === 0) {
        return {
          isEligible: false,
          providerId,
          serviceCode,
          reason: 'No applicable goldcarding rules found for this service'
        };
      }

      // For each rule, check if the provider meets the criteria
      for (const rule of rules) {
        // Get provider's historical stats for this service
        const stats = await this.getProviderServiceStats(providerId, serviceCode, rule.evaluationPeriodMonths);
        
        // Check if the provider meets the rule criteria
        const meetsMinRequests = stats.totalAuthRequests >= rule.minAuthRequests;
        const meetsApprovalRate = stats.approvalRate >= rule.requiredApprovalRate;

        // If provider meets all criteria, they are eligible for goldcarding
        if (meetsMinRequests && meetsApprovalRate) {
          // Provider is eligible - create an eligibility record
          const serviceName = await this.getServiceName(serviceCode);
          
          const newEligibility = await this.createEligibility({
            providerProfileId: providerProfile.id,
            serviceCode,
            serviceName: serviceName || serviceCode,
            serviceCategory: rule.serviceCategory,
            status: 'active',
            startDate: new Date(),
            endDate: this.calculateEndDate(rule.reviewFrequency),
            eligibilityScore: stats.approvalRate,
            approvalRate: stats.approvalRate,
            totalAuthRequests: stats.totalAuthRequests,
            totalApproved: stats.totalApproved,
            totalDenied: stats.totalDenied
          });

          // Record the event
          await this.recordEvent({
            providerProfileId: providerProfile.id,
            eligibilityId: newEligibility.id,
            eventType: 'GRANTED',
            serviceCode,
            serviceName: serviceName || serviceCode,
            reason: `Auto-approved based on rule: ${rule.name}`,
            details: {
              rule: rule.id,
              stats: {
                approvalRate: stats.approvalRate,
                totalAuthRequests: stats.totalAuthRequests
              }
            }
          });

          return {
            isEligible: true,
            providerId,
            serviceCode,
            reason: 'Provider meets goldcarding criteria for this service',
            details: {
              eligibilityId: newEligibility.id,
              startDate: newEligibility.startDate,
              endDate: newEligibility.endDate,
              approvalRate: stats.approvalRate
            }
          };
        }
      }

      // If we get here, provider doesn't meet any rule criteria
      return {
        isEligible: false,
        providerId,
        serviceCode,
        reason: 'Provider does not meet goldcarding criteria for this service'
      };
    } catch (error) {
      logger.error('Error evaluating eligibility by rules:', error);
      return {
        isEligible: false,
        providerId,
        serviceCode,
        reason: 'Error occurred during rules evaluation'
      };
    }
  }

  /**
   * Record a prior authorization decision for tracking and analysis
   */
  async recordPriorAuthDecision(data: Omit<InsertGoldcardPriorAuthTracker, 'id' | 'createdAt'>): Promise<GoldcardPriorAuthTracker> {
    try {
      logger.info(`Recording prior auth decision for provider ${data.providerId} and service ${data.serviceCode}`);

      // Insert into tracker
      const [record] = await db.insert(goldcardPriorAuthTracker)
        .values({
          ...data,
          id: uuidv4()
        })
        .returning();

      // Update provider profile stats
      await this.updateProviderStats(data.providerId, data.serviceCode, data.outcome === 'approved');

      return record;
    } catch (error) {
      logger.error('Error recording prior auth decision:', error);
      throw error;
    }
  }

  /**
   * Record a claim outcome for tracking and analysis
   */
  async recordClaimOutcome(data: Omit<InsertGoldcardClaimTracker, 'id' | 'createdAt'>): Promise<GoldcardClaimTracker> {
    try {
      logger.info(`Recording claim outcome for provider ${data.providerId} and service ${data.serviceCode}`);

      // Insert into tracker
      const [record] = await db.insert(goldcardClaimTracker)
        .values({
          ...data,
          id: uuidv4()
        })
        .returning();

      // If there's a prior auth ID, correlate the claim with the prior auth
      if (data.priorAuthId) {
        await this.correlateClaimWithPriorAuth(record.id, data.priorAuthId);
      }

      return record;
    } catch (error) {
      logger.error('Error recording claim outcome:', error);
      throw error;
    }
  }

  /**
   * Get a provider's profile, creating it if it doesn't exist
   */
  async getProviderProfile(providerId: string): Promise<GoldcardProviderProfile | undefined> {
    try {
      // Check if profile exists
      const [profile] = await db.select()
        .from(goldcardProviderProfiles)
        .where(eq(goldcardProviderProfiles.providerId, providerId));

      if (profile) {
        return profile;
      }

      // Profile doesn't exist, try to get provider details and create one
      const providerName = await this.getProviderName(providerId);
      
      if (!providerName) {
        logger.warn(`Provider ${providerId} not found in provider directory`);
        return undefined;
      }
      
      // Create a new profile
      const [newProfile] = await db.insert(goldcardProviderProfiles)
        .values({
          id: uuidv4(),
          providerId,
          providerName,
          totalAuthRequests: 0,
          totalApproved: 0,
          totalDenied: 0,
          isActive: true
        })
        .returning();
      
      return newProfile;
    } catch (error) {
      logger.error(`Error getting provider profile for ${providerId}:`, error);
      return undefined;
    }
  }

  /**
   * Get eligibility record for a specific service
   */
  private async getEligibilityForService(
    providerProfileId: string, 
    serviceCode: string
  ): Promise<GoldcardEligibility | undefined> {
    try {
      const [eligibility] = await db.select()
        .from(goldcardEligibility)
        .where(and(
          eq(goldcardEligibility.providerProfileId, providerProfileId),
          eq(goldcardEligibility.serviceCode, serviceCode)
        ));
      
      return eligibility;
    } catch (error) {
      logger.error(`Error getting eligibility for service ${serviceCode}:`, error);
      return undefined;
    }
  }

  /**
   * Get applicable rules for a service
   */
  private async getApplicableRules(serviceCode: string, payerId?: string): Promise<GoldcardRule[]> {
    try {
      // Find rules that apply to this service code specifically
      // or have the service code in their array of service codes
      const rules = await db.select()
        .from(goldcardRules)
        .where(and(
          eq(goldcardRules.isActive, true),
          or(
            // Match rules with a specific payer ID or null (applicable to all payers)
            payerId ? or(
              eq(goldcardRules.payerId, payerId), 
              sql`${goldcardRules.payerId} IS NULL`
            ) : sql`${goldcardRules.payerId} IS NULL`,
            // Match rules where the service code is in the array of service codes
            sql`${goldcardRules.serviceCodes}::jsonb @> jsonb_build_array(${serviceCode})`
          )
        ));
      
      return rules;
    } catch (error) {
      logger.error(`Error getting applicable rules for service ${serviceCode}:`, error);
      return [];
    }
  }

  /**
   * Get provider's historical stats for a service
   */
  private async getProviderServiceStats(
    providerId: string, 
    serviceCode: string, 
    months: number
  ): Promise<{ approvalRate: number; totalAuthRequests: number; totalApproved: number; totalDenied: number }> {
    try {
      // Calculate the date X months ago
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      
      // Get all prior auth records for this provider and service within the timeframe
      const authRecords = await db.select()
        .from(goldcardPriorAuthTracker)
        .where(and(
          eq(goldcardPriorAuthTracker.providerId, providerId),
          eq(goldcardPriorAuthTracker.serviceCode, serviceCode),
          gte(goldcardPriorAuthTracker.requestedDate, startDate)
        ));
      
      // Calculate stats
      const totalAuthRequests = authRecords.length;
      const totalApproved = authRecords.filter(record => record.outcome === 'approved').length;
      const totalDenied = totalAuthRequests - totalApproved;
      const approvalRate = totalAuthRequests > 0 
        ? Math.round((totalApproved / totalAuthRequests) * 100) 
        : 0;
      
      return {
        approvalRate,
        totalAuthRequests,
        totalApproved,
        totalDenied
      };
    } catch (error) {
      logger.error(`Error getting provider stats for ${providerId} and service ${serviceCode}:`, error);
      return {
        approvalRate: 0,
        totalAuthRequests: 0,
        totalApproved: 0,
        totalDenied: 0
      };
    }
  }

  /**
   * Update provider's stats after a new prior auth decision
   */
  private async updateProviderStats(
    providerId: string, 
    serviceCode: string, 
    isApproved: boolean
  ): Promise<void> {
    try {
      // Get provider profile
      const providerProfile = await this.getProviderProfile(providerId);
      if (!providerProfile) {
        logger.warn(`Cannot update stats - provider ${providerId} not found`);
        return;
      }

      const currentAuthRequests = providerProfile.totalAuthRequests || 0;
      const currentApproved = providerProfile.totalApproved || 0;
      const currentDenied = providerProfile.totalDenied || 0;
      
      const newAuthRequests = currentAuthRequests + 1;
      const newApproved = currentApproved + (isApproved ? 1 : 0);
      const newDenied = currentDenied + (isApproved ? 0 : 1);
      const newApprovalRate = Math.round((newApproved / newAuthRequests) * 100);

      // Update overall provider stats
      await db.update(goldcardProviderProfiles)
        .set({
          totalAuthRequests: newAuthRequests,
          totalApproved: newApproved,
          totalDenied: newDenied,
          overallApprovalRate: newApprovalRate,
          updatedAt: new Date()
        })
        .where(eq(goldcardProviderProfiles.id, providerProfile.id));

      // Check if there's an eligibility record for this service
      const eligibility = await this.getEligibilityForService(providerProfile.id, serviceCode);
      if (eligibility) {
        const eligAuthRequests = eligibility.totalAuthRequests || 0;
        const eligApproved = eligibility.totalApproved || 0;
        const eligDenied = eligibility.totalDenied || 0;
        
        const newEligAuthRequests = eligAuthRequests + 1;
        const newEligApproved = eligApproved + (isApproved ? 1 : 0);
        const newEligDenied = eligDenied + (isApproved ? 0 : 1);
        const newEligApprovalRate = Math.round((newEligApproved / newEligAuthRequests) * 100);
        
        // Update service-specific stats
        await db.update(goldcardEligibility)
          .set({
            totalAuthRequests: newEligAuthRequests,
            totalApproved: newEligApproved,
            totalDenied: newEligDenied,
            approvalRate: newEligApprovalRate,
            updatedAt: new Date()
          })
          .where(eq(goldcardEligibility.id, eligibility.id));
      }
    } catch (error) {
      logger.error(`Error updating provider stats for ${providerId}:`, error);
    }
  }

  /**
   * Create a new eligibility record
   */
  private async createEligibility(
    data: Omit<InsertGoldcardEligibility, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<GoldcardEligibility> {
    const [eligibility] = await db.insert(goldcardEligibility)
      .values({
        ...data,
        id: uuidv4()
      })
      .returning();
    
    return eligibility;
  }

  /**
   * Record a goldcarding event
   */
  private async recordEvent(
    data: Omit<InsertGoldcardEvent, 'id' | 'timestamp'>
  ): Promise<GoldcardEvent> {
    const [event] = await db.insert(goldcardEvents)
      .values({
        ...data,
        id: uuidv4(),
        timestamp: new Date()
      })
      .returning();
    
    return event;
  }

  /**
   * Correlate a claim with a prior auth
   */
  private async correlateClaimWithPriorAuth(
    claimTrackerId: string, 
    priorAuthId: string
  ): Promise<void> {
    try {
      // Find the prior auth record
      const [priorAuth] = await db.select()
        .from(goldcardPriorAuthTracker)
        .where(eq(goldcardPriorAuthTracker.priorAuthId, priorAuthId));
      
      if (!priorAuth) {
        logger.warn(`Prior auth ${priorAuthId} not found for correlation with claim`);
        return;
      }

      // Find the claim record
      const [claim] = await db.select()
        .from(goldcardClaimTracker)
        .where(eq(goldcardClaimTracker.id, claimTrackerId));
      
      if (!claim) {
        logger.warn(`Claim ${claimTrackerId} not found for correlation with prior auth`);
        return;
      }

      // If the claim was approved but prior auth was denied, or vice versa,
      // this might impact goldcarding status
      if (
        (priorAuth.outcome === 'approved' && claim.claimStatus === 'denied') ||
        (priorAuth.outcome === 'denied' && claim.claimStatus === 'paid')
      ) {
        // Get provider profile
        const providerProfile = await this.getProviderProfile(priorAuth.providerId);
        if (!providerProfile) return;

        // Get eligibility for the service
        const eligibility = await this.getEligibilityForService(
          providerProfile.id, 
          priorAuth.serviceCode
        );

        if (eligibility) {
          // Record a discrepancy event
          await this.recordEvent({
            providerProfileId: providerProfile.id,
            eligibilityId: eligibility.id,
            eventType: 'DISCREPANCY_DETECTED',
            serviceCode: priorAuth.serviceCode,
            serviceName: eligibility.serviceName,
            reason: `Prior auth and claim outcomes don't match`,
            details: {
              priorAuthId: priorAuth.id,
              priorAuthOutcome: priorAuth.outcome,
              claimId: claim.id,
              claimStatus: claim.claimStatus
            }
          });

          // Update the eligibility record with a reduced claim accuracy rate
          // This might trigger a review or automatic suspension if it falls below thresholds
          const currentRate = eligibility.claimAccuracyRate || 100;
          const newRate = Math.max(0, currentRate - 5); // Reduce by 5% points for each discrepancy
          
          await db.update(goldcardEligibility)
            .set({
              claimAccuracyRate: newRate,
              updatedAt: new Date(),
              // If accuracy falls below 70%, suspend the eligibility
              ...(newRate < 70 ? {
                status: 'suspended',
                reviewNotes: 'Automatically suspended due to low claim accuracy rate'
              } : {})
            })
            .where(eq(goldcardEligibility.id, eligibility.id));

          // If the status was changed to suspended, record that event
          if (newRate < 70) {
            await this.recordEvent({
              providerProfileId: providerProfile.id,
              eligibilityId: eligibility.id,
              eventType: 'SUSPENDED',
              serviceCode: priorAuth.serviceCode,
              serviceName: eligibility.serviceName,
              reason: 'Claim accuracy rate fell below threshold',
              details: {
                oldRate: currentRate,
                newRate: newRate,
                threshold: 70
              }
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error correlating claim with prior auth:', error);
    }
  }

  /**
   * Calculate end date based on review frequency
   */
  private calculateEndDate(reviewFrequency: string): Date {
    const endDate = new Date();
    
    switch (reviewFrequency.toLowerCase()) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'semi-annual':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case 'annual':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        // Default to 6 months
        endDate.setMonth(endDate.getMonth() + 6);
    }
    
    return endDate;
  }

  /**
   * Get provider name from provider directory
   * This is a placeholder - in the real system, it would call the Provider Directory service
   */
  private async getProviderName(providerId: string): Promise<string | undefined> {
    try {
      // In a real implementation, this would look up the provider in the directory
      // For now, we'll return a placeholder name
      return `Provider ${providerId}`;
    } catch (error) {
      logger.error(`Error getting provider name for ${providerId}:`, error);
      return undefined;
    }
  }

  /**
   * Get service name from service catalog
   * This is a placeholder - in the real system, it would call a Service Catalog API
   */
  private async getServiceName(serviceCode: string): Promise<string | undefined> {
    try {
      // In a real implementation, this would look up the service in the catalog
      // For now, we'll return a placeholder name
      return `Service ${serviceCode}`;
    } catch (error) {
      logger.error(`Error getting service name for ${serviceCode}:`, error);
      return undefined;
    }
  }

  /**
   * Get all service eligibilities for a provider
   */
  async getProviderEligibilities(providerId: string): Promise<GoldcardEligibility[]> {
    try {
      // Get provider profile
      const profile = await this.getProviderProfile(providerId);
      if (!profile) {
        return [];
      }

      // Get all eligibilities for this provider
      const eligibilities = await db.select()
        .from(goldcardEligibility)
        .where(eq(goldcardEligibility.providerProfileId, profile.id))
        .orderBy(desc(goldcardEligibility.updatedAt));
      
      return eligibilities;
    } catch (error) {
      logger.error(`Error getting eligibilities for provider ${providerId}:`, error);
      return [];
    }
  }

  /**
   * Get all providers eligible for a specific service
   */
  async getProvidersForService(serviceCode: string): Promise<{ 
    providerId: string;
    providerName: string;
    eligibility: GoldcardEligibility;
  }[]> {
    try {
      // Get all active eligibilities for this service
      const eligibilities = await db.select({
        eligibility: goldcardEligibility,
        profile: goldcardProviderProfiles
      })
        .from(goldcardEligibility)
        .innerJoin(goldcardProviderProfiles, 
          eq(goldcardEligibility.providerProfileId, goldcardProviderProfiles.id))
        .where(and(
          eq(goldcardEligibility.serviceCode, serviceCode),
          eq(goldcardEligibility.status, 'active')
        ));
      
      return eligibilities.map(record => ({
        providerId: record.profile.providerId,
        providerName: record.profile.providerName,
        eligibility: record.eligibility
      }));
    } catch (error) {
      logger.error(`Error getting providers for service ${serviceCode}:`, error);
      return [];
    }
  }

  /**
   * Get all events for a provider
   */
  async getProviderEvents(providerId: string): Promise<GoldcardEvent[]> {
    try {
      // Get provider profile
      const profile = await this.getProviderProfile(providerId);
      if (!profile) {
        return [];
      }

      // Get all events for this provider
      const events = await db.select()
        .from(goldcardEvents)
        .where(eq(goldcardEvents.providerProfileId, profile.id))
        .orderBy(desc(goldcardEvents.timestamp));
      
      return events;
    } catch (error) {
      logger.error(`Error getting events for provider ${providerId}:`, error);
      return [];
    }
  }
}

/**
 * Initialize database tables for the goldcarding service
 */
async function initGoldcardingTables() {
  try {
    logger.info('Initializing goldcarding database tables');
    
    // Connect to the database directly
    const sql = postgres(process.env.DATABASE_URL!);
    
    // Check if goldcard_status enum exists
    const statusEnumExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'goldcard_status'
      );
    `;
    
    if (!statusEnumExists[0].exists) {
      logger.info('Creating goldcard_status enum');
      await sql`
        CREATE TYPE goldcard_status AS ENUM (
          'active', 'suspended', 'expired', 'revoked'
        );
      `;
    }
    
    // Check if goldcard_service_category enum exists
    const serviceCategoryEnumExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'goldcard_service_category'
      );
    `;
    
    if (!serviceCategoryEnumExists[0].exists) {
      logger.info('Creating goldcard_service_category enum');
      await sql`
        CREATE TYPE goldcard_service_category AS ENUM (
          'diagnostics', 'procedures', 'treatments', 'supplies', 'medications', 'dme'
        );
      `;
    }
    
    // Create tables if they don't exist
    // Provider profiles
    await sql`
      CREATE TABLE IF NOT EXISTS goldcard_provider_profiles (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL UNIQUE,
        provider_name TEXT NOT NULL,
        total_auth_requests INTEGER NOT NULL DEFAULT 0,
        total_approved INTEGER NOT NULL DEFAULT 0,
        total_denied INTEGER NOT NULL DEFAULT 0,
        overall_approval_rate INTEGER,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `;

    // Service eligibility
    await sql`
      CREATE TABLE IF NOT EXISTS goldcard_eligibility (
        id TEXT PRIMARY KEY,
        provider_profile_id TEXT NOT NULL REFERENCES goldcard_provider_profiles(id),
        service_code TEXT NOT NULL,
        service_name TEXT NOT NULL,
        service_category goldcard_service_category NOT NULL,
        status goldcard_status NOT NULL DEFAULT 'active',
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE,
        eligibility_score INTEGER,
        approval_rate INTEGER,
        total_auth_requests INTEGER NOT NULL DEFAULT 0,
        total_approved INTEGER NOT NULL DEFAULT 0,
        total_denied INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(provider_profile_id, service_code)
      );
    `;
    
    // Rules
    await sql`
      CREATE TABLE IF NOT EXISTS goldcard_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        service_codes JSONB NOT NULL,
        service_category goldcard_service_category NOT NULL,
        payer_id TEXT,
        required_approval_rate INTEGER NOT NULL,
        min_auth_requests INTEGER NOT NULL,
        evaluation_period_months INTEGER NOT NULL,
        review_frequency TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `;
    
    // Events
    await sql`
      CREATE TABLE IF NOT EXISTS goldcard_events (
        id TEXT PRIMARY KEY,
        provider_profile_id TEXT NOT NULL REFERENCES goldcard_provider_profiles(id),
        eligibility_id TEXT REFERENCES goldcard_eligibility(id),
        event_type TEXT NOT NULL,
        service_code TEXT NOT NULL,
        service_name TEXT NOT NULL,
        reason TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Prior auth tracker
    await sql`
      CREATE TABLE IF NOT EXISTS goldcard_prior_auth_tracker (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        patient_id TEXT,
        service_code TEXT NOT NULL,
        service_name TEXT NOT NULL,
        payer_id TEXT,
        requested_date TIMESTAMP WITH TIME ZONE NOT NULL,
        decision_date TIMESTAMP WITH TIME ZONE,
        outcome TEXT NOT NULL,
        decision_details JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Claim tracker
    await sql`
      CREATE TABLE IF NOT EXISTS goldcard_claim_tracker (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        patient_id TEXT,
        service_code TEXT NOT NULL,
        service_name TEXT NOT NULL,
        payer_id TEXT,
        prior_auth_id TEXT,
        claim_date TIMESTAMP WITH TIME ZONE NOT NULL,
        outcome TEXT NOT NULL,
        outcome_details JSONB,
        denial_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    logger.info('Goldcarding database tables initialized successfully');
    
    // Close the connection
    await sql.end();
    
    return true;
  } catch (error) {
    logger.error('Error initializing goldcarding database tables:', error);
    return false;
  }
}

export const goldcardingService = new GoldcardingService();

// Initialize the tables automatically on service import
initGoldcardingTables().catch(error => {
  logger.error('Failed to initialize goldcarding tables:', error);
});