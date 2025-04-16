import { logger } from "../../utils/logger";
import { payerConfigService } from "./services/payer-config-service";
import { canonicalRuleService } from "./services/canonical-rule-service";
import { providerOrganizationConfigService } from "./services/provider-organization-config-service";

/**
 * Rules Management Service
 * 
 * This service provides a unified interface to the rules management subsystem
 * with three specialized services:
 * 
 * 1. Payer Configuration Service - manages payer-specific settings, API endpoints, etc.
 * 2. Canonical Rule Service - manages clinical rules and criteria (shared across the platform)
 * 3. Provider Organization Config Service - manages healthcare provider organization configurations
 */
class RulesManagementService {
  /**
   * Get procedure handling from both payer and provider organization perspectives
   * This determines how a specific procedure should be handled in the context of
   * both the payer's requirements and the provider organization's configuration
   */
  async getProcedureHandling(
    payerId: string,
    procedureCode: string,
    organizationId?: string
  ) {
    try {
      // Get the payer's requirements for this procedure
      const payerHandling = await payerConfigService.getProcedureHandling(
        payerId,
        procedureCode
      );

      // If there's an organization ID, get their specific handling too
      let orgHandling = null;
      if (organizationId) {
        orgHandling = await providerOrganizationConfigService.getProcedureHandling(
          organizationId,
          procedureCode
        );
      }

      // Get the canonical rule information (if any) for this procedure
      const canonicalRule = await canonicalRuleService.getRuleByProcedureCode(
        procedureCode
      );

      // Combine everything into a composite view
      return {
        payerRequirements: payerHandling,
        organizationConfig: orgHandling,
        canonicalRule: canonicalRule ? {
          id: canonicalRule.id,
          name: canonicalRule.name,
          description: canonicalRule.description,
          version: canonicalRule.version,
          criteria: canonicalRule.criteria,
        } : null,
      };
    } catch (error) {
      logger.error(
        `Error getting procedure handling for ${procedureCode} with payer ${payerId}${
          organizationId ? ` and organization ${organizationId}` : ""
        }:`,
        error
      );
      throw error;
    }
  }

  /**
   * Check if pre-authorization is required for a procedure
   * This is a convenience method that checks across payer, provider, and canonical rules
   */
  async isPreAuthRequired(
    payerId: string,
    procedureCode: string,
    organizationId?: string,
    patientData?: any
  ): Promise<{
    required: boolean;
    source: "payer" | "organization" | "canonical" | "combined";
    details?: any;
  }> {
    try {
      const handling = await this.getProcedureHandling(
        payerId,
        procedureCode,
        organizationId
      );

      // Check payer requirements first
      if (handling.payerRequirements.requiresPreAuth) {
        return {
          required: true,
          source: "payer",
          details: handling.payerRequirements,
        };
      }

      // If organization has specific requirements that override
      if (
        handling.organizationConfig &&
        handling.organizationConfig.requiresPreAuth
      ) {
        return {
          required: true,
          source: "organization",
          details: handling.organizationConfig,
        };
      }

      // If there's a canonical rule, evaluate it
      if (handling.canonicalRule && handling.canonicalRule.criteria) {
        // For now, we'll just check if the rule mentions pre-auth
        // In a full implementation, we'd evaluate the criteria against patient data
        const ruleRequiresPreAuth = this.evaluateCanonicalRule(
          handling.canonicalRule,
          patientData
        );

        if (ruleRequiresPreAuth) {
          return {
            required: true,
            source: "canonical",
            details: handling.canonicalRule,
          };
        }
      }

      // Default: no pre-auth required
      return {
        required: false,
        source: "combined",
        details: handling,
      };
    } catch (error) {
      logger.error(
        `Error determining if pre-auth is required for ${procedureCode} with payer ${payerId}${
          organizationId ? ` and organization ${organizationId}` : ""
        }:`,
        error
      );
      throw error;
    }
  }

  /**
   * Evaluate a canonical rule against patient data
   * This is a simplified implementation - a real one would be more sophisticated
   */
  private evaluateCanonicalRule(rule: any, patientData?: any): boolean {
    if (!patientData) {
      // If we don't have patient data, we can't evaluate the rule in detail
      // So default to requiring pre-auth if the rule exists
      return true;
    }

    // In a real implementation, this would evaluate the rule's criteria
    // against the patient data to make a determination
    
    // For now, we'll implement a simple check
    try {
      const criteria = rule.criteria;
      
      // If the rule explicitly mentions preAuth or priorAuth in its criteria
      if (typeof criteria === 'string') {
        if (criteria.includes('preAuth') || criteria.includes('priorAuth')) {
          return true;
        }
      } else if (typeof criteria === 'object') {
        // Check if there's a requiresPreAuth field that's true
        if (criteria.requiresPreAuth === true) {
          return true;
        }
        
        // Check if there are conditions that would require pre-auth
        if (criteria.conditions && Array.isArray(criteria.conditions)) {
          // In a real implementation, we'd evaluate each condition against patient data
          // For now, we'll just check if any condition explicitly requires pre-auth
          return criteria.conditions.some(
            (condition: any) => condition.requiresPreAuth === true
          );
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Error evaluating canonical rule:', error);
      // If there's an error in evaluation, default to requiring pre-auth
      return true;
    }
  }

  // Payer Configuration Service methods
  async getPayerConfig(payerId: string) {
    return payerConfigService.getPayerConfigByPayerId(payerId);
  }

  async updatePayerConfig(payerId: string, data: any) {
    const config = await payerConfigService.getPayerConfigByPayerId(payerId);
    if (!config) {
      throw new Error(`No configuration found for payer ID ${payerId}`);
    }
    
    return payerConfigService.updatePayerConfig(config.id, data);
  }

  // Provider Organization Configuration Service methods
  async getOrganizationConfig(organizationId: string) {
    return providerOrganizationConfigService.getOrganizationConfigByOrganizationId(
      organizationId
    );
  }

  async updateOrganizationConfig(organizationId: string, data: any) {
    const config = await providerOrganizationConfigService.getOrganizationConfigByOrganizationId(
      organizationId
    );
    if (!config) {
      throw new Error(`No configuration found for organization ID ${organizationId}`);
    }
    
    return providerOrganizationConfigService.updateOrganizationConfig(config.id, data);
  }

  // Canonical Rule Service methods
  async getCanonicalRule(ruleId: string) {
    return canonicalRuleService.getRuleById(ruleId);
  }

  async getCanonicalRuleByCode(procedureCode: string) {
    return canonicalRuleService.getRuleByProcedureCode(procedureCode);
  }

  async updateCanonicalRule(ruleId: string, data: any) {
    return canonicalRuleService.updateRule(ruleId, data);
  }
}

// Export singleton instance
export const rulesManagementService = new RulesManagementService();