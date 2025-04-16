import { db } from "../../../db";
import { logger } from "../../../utils/logger";
import {
  CanonicalDataRule,
  canonicalDataRule,
  InsertCanonicalDataRule,
} from "../../../../shared/prior-auth-schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Canonical Rule Service
 * 
 * This service manages the clinical and procedural rules that determine
 * authorization requirements and documentation needs.
 * 
 * It supports:
 * - Rule definitions by procedure code
 * - Rule evaluation against patient data
 * - Versioned rule sets for different standards or requirements
 */
class CanonicalRuleService {
  /**
   * Create or update a canonical data rule
   */
  async upsertRule(data: InsertCanonicalDataRule): Promise<CanonicalDataRule> {
    try {
      // Check if rule already exists
      const existingRule = await db.query.canonicalDataRule.findFirst({
        where: (fields, { and, eq }) => 
          and(
            eq(fields.procedureCode, data.procedureCode),
            eq(fields.ruleSetName, data.ruleSetName),
            eq(fields.ruleSetVersion, data.ruleSetVersion)
          ),
      });

      if (existingRule) {
        // Update existing rule
        const [updatedRule] = await db
          .update(canonicalDataRule)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(canonicalDataRule.id, existingRule.id))
          .returning();
        
        logger.info(`Updated canonical rule for procedure ${data.procedureCode}`);
        return updatedRule;
      } else {
        // Create new rule
        const [newRule] = await db.insert(canonicalDataRule).values(data).returning();
        logger.info(`Created canonical rule for procedure ${data.procedureCode}`);
        return newRule;
      }
    } catch (error) {
      logger.error(`Error upserting canonical rule:`, error);
      throw error;
    }
  }

  /**
   * Get a rule by procedure code and optionally rule set name
   */
  async getRuleByProcedureCode(
    procedureCode: string,
    ruleSetName?: string
  ): Promise<CanonicalDataRule | null> {
    try {
      let query = db
        .select()
        .from(canonicalDataRule)
        .where(
          and(
            eq(canonicalDataRule.procedureCode, procedureCode),
            eq(canonicalDataRule.enabled, true)
          )
        );

      if (ruleSetName) {
        query = query.where(eq(canonicalDataRule.ruleSetName, ruleSetName));
      }

      // Order by version descending to get latest version first
      const rules = await query
        .orderBy(desc(canonicalDataRule.ruleSetVersion))
        .limit(1);

      return rules.length > 0 ? rules[0] : null;
    } catch (error) {
      logger.error(`Error getting canonical rule for procedure ${procedureCode}:`, error);
      throw error;
    }
  }

  /**
   * Get a rule by ID
   */
  async getRuleById(id: string): Promise<CanonicalDataRule | null> {
    try {
      const rule = await db.query.canonicalDataRule.findFirst({
        where: (fields, { eq }) => eq(fields.id, id),
      });
      
      return rule;
    } catch (error) {
      logger.error(`Error getting canonical rule by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * List all rule sets
   */
  async listRuleSets(): Promise<
    { ruleSetName: string; ruleSetVersion: string; procedureCount: number }[]
  > {
    try {
      const results = await db.execute(
        sql`SELECT 
          rule_set_name, 
          rule_set_version, 
          COUNT(id) as procedure_count 
        FROM 
          canonical_data_rule 
        WHERE 
          enabled = true 
        GROUP BY 
          rule_set_name, rule_set_version 
        ORDER BY 
          rule_set_name, rule_set_version DESC`
      );

      return results.rows.map((row: any) => ({
        ruleSetName: row.rule_set_name,
        ruleSetVersion: row.rule_set_version,
        procedureCount: parseInt(row.procedure_count),
      }));
    } catch (error) {
      logger.error("Error listing rule sets:", error);
      throw error;
    }
  }

  /**
   * Evaluate a rule for a patient
   */
  async evaluateRule(
    procedureCode: string,
    patientData: any,
    ruleSetName?: string
  ): Promise<{
    requiresPriorAuth: boolean;
    requiresDocumentation: string[];
    message: string;
    confidence: number;
  }> {
    try {
      // Get the rule
      const rule = await this.getRuleByProcedureCode(procedureCode, ruleSetName);

      if (!rule) {
        return {
          requiresPriorAuth: true, // Default to requiring auth if no rule exists
          requiresDocumentation: [],
          message: "No rule found for this procedure code. Prior authorization is required.",
          confidence: 0.5,
        };
      }

      // In a real implementation, this would:
      // 1. Execute the rule logic against the patient data
      // 2. Return the evaluation result
      
      // For now, we'll just simulate rule evaluation
      const requiresAuth = rule.criteriaDescription?.includes("requires authorization") ?? true;
      const confidence = Math.random() * 0.3 + 0.7; // Random confidence between 0.7 and 1.0
      
      return {
        requiresPriorAuth: requiresAuth,
        requiresDocumentation: rule.documentationRequired || [],
        message: rule.criteriaDescription || "Evaluation complete.",
        confidence,
      };
    } catch (error) {
      logger.error(
        `Error evaluating rule for procedure ${procedureCode}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Update a rule
   */
  async updateRule(id: string, data: Partial<InsertCanonicalDataRule>): Promise<CanonicalDataRule> {
    try {
      // Verify rule exists
      const existingRule = await this.getRuleById(id);
      
      if (!existingRule) {
        throw new Error(`Canonical rule with ID ${id} not found`);
      }

      // Update the rule
      const [updatedRule] = await db
        .update(canonicalDataRule)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(canonicalDataRule.id, id))
        .returning();
      
      logger.info(`Updated canonical rule ${id}`);
      
      return updatedRule;
    } catch (error) {
      logger.error(`Error updating canonical rule ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a rule
   */
  async deleteRule(id: string): Promise<void> {
    try {
      await db.delete(canonicalDataRule).where(eq(canonicalDataRule.id, id));
      logger.info(`Deleted canonical rule ${id}`);
    } catch (error) {
      logger.error(`Error deleting canonical rule ${id}:`, error);
      throw error;
    }
  }

  /**
   * List all rules for a procedure code
   */
  async listRulesForProcedure(procedureCode: string): Promise<CanonicalDataRule[]> {
    try {
      const rules = await db.query.canonicalDataRule.findMany({
        where: (fields, { eq }) => eq(fields.procedureCode, procedureCode),
        orderBy: [
          { column: canonicalDataRule.ruleSetName, order: "asc" },
          { column: canonicalDataRule.ruleSetVersion, order: "desc" }
        ],
      });
      
      return rules;
    } catch (error) {
      logger.error(`Error listing rules for procedure ${procedureCode}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const canonicalRuleService = new CanonicalRuleService();