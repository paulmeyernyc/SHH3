import { db } from "../../../db";
import { logger } from "../../../observability";
import {
  OrganizationConfig,
  InsertOrganizationConfig,
  OrganizationProcedureException,
  InsertOrganizationProcedureException,
  organizationConfig,
  organizationProcedureException,
} from "../../../../shared/rules-schema";
import { eq } from "drizzle-orm";

/**
 * Provider Organization Configuration Service
 * 
 * This service manages healthcare provider organization-specific configurations:
 * - Organization-level submission preferences
 * - Contract terms and API endpoints
 * - Procedure-specific exceptions for provider organizations
 * 
 * Note: This service specifically handles provider organization entities (hospitals, health systems, 
 * practice groups), NOT individual clinicians/practitioners (doctors, nurses, etc.).
 */
class ProviderOrganizationConfigService {
  /**
   * Create a new organization configuration
   */
  async createOrganizationConfig(
    data: InsertOrganizationConfig
  ): Promise<OrganizationConfig> {
    try {
      // Check if config for this organization already exists
      const existing = await db.query.organizationConfig.findFirst({
        where: (fields, { eq }) => eq(fields.organizationId, data.organizationId),
      });

      if (existing) {
        throw new Error(
          `Configuration for organization ID ${data.organizationId} already exists`
        );
      }

      // Create the organization config
      const [newConfig] = await db
        .insert(organizationConfig)
        .values(data)
        .returning();
      
      logger.info(
        `Created organization config for organization ${data.organizationId}`
      );
      
      return newConfig;
    } catch (error) {
      logger.error("Error creating organization configuration:", error);
      throw error;
    }
  }

  /**
   * Get an organization configuration by ID
   */
  async getOrganizationConfigById(id: string): Promise<OrganizationConfig | null> {
    try {
      const config = await db.query.organizationConfig.findFirst({
        where: (fields, { eq }) => eq(fields.id, id),
        with: {
          organization: true,
          procedureExceptions: true,
        },
      });
      
      return config;
    } catch (error) {
      logger.error(`Error getting organization configuration ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get an organization configuration by organization ID
   */
  async getOrganizationConfigByOrganizationId(
    organizationId: string
  ): Promise<OrganizationConfig | null> {
    try {
      const config = await db.query.organizationConfig.findFirst({
        where: (fields, { eq }) => eq(fields.organizationId, organizationId),
        with: {
          organization: true,
        },
      });
      
      return config;
    } catch (error) {
      logger.error(
        `Error getting organization configuration for org ${organizationId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Update an organization configuration
   */
  async updateOrganizationConfig(
    id: string,
    data: Partial<InsertOrganizationConfig>
  ): Promise<OrganizationConfig> {
    try {
      // Verify config exists
      const existing = await this.getOrganizationConfigById(id);
      
      if (!existing) {
        throw new Error(`Organization configuration with ID ${id} not found`);
      }

      // Update the config
      const [updatedConfig] = await db
        .update(organizationConfig)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(organizationConfig.id, id))
        .returning();
      
      logger.info(`Updated organization config ${id}`);
      
      return updatedConfig;
    } catch (error) {
      logger.error(`Error updating organization configuration ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete an organization configuration
   */
  async deleteOrganizationConfig(id: string): Promise<void> {
    try {
      // Verify config exists
      const existing = await this.getOrganizationConfigById(id);
      
      if (!existing) {
        throw new Error(`Organization configuration with ID ${id} not found`);
      }

      // Delete the config (cascade will handle related records)
      await db.delete(organizationConfig).where(eq(organizationConfig.id, id));
      
      logger.info(`Deleted organization config ${id}`);
    } catch (error) {
      logger.error(`Error deleting organization configuration ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add a procedure exception to an organization configuration
   */
  async addProcedureException(
    organizationConfigId: string,
    data: Omit<
      InsertOrganizationProcedureException,
      "id" | "organizationConfigId" | "createdAt" | "updatedAt"
    >
  ): Promise<OrganizationProcedureException> {
    try {
      // Verify organization config exists
      const existing = await this.getOrganizationConfigById(organizationConfigId);
      
      if (!existing) {
        throw new Error(
          `Organization configuration with ID ${organizationConfigId} not found`
        );
      }

      // Check if an exception already exists for this procedure code
      const existingException = await db.query.organizationProcedureException.findFirst({
        where: (fields, { and, eq }) =>
          and(
            eq(fields.organizationConfigId, organizationConfigId),
            eq(fields.procedureCode, data.procedureCode)
          ),
      });

      if (existingException) {
        throw new Error(
          `Exception for procedure ${data.procedureCode} already exists for this organization config`
        );
      }

      // Create the procedure exception
      const [newException] = await db
        .insert(organizationProcedureException)
        .values({
          ...data,
          organizationConfigId,
        })
        .returning();
      
      logger.info(
        `Added procedure exception for ${data.procedureCode} to organization config ${organizationConfigId}`
      );
      
      return newException;
    } catch (error) {
      logger.error(
        `Error adding procedure exception to organization config ${organizationConfigId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get all procedure exceptions for an organization configuration
   */
  async getProcedureExceptions(
    organizationConfigId: string
  ): Promise<OrganizationProcedureException[]> {
    try {
      const exceptions = await db.query.organizationProcedureException.findMany({
        where: (fields, { eq }) => eq(fields.organizationConfigId, organizationConfigId),
        orderBy: (fields, { asc }) => [asc(fields.procedureCode)],
      });
      
      return exceptions;
    } catch (error) {
      logger.error(
        `Error getting procedure exceptions for organization config ${organizationConfigId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Update a procedure exception
   */
  async updateProcedureException(
    id: string,
    data: Partial<
      Omit<
        InsertOrganizationProcedureException,
        "id" | "organizationConfigId" | "createdAt" | "updatedAt"
      >
    >
  ): Promise<OrganizationProcedureException> {
    try {
      // Verify exception exists
      const existing = await db.query.organizationProcedureException.findFirst({
        where: (fields, { eq }) => eq(fields.id, id),
      });
      
      if (!existing) {
        throw new Error(`Procedure exception with ID ${id} not found`);
      }

      // Update the exception
      const [updatedException] = await db
        .update(organizationProcedureException)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(organizationProcedureException.id, id))
        .returning();
      
      logger.info(`Updated procedure exception ${id}`);
      
      return updatedException;
    } catch (error) {
      logger.error(`Error updating procedure exception ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a procedure exception
   */
  async deleteProcedureException(id: string): Promise<void> {
    try {
      // Verify exception exists
      const existing = await db.query.organizationProcedureException.findFirst({
        where: (fields, { eq }) => eq(fields.id, id),
      });
      
      if (!existing) {
        throw new Error(`Procedure exception with ID ${id} not found`);
      }

      // Delete the exception
      await db
        .delete(organizationProcedureException)
        .where(eq(organizationProcedureException.id, id));
      
      logger.info(`Deleted procedure exception ${id}`);
    } catch (error) {
      logger.error(`Error deleting procedure exception ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get specific procedure handling information for an organization
   * and procedure code, taking into account exceptions
   */
  async getProcedureHandling(
    organizationId: string,
    procedureCode: string
  ): Promise<{
    requiresPreAuth: boolean;
    specialInstructions: string | null;
    documentationRequired: string[] | null;
  }> {
    try {
      // Get the organization config
      const config = await this.getOrganizationConfigByOrganizationId(organizationId);
      
      if (!config) {
        throw new Error(`No configuration found for organization ID ${organizationId}`);
      }

      // Get procedure exceptions for this organization
      const exceptions = await this.getProcedureExceptions(config.id);
      
      // Check if there's an exception for this procedure code
      const exception = exceptions.find(e => e.procedureCode === procedureCode);
      
      if (exception) {
        // Use the exception values
        return {
          requiresPreAuth: exception.requiresPreAuth ?? config.requiresPreAuth,
          specialInstructions: exception.specialInstructions || config.specialInstructions || null,
          documentationRequired: exception.documentationRequired || null,
        };
      }
      
      // Use the default values
      return {
        requiresPreAuth: config.requiresPreAuth,
        specialInstructions: config.specialInstructions || null,
        documentationRequired: null,
      };
    } catch (error) {
      logger.error(
        `Error getting procedure handling for organization ${organizationId} and procedure ${procedureCode}:`,
        error
      );
      throw error;
    }
  }
}

// Export singleton instance
export const providerOrganizationConfigService = new ProviderOrganizationConfigService();