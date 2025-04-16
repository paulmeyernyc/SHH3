import { db } from "../../../db";
import { logger } from "../../../observability";
import {
  PayerConfig,
  InsertPayerConfig,
  ProcedureOverride,
  InsertProcedureOverride,
  payerConfig,
  procedureOverride,
} from "../../../../shared/prior-auth-schema";
import { eq } from "drizzle-orm";

/**
 * Payer Configuration Service
 * 
 * This service manages all payer-related configurations:
 * - API endpoints and credentials
 * - Supported protocols (FHIR, X12)
 * - Default authorization paths
 * - Procedure-specific overrides
 */
class PayerConfigService {
  /**
   * Create a new payer configuration
   */
  async createPayerConfig(data: InsertPayerConfig): Promise<PayerConfig> {
    try {
      // Check if payer config with same payerId already exists
      const existing = await db.query.payerConfig.findFirst({
        where: (fields, { eq }) => eq(fields.payerId, data.payerId),
      });

      if (existing) {
        throw new Error(`Payer configuration for payer ID ${data.payerId} already exists`);
      }

      // Create the payer config
      const [newConfig] = await db.insert(payerConfig).values(data).returning();
      logger.info(`Created payer config for ${data.payerName} (${data.payerId})`);
      
      return newConfig;
    } catch (error) {
      logger.error("Error creating payer configuration:", error);
      throw error;
    }
  }

  /**
   * Get all payer configurations
   */
  async listPayerConfigs(): Promise<PayerConfig[]> {
    try {
      const configs = await db.query.payerConfig.findMany({
        orderBy: (fields, { asc }) => [asc(fields.payerName)],
      });
      
      return configs;
    } catch (error) {
      logger.error("Error listing payer configurations:", error);
      throw error;
    }
  }

  /**
   * Get a payer configuration by ID
   */
  async getPayerConfigById(id: string): Promise<PayerConfig | null> {
    try {
      const config = await db.query.payerConfig.findFirst({
        where: (fields, { eq }) => eq(fields.id, id),
        with: {
          procedureOverrides: true,
        },
      });
      
      return config;
    } catch (error) {
      logger.error(`Error getting payer configuration ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get a payer configuration by payer ID
   */
  async getPayerConfigByPayerId(payerId: string): Promise<PayerConfig | null> {
    try {
      const config = await db.query.payerConfig.findFirst({
        where: (fields, { eq }) => eq(fields.payerId, payerId),
      });
      
      return config;
    } catch (error) {
      logger.error(`Error getting payer configuration for payer ${payerId}:`, error);
      throw error;
    }
  }

  /**
   * Update a payer configuration
   */
  async updatePayerConfig(id: string, data: Partial<InsertPayerConfig>): Promise<PayerConfig> {
    try {
      // Verify payer config exists
      const existing = await this.getPayerConfigById(id);
      
      if (!existing) {
        throw new Error(`Payer configuration with ID ${id} not found`);
      }

      // Update the payer config
      const [updatedConfig] = await db
        .update(payerConfig)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(payerConfig.id, id))
        .returning();
      
      logger.info(`Updated payer config ${id}`);
      
      return updatedConfig;
    } catch (error) {
      logger.error(`Error updating payer configuration ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a payer configuration
   */
  async deletePayerConfig(id: string): Promise<void> {
    try {
      // Verify payer config exists
      const existing = await this.getPayerConfigById(id);
      
      if (!existing) {
        throw new Error(`Payer configuration with ID ${id} not found`);
      }

      // Delete the payer config (cascade will handle related records)
      await db.delete(payerConfig).where(eq(payerConfig.id, id));
      
      logger.info(`Deleted payer config ${id}`);
    } catch (error) {
      logger.error(`Error deleting payer configuration ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add a procedure override to a payer configuration
   */
  async addProcedureOverride(
    payerConfigId: string,
    data: Omit<InsertProcedureOverride, "id" | "payerConfigId" | "createdAt" | "updatedAt">
  ): Promise<ProcedureOverride> {
    try {
      // Verify payer config exists
      const existing = await this.getPayerConfigById(payerConfigId);
      
      if (!existing) {
        throw new Error(`Payer configuration with ID ${payerConfigId} not found`);
      }

      // Check if an override already exists for this procedure code
      const existingOverride = await db.query.procedureOverride.findFirst({
        where: (fields, { and, eq }) => 
          and(
            eq(fields.payerConfigId, payerConfigId),
            eq(fields.procedureCode, data.procedureCode)
          ),
      });

      if (existingOverride) {
        throw new Error(
          `Override for procedure ${data.procedureCode} already exists for this payer config`
        );
      }

      // Create the procedure override
      const [newOverride] = await db
        .insert(procedureOverride)
        .values({
          ...data,
          payerConfigId,
        })
        .returning();
      
      logger.info(
        `Added procedure override for ${data.procedureCode} to payer config ${payerConfigId}`
      );
      
      return newOverride;
    } catch (error) {
      logger.error(`Error adding procedure override to payer config ${payerConfigId}:`, error);
      throw error;
    }
  }

  /**
   * Get all procedure overrides for a payer configuration
   */
  async getProcedureOverrides(payerConfigId: string): Promise<ProcedureOverride[]> {
    try {
      const overrides = await db.query.procedureOverride.findMany({
        where: (fields, { eq }) => eq(fields.payerConfigId, payerConfigId),
        orderBy: (fields, { asc }) => [asc(fields.procedureCode)],
      });
      
      return overrides;
    } catch (error) {
      logger.error(`Error getting procedure overrides for payer config ${payerConfigId}:`, error);
      throw error;
    }
  }

  /**
   * Update a procedure override
   */
  async updateProcedureOverride(
    id: string,
    data: Partial<Omit<InsertProcedureOverride, "id" | "payerConfigId" | "createdAt" | "updatedAt">>
  ): Promise<ProcedureOverride> {
    try {
      // Verify override exists
      const existing = await db.query.procedureOverride.findFirst({
        where: (fields, { eq }) => eq(fields.id, id),
      });
      
      if (!existing) {
        throw new Error(`Procedure override with ID ${id} not found`);
      }

      // Update the override
      const [updatedOverride] = await db
        .update(procedureOverride)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(procedureOverride.id, id))
        .returning();
      
      logger.info(`Updated procedure override ${id}`);
      
      return updatedOverride;
    } catch (error) {
      logger.error(`Error updating procedure override ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a procedure override
   */
  async deleteProcedureOverride(id: string): Promise<void> {
    try {
      // Verify override exists
      const existing = await db.query.procedureOverride.findFirst({
        where: (fields, { eq }) => eq(fields.id, id),
      });
      
      if (!existing) {
        throw new Error(`Procedure override with ID ${id} not found`);
      }

      // Delete the override
      await db.delete(procedureOverride).where(eq(procedureOverride.id, id));
      
      logger.info(`Deleted procedure override ${id}`);
    } catch (error) {
      logger.error(`Error deleting procedure override ${id}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const payerConfigService = new PayerConfigService();