/**
 * Smart Health Hub - Scheduling MCP Service
 * 
 * This service handles Model Context Protocol (MCP) integrations for the Scheduling service.
 * MCP allows for organization-specific rules, policies, and configurations to be applied
 * to scheduling operations.
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../../../server/utils/logger';
import { type Schedule, type Slot, type Appointment } from '../../../shared/scheduling-schema';

interface OrganizationPolicy {
  id: string;
  organizationId: string;
  policyType: string; // 'scheduling', 'appointment', etc.
  rules: PolicyRule[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

interface PolicyRule {
  id: string;
  name: string;
  description?: string;
  conditionExpression: string; // JSON or string representation of condition
  actionExpression: string; // JSON or string representation of action
  priority: number;
  active: boolean;
}

export interface SchedulingPolicy {
  maxAppointmentsPerSlot: number; // Default: 1, but can be overridden for group sessions
  minTimeBeforeBooking: number; // Minutes before a slot that it can be booked (0 = anytime)
  maxTimeBeforeBooking: number; // Days ahead that slots can be booked (0 = unlimited)
  allowOverbooking: boolean; // Whether overbooking is allowed
  requirePriorAuth: boolean; // Whether prior authorization is required by default
  requirePriorAuthForServices: string[]; // Service types requiring prior auth
  priorAuthGracePeriodDays: number; // Days to allow booking without prior auth
  autoApproveEligibleAppointments: boolean; // Auto approve if eligibility check passes
  cancelNoShowPolicy: string; // Action for no-shows ('fee', 'restrict', 'none')
  noShowFeeAmount?: number; // Fee amount for no-shows if policy is 'fee'
  noShowRestrictionDays?: number; // Days to restrict future bookings if policy is 'restrict'
  patientCancellationWindowHours: number; // Hours before appointment that patient can cancel
  providerCancellationWindowHours: number; // Hours before appointment that provider can cancel
}

export interface PriorAuthProcessingRule {
  serviceType: string;
  specialty: string;
  required: boolean;
  goldcardingEnabled: boolean;
  goldcardingThreshold: number; // Percentage threshold for goldcarding (e.g., 95)
  decisionTimeframe: number; // Expected hours for decision
}

export interface EligibilityProcessingRule {
  insuranceType: string; // 'commercial', 'medicare', 'medicaid', etc.
  requiresVerification: boolean;
  verificationTimeframe: number; // Hours expected for verification
  autoBookOnVerification: boolean;
}

export class SchedulingMcpService {
  // Default policy that applies if no organization-specific policy exists
  private defaultPolicy: SchedulingPolicy = {
    maxAppointmentsPerSlot: 1,
    minTimeBeforeBooking: 0,
    maxTimeBeforeBooking: 365, // 1 year
    allowOverbooking: false,
    requirePriorAuth: false,
    requirePriorAuthForServices: ['imaging', 'procedure', 'specialist'],
    priorAuthGracePeriodDays: 7,
    autoApproveEligibleAppointments: true,
    cancelNoShowPolicy: 'none',
    patientCancellationWindowHours: 24,
    providerCancellationWindowHours: 48
  };

  // Default prior auth rule
  private defaultPriorAuthRule: PriorAuthProcessingRule = {
    serviceType: 'default',
    specialty: 'default',
    required: false,
    goldcardingEnabled: true,
    goldcardingThreshold: 95,
    decisionTimeframe: 72 // 72 hours
  };

  // Default eligibility rule
  private defaultEligibilityRule: EligibilityProcessingRule = {
    insuranceType: 'default',
    requiresVerification: true,
    verificationTimeframe: 24, // 24 hours
    autoBookOnVerification: true
  };

  constructor() {
    logger.info('Initializing Scheduling MCP Service');
  }

  /**
   * Get scheduling policy for an organization
   */
  async getSchedulingPolicy(organizationId: string): Promise<SchedulingPolicy> {
    try {
      // In a real implementation, this would query the MCP service for the organization's policy
      // For now, we'll return the default policy with a simulated delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // In a real implementation, we would merge the default policy with organization-specific overrides
      return this.defaultPolicy;
    } catch (error) {
      logger.error('Error getting scheduling policy:', error);
      return this.defaultPolicy;
    }
  }

  /**
   * Get prior auth processing rule for a specific service type and specialty
   */
  async getPriorAuthRule(
    organizationId: string,
    serviceType: string,
    specialty?: string
  ): Promise<PriorAuthProcessingRule> {
    try {
      // In a real implementation, this would query the MCP service for specific rules
      // For now, we'll return a rule based on the service type
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Example of customizing rules based on service type
      if (['imaging', 'procedure', 'specialist'].includes(serviceType)) {
        return {
          ...this.defaultPriorAuthRule,
          serviceType,
          specialty: specialty || 'default',
          required: true
        };
      }
      
      return {
        ...this.defaultPriorAuthRule,
        serviceType,
        specialty: specialty || 'default'
      };
    } catch (error) {
      logger.error('Error getting prior auth rule:', error);
      return this.defaultPriorAuthRule;
    }
  }

  /**
   * Get eligibility processing rule for a specific insurance type
   */
  async getEligibilityRule(
    organizationId: string,
    insuranceType: string
  ): Promise<EligibilityProcessingRule> {
    try {
      // In a real implementation, this would query the MCP service for specific rules
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Example of customizing rules based on insurance type
      if (insuranceType === 'medicaid') {
        return {
          ...this.defaultEligibilityRule,
          insuranceType,
          verificationTimeframe: 48 // Longer verification time for Medicaid
        };
      }
      
      return {
        ...this.defaultEligibilityRule,
        insuranceType
      };
    } catch (error) {
      logger.error('Error getting eligibility rule:', error);
      return this.defaultEligibilityRule;
    }
  }

  /**
   * Validate a slot creation based on organization policies
   */
  async validateSlotCreation(
    organizationId: string,
    scheduleData: Schedule,
    slotData: Partial<Slot>
  ): Promise<{ valid: boolean; message?: string; }> {
    try {
      const policy = await this.getSchedulingPolicy(organizationId);
      
      // Example validation logic
      if (slotData.maxAppointments && slotData.maxAppointments > policy.maxAppointmentsPerSlot) {
        return { 
          valid: false, 
          message: `Max appointments per slot (${slotData.maxAppointments}) exceeds organization policy limit (${policy.maxAppointmentsPerSlot})` 
        };
      }
      
      if (slotData.overbooked && !policy.allowOverbooking) {
        return { 
          valid: false, 
          message: 'Overbooking is not allowed by organization policy' 
        };
      }
      
      return { valid: true };
    } catch (error) {
      logger.error('Error validating slot creation:', error);
      return { valid: true }; // Default to permissive on error
    }
  }

  /**
   * Validate appointment booking based on organization policies
   */
  async validateAppointmentBooking(
    organizationId: string,
    patientId: string,
    slotData: Slot,
    scheduleData: Schedule,
    appointmentData: Partial<Appointment>,
    payerId?: string
  ): Promise<{ 
    valid: boolean; 
    message?: string; 
    requiresPriorAuth?: boolean;
    requiresEligibility?: boolean;
  }> {
    try {
      const policy = await this.getSchedulingPolicy(organizationId);
      
      // Check if appointment is being booked too close to slot time
      const now = new Date();
      const slotTime = new Date(slotData.startDateTime);
      const minutesUntilSlot = (slotTime.getTime() - now.getTime()) / (60 * 1000);
      
      if (minutesUntilSlot < policy.minTimeBeforeBooking) {
        return { 
          valid: false, 
          message: `Appointments must be booked at least ${policy.minTimeBeforeBooking} minutes in advance` 
        };
      }
      
      // Check if appointment is being booked too far in advance
      const daysUntilSlot = minutesUntilSlot / (24 * 60);
      if (policy.maxTimeBeforeBooking > 0 && daysUntilSlot > policy.maxTimeBeforeBooking) {
        return { 
          valid: false, 
          message: `Appointments cannot be booked more than ${policy.maxTimeBeforeBooking} days in advance` 
        };
      }
      
      // Check if prior auth is required
      let requiresPriorAuth = false;
      if (policy.requirePriorAuth) {
        requiresPriorAuth = true;
      } else if (scheduleData.serviceType && 
                policy.requirePriorAuthForServices.includes(scheduleData.serviceType)) {
        requiresPriorAuth = true;
      }
      
      // Check if eligibility verification is required
      const requiresEligibility = !!payerId;
      
      return { 
        valid: true,
        requiresPriorAuth,
        requiresEligibility
      };
    } catch (error) {
      logger.error('Error validating appointment booking:', error);
      return { valid: true }; // Default to permissive on error
    }
  }

  /**
   * Process appointment cancellation policy
   */
  async processAppointmentCancellation(
    organizationId: string,
    appointmentId: string,
    appointmentData: Appointment,
    cancelledBy: 'patient' | 'provider' | 'system',
    cancelReason: string
  ): Promise<{ 
    approved: boolean; 
    fee?: number; 
    restrictions?: any;
    message?: string; 
  }> {
    try {
      const policy = await this.getSchedulingPolicy(organizationId);
      
      // Check cancellation window
      const now = new Date();
      const appointmentTime = new Date(appointmentData.startDateTime);
      const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (60 * 60 * 1000);
      
      if (cancelledBy === 'patient' && hoursUntilAppointment < policy.patientCancellationWindowHours) {
        // Late cancellation by patient
        if (policy.cancelNoShowPolicy === 'fee' && policy.noShowFeeAmount) {
          return {
            approved: true,
            fee: policy.noShowFeeAmount,
            message: `Late cancellation fee of $${policy.noShowFeeAmount} applied`
          };
        } else if (policy.cancelNoShowPolicy === 'restrict' && policy.noShowRestrictionDays) {
          return {
            approved: true,
            restrictions: {
              type: 'booking_restriction',
              days: policy.noShowRestrictionDays
            },
            message: `Booking restricted for ${policy.noShowRestrictionDays} days due to late cancellation`
          };
        }
      } else if (cancelledBy === 'provider' && hoursUntilAppointment < policy.providerCancellationWindowHours) {
        // Late cancellation by provider
        return {
          approved: true,
          message: 'Provider cancellation within window - patient should be notified'
        };
      }
      
      // Normal cancellation
      return {
        approved: true,
        message: 'Cancellation processed successfully'
      };
    } catch (error) {
      logger.error('Error processing appointment cancellation:', error);
      return { approved: true }; // Default to permissive on error
    }
  }

  /**
   * Process no-show policy
   */
  async processNoShow(
    organizationId: string,
    appointmentId: string,
    appointmentData: Appointment
  ): Promise<{ 
    fee?: number; 
    restrictions?: any;
    message: string; 
  }> {
    try {
      const policy = await this.getSchedulingPolicy(organizationId);
      
      if (policy.cancelNoShowPolicy === 'fee' && policy.noShowFeeAmount) {
        return {
          fee: policy.noShowFeeAmount,
          message: `No-show fee of $${policy.noShowFeeAmount} applied`
        };
      } else if (policy.cancelNoShowPolicy === 'restrict' && policy.noShowRestrictionDays) {
        return {
          restrictions: {
            type: 'booking_restriction',
            days: policy.noShowRestrictionDays
          },
          message: `Booking restricted for ${policy.noShowRestrictionDays} days due to no-show`
        };
      }
      
      return {
        message: 'No policy action required for no-show'
      };
    } catch (error) {
      logger.error('Error processing no-show policy:', error);
      return { message: 'Error processing no-show policy' };
    }
  }
}

// Singleton instance
export const schedulingMcpService = new SchedulingMcpService();