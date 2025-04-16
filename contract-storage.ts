import { logger } from '../utils/logger';
import { db } from '../db';
import { eq, desc, and, sql } from 'drizzle-orm';
import {
  contracts,
  contractParticipants,
  contractAnalyses,
  costEstimateRequests
} from '@shared/contract-schema';

/**
 * Storage service for contract management
 */
class ContractStorage {
  /**
   * Get a contract by ID
   */
  async getContract(id: number) {
    try {
      const [contract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, id))
        .limit(1);
      
      return contract;
    } catch (error) {
      logger.error('Failed to get contract by ID', { id, error });
      throw new Error('Database error while retrieving contract');
    }
  }
  
  /**
   * Get all contracts owned by an organization
   */
  async getContractsByOwner(organizationId: number) {
    try {
      return await db
        .select()
        .from(contracts)
        .where(eq(contracts.ownerOrganizationId, organizationId))
        .orderBy(desc(contracts.updatedAt));
    } catch (error) {
      logger.error('Failed to get contracts by owner', { organizationId, error });
      throw new Error('Database error while retrieving contracts by owner');
    }
  }
  
  /**
   * Get all contracts where an organization is a participant
   */
  async getContractsByParticipant(organizationId: number) {
    try {
      // Get all contract IDs where the organization is a participant
      const participations = await db
        .select({ contractId: contractParticipants.contractId })
        .from(contractParticipants)
        .where(eq(contractParticipants.organizationId, organizationId));
      
      // Extract contract IDs
      const contractIds = participations.map(p => p.contractId);
      
      if (contractIds.length === 0) {
        return [];
      }
      
      // Get the actual contracts
      return await db
        .select()
        .from(contracts)
        .where(sql`${contracts.id} IN (${contractIds.join(',')})`)
        .orderBy(desc(contracts.updatedAt));
    } catch (error) {
      logger.error('Failed to get contracts by participant', { organizationId, error });
      throw new Error('Database error while retrieving contracts by participant');
    }
  }
  
  /**
   * Check if an organization is a participant in a contract
   */
  async checkContractParticipant(contractId: number, organizationId: number) {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(contractParticipants)
        .where(
          and(
            eq(contractParticipants.contractId, contractId),
            eq(contractParticipants.organizationId, organizationId)
          )
        );
      
      return result.count > 0;
    } catch (error) {
      logger.error('Failed to check contract participant', { contractId, organizationId, error });
      throw new Error('Database error while checking contract participant');
    }
  }
  
  /**
   * Get all participants for a contract
   */
  async getContractParticipants(contractId: number) {
    try {
      return await db
        .select()
        .from(contractParticipants)
        .where(eq(contractParticipants.contractId, contractId));
    } catch (error) {
      logger.error('Failed to get contract participants', { contractId, error });
      throw new Error('Database error while retrieving contract participants');
    }
  }
  
  /**
   * Create a new contract
   */
  async createContract(contractData: any) {
    try {
      const [contract] = await db
        .insert(contracts)
        .values({
          ...contractData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      // If this is a new contract, add the owner organization as a participant
      await this.addContractParticipant({
        contractId: contract.id,
        organizationId: contractData.ownerOrganizationId,
        role: 'owner',
        permissions: ['read', 'write', 'share', 'delete'],
        createdAt: new Date()
      });
      
      return contract;
    } catch (error) {
      logger.error('Failed to create contract', { error });
      throw new Error('Database error while creating contract');
    }
  }
  
  /**
   * Update an existing contract
   */
  async updateContract(id: number, contractData: any) {
    try {
      const [updatedContract] = await db
        .update(contracts)
        .set({
          ...contractData,
          updatedAt: new Date()
        })
        .where(eq(contracts.id, id))
        .returning();
      
      return updatedContract;
    } catch (error) {
      logger.error('Failed to update contract', { id, error });
      throw new Error('Database error while updating contract');
    }
  }
  
  /**
   * Add a participant to a contract
   */
  async addContractParticipant(participantData: any) {
    try {
      const [participant] = await db
        .insert(contractParticipants)
        .values(participantData)
        .returning();
      
      return participant;
    } catch (error) {
      logger.error('Failed to add contract participant', { error });
      throw new Error('Database error while adding contract participant');
    }
  }
  
  /**
   * Remove a participant from a contract
   */
  async removeContractParticipant(contractId: number, organizationId: number) {
    try {
      await db
        .delete(contractParticipants)
        .where(
          and(
            eq(contractParticipants.contractId, contractId),
            eq(contractParticipants.organizationId, organizationId)
          )
        );
      
      return true;
    } catch (error) {
      logger.error('Failed to remove contract participant', { contractId, organizationId, error });
      throw new Error('Database error while removing contract participant');
    }
  }
  
  /**
   * Create a contract analysis
   */
  async createContractAnalysis(analysisData: any) {
    try {
      const [analysis] = await db
        .insert(contractAnalyses)
        .values({
          ...analysisData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return analysis;
    } catch (error) {
      logger.error('Failed to create contract analysis', { error });
      throw new Error('Database error while creating contract analysis');
    }
  }
  
  /**
   * Get the latest analysis for a contract
   */
  async getLatestAnalysis(contractId: number) {
    try {
      const [analysis] = await db
        .select()
        .from(contractAnalyses)
        .where(eq(contractAnalyses.contractId, contractId))
        .orderBy(desc(contractAnalyses.createdAt))
        .limit(1);
      
      return analysis;
    } catch (error) {
      logger.error('Failed to get latest analysis', { contractId, error });
      throw new Error('Database error while retrieving latest analysis');
    }
  }
  
  /**
   * Create a cost estimate request
   */
  async createCostEstimateRequest(requestData: any) {
    try {
      const [request] = await db
        .insert(costEstimateRequests)
        .values({
          ...requestData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return request;
    } catch (error) {
      logger.error('Failed to create cost estimate request', { error });
      throw new Error('Database error while creating cost estimate request');
    }
  }
  
  /**
   * Update a cost estimate request
   */
  async updateCostEstimateRequest(id: number, requestData: any) {
    try {
      const [updatedRequest] = await db
        .update(costEstimateRequests)
        .set({
          ...requestData,
          updatedAt: new Date()
        })
        .where(eq(costEstimateRequests.id, id))
        .returning();
      
      return updatedRequest;
    } catch (error) {
      logger.error('Failed to update cost estimate request', { id, error });
      throw new Error('Database error while updating cost estimate request');
    }
  }
  
  /**
   * Get a cost estimate request by ID
   */
  async getCostEstimateRequest(id: number) {
    try {
      const [request] = await db
        .select()
        .from(costEstimateRequests)
        .where(eq(costEstimateRequests.id, id))
        .limit(1);
      
      return request;
    } catch (error) {
      logger.error('Failed to get cost estimate request', { id, error });
      throw new Error('Database error while retrieving cost estimate request');
    }
  }
  
  /**
   * Get all cost estimate requests for a contract
   */
  async getCostEstimateRequests(contractId: number) {
    try {
      return await db
        .select()
        .from(costEstimateRequests)
        .where(eq(costEstimateRequests.contractId, contractId))
        .orderBy(desc(costEstimateRequests.createdAt));
    } catch (error) {
      logger.error('Failed to get cost estimate requests', { contractId, error });
      throw new Error('Database error while retrieving cost estimate requests');
    }
  }
}

export const contractStorage = new ContractStorage();