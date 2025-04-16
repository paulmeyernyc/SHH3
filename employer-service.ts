/**
 * Smart Health Hub - Employer Service
 * 
 * Core service for managing employer organizations, configurations, and related entities.
 * This service provides business logic for:
 * - Employer profile management
 * - Employee relationship management
 * - Wellness program configuration
 * - Incentive program management
 * - Vendor integrations
 */

import { db } from '../../db';
import {
  employers,
  employees,
  employerLocations,
  employerDepartments,
  employerAdmins,
  wellnessPrograms,
  programContents,
  programEnrollments,
  wellnessActivities,
  incentiveRules,
  incentiveAwards,
  walletTransactions,
  wellnessVendors,
  employerVendorIntegrations,
  employeeVendorAccounts,
  vendorActivitySync,
  
  Employer,
  InsertEmployer,
  Employee,
  InsertEmployee,
  WellnessProgram,
  InsertWellnessProgram,
  IncentiveRule,
  InsertIncentiveRule
} from '../../../shared/employer-schema';
import { eq, and, inArray, like, isNull, not, or, desc, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';

/**
 * Search parameters for querying employers
 */
export interface EmployerSearchParams {
  name?: string;
  industry?: string;
  size?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search parameters for querying employees
 */
export interface EmployeeSearchParams {
  employerId: string;
  status?: string;
  departmentId?: string;
  locationId?: string;
  email?: string;
  name?: string;
  limit?: number;
  offset?: number;
}

/**
 * Program search parameters
 */
export interface ProgramSearchParams {
  employerId: string;
  type?: string;
  status?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Employer Service
 */
export class EmployerService {
  
  /**
   * Create a new employer organization
   */
  async createEmployer(data: InsertEmployer): Promise<Employer> {
    try {
      // Generate ID if not provided
      if (!data.id) {
        data.id = uuidv4();
      }
      
      // Set created timestamp
      data.createdAt = new Date();
      
      // Insert the employer record
      const [employer] = await db.insert(employers).values(data).returning();
      
      if (!employer) {
        throw new Error('Failed to create employer');
      }
      
      logger.info(`Created employer: ${employer.id} (${employer.name})`);
      return employer;
    } catch (error) {
      logger.error('Error creating employer:', error);
      throw error;
    }
  }
  
  /**
   * Get an employer by ID
   */
  async getEmployer(id: string): Promise<Employer | undefined> {
    try {
      const [employer] = await db.select().from(employers).where(eq(employers.id, id));
      return employer;
    } catch (error) {
      logger.error(`Error getting employer ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Update an employer
   */
  async updateEmployer(id: string, data: Partial<InsertEmployer>): Promise<Employer | undefined> {
    try {
      // Remove id from update data if present
      delete data.id;
      
      // Set updated timestamp
      data.updatedAt = new Date();
      
      // Update the employer
      const [employer] = await db
        .update(employers)
        .set(data)
        .where(eq(employers.id, id))
        .returning();
        
      if (!employer) {
        return undefined;
      }
      
      logger.info(`Updated employer: ${id}`);
      return employer;
    } catch (error) {
      logger.error(`Error updating employer ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete an employer
   * Note: This should include cascade logic or prevent deletion if related records exist
   */
  async deleteEmployer(id: string): Promise<boolean> {
    try {
      // Check for related data to determine if deletion is allowed
      const relatedEmployees = await db
        .select({ count: employers.id })
        .from(employees)
        .where(eq(employees.employerId, id));
        
      if (relatedEmployees.length > 0 && relatedEmployees[0].count) {
        throw new Error('Cannot delete employer with existing employees');
      }
      
      // Delete the employer
      const result = await db
        .delete(employers)
        .where(eq(employers.id, id))
        .returning();
        
      const success = result.length > 0;
      
      if (success) {
        logger.info(`Deleted employer: ${id}`);
      }
      
      return success;
    } catch (error) {
      logger.error(`Error deleting employer ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Search for employers based on criteria
   */
  async searchEmployers(params: EmployerSearchParams): Promise<Employer[]> {
    try {
      let query = db.select().from(employers);
      
      // Apply search filters
      if (params.name) {
        query = query.where(like(employers.name, `%${params.name}%`));
      }
      
      if (params.industry) {
        query = query.where(eq(employers.industry, params.industry));
      }
      
      if (params.size) {
        query = query.where(eq(employers.size, params.size));
      }
      
      if (params.status) {
        query = query.where(eq(employers.status, params.status));
      }
      
      // Apply pagination
      if (params.limit) {
        query = query.limit(params.limit);
      }
      
      if (params.offset) {
        query = query.offset(params.offset);
      }
      
      // Execute query
      const results = await query;
      return results;
    } catch (error) {
      logger.error('Error searching employers:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // Employee Management
  // ============================================================================
  
  /**
   * Create a new employee record
   */
  async createEmployee(data: InsertEmployee): Promise<Employee> {
    try {
      // Generate ID if not provided
      if (!data.id) {
        data.id = uuidv4();
      }
      
      // Set created timestamp
      data.createdAt = new Date();
      
      // Insert the employee record
      const [employee] = await db.insert(employees).values(data).returning();
      
      if (!employee) {
        throw new Error('Failed to create employee');
      }
      
      logger.info(`Created employee: ${employee.id} for employer ${employee.employerId}`);
      return employee;
    } catch (error) {
      logger.error('Error creating employee:', error);
      throw error;
    }
  }
  
  /**
   * Get an employee by ID
   */
  async getEmployee(id: string): Promise<Employee | undefined> {
    try {
      const [employee] = await db.select().from(employees).where(eq(employees.id, id));
      return employee;
    } catch (error) {
      logger.error(`Error getting employee ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Update an employee
   */
  async updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    try {
      // Remove id from update data if present
      delete data.id;
      
      // Set updated timestamp
      data.updatedAt = new Date();
      
      // Update the employee
      const [employee] = await db
        .update(employees)
        .set(data)
        .where(eq(employees.id, id))
        .returning();
        
      if (!employee) {
        return undefined;
      }
      
      logger.info(`Updated employee: ${id}`);
      return employee;
    } catch (error) {
      logger.error(`Error updating employee ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete an employee
   */
  async deleteEmployee(id: string): Promise<boolean> {
    try {
      // Delete the employee
      const result = await db
        .delete(employees)
        .where(eq(employees.id, id))
        .returning();
        
      const success = result.length > 0;
      
      if (success) {
        logger.info(`Deleted employee: ${id}`);
      }
      
      return success;
    } catch (error) {
      logger.error(`Error deleting employee ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Search for employees based on criteria
   */
  async searchEmployees(params: EmployeeSearchParams): Promise<Employee[]> {
    try {
      let query = db.select().from(employees)
        .where(eq(employees.employerId, params.employerId));
      
      // Apply search filters
      if (params.status) {
        query = query.where(eq(employees.status, params.status));
      }
      
      if (params.departmentId) {
        query = query.where(eq(employees.departmentId, params.departmentId));
      }
      
      if (params.locationId) {
        query = query.where(eq(employees.locationId, params.locationId));
      }
      
      if (params.email) {
        query = query.where(like(employees.email, `%${params.email}%`));
      }
      
      if (params.name) {
        query = query.where(
          or(
            like(employees.firstName || '', `%${params.name}%`),
            like(employees.lastName || '', `%${params.name}%`)
          )
        );
      }
      
      // Apply pagination
      if (params.limit) {
        query = query.limit(params.limit);
      }
      
      if (params.offset) {
        query = query.offset(params.offset);
      }
      
      // Execute query
      const results = await query;
      return results;
    } catch (error) {
      logger.error('Error searching employees:', error);
      throw error;
    }
  }
  
  /**
   * Invite an employee by email
   */
  async inviteEmployee(employeeId: string): Promise<Employee | undefined> {
    try {
      const employee = await this.getEmployee(employeeId);
      
      if (!employee) {
        throw new Error('Employee not found');
      }
      
      // Update invitation tracking
      const invitationCount = (employee.invitationCount || 0) + 1;
      const now = new Date();
      
      const [updatedEmployee] = await db
        .update(employees)
        .set({
          status: 'invitation_sent',
          invitationSentDate: now,
          lastInvitationDate: now,
          invitationCount: invitationCount,
          updatedAt: now
        })
        .where(eq(employees.id, employeeId))
        .returning();
      
      if (!updatedEmployee) {
        throw new Error('Failed to update employee invitation status');
      }
      
      // NOTE: Actual invitation email sending would be handled by a separate notification service
      // This logic would be implemented in a dedicated onboarding module
      
      logger.info(`Sent invitation to employee: ${employeeId}`);
      return updatedEmployee;
    } catch (error) {
      logger.error(`Error inviting employee ${employeeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Bulk upload employees for an employer
   */
  async bulkUploadEmployees(employerId: string, employeeList: Omit<InsertEmployee, 'id' | 'createdAt'>[]): Promise<Employee[]> {
    try {
      // Prepare employee records
      const employeesToInsert = employeeList.map(employee => ({
        ...employee,
        id: uuidv4(),
        employerId,
        status: 'pending_invitation',
        createdAt: new Date()
      }));
      
      // Insert all employee records
      const createdEmployees = await db
        .insert(employees)
        .values(employeesToInsert)
        .returning();
      
      logger.info(`Bulk uploaded ${createdEmployees.length} employees for employer ${employerId}`);
      return createdEmployees;
    } catch (error) {
      logger.error(`Error bulk uploading employees for employer ${employerId}:`, error);
      throw error;
    }
  }
  
  // ============================================================================
  // Wellness Program Management
  // ============================================================================
  
  /**
   * Create a new wellness program
   */
  async createWellnessProgram(data: InsertWellnessProgram): Promise<WellnessProgram> {
    try {
      // Generate ID if not provided
      if (!data.id) {
        data.id = uuidv4();
      }
      
      // Set created timestamp
      data.createdAt = new Date();
      
      // Insert the program record
      const [program] = await db.insert(wellnessPrograms).values(data).returning();
      
      if (!program) {
        throw new Error('Failed to create wellness program');
      }
      
      logger.info(`Created wellness program: ${program.id} (${program.name}) for employer ${program.employerId}`);
      return program;
    } catch (error) {
      logger.error('Error creating wellness program:', error);
      throw error;
    }
  }
  
  /**
   * Get a wellness program by ID
   */
  async getWellnessProgram(id: string): Promise<WellnessProgram | undefined> {
    try {
      const [program] = await db.select().from(wellnessPrograms).where(eq(wellnessPrograms.id, id));
      return program;
    } catch (error) {
      logger.error(`Error getting wellness program ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a wellness program
   */
  async updateWellnessProgram(id: string, data: Partial<InsertWellnessProgram>): Promise<WellnessProgram | undefined> {
    try {
      // Remove id from update data if present
      delete data.id;
      
      // Set updated timestamp
      data.updatedAt = new Date();
      
      // Update status-related timestamps
      if (data.status === 'active' && !data.launchedAt) {
        data.launchedAt = new Date();
      } else if (data.status === 'completed' && !data.completedAt) {
        data.completedAt = new Date();
      }
      
      // Update the program
      const [program] = await db
        .update(wellnessPrograms)
        .set(data)
        .where(eq(wellnessPrograms.id, id))
        .returning();
        
      if (!program) {
        return undefined;
      }
      
      logger.info(`Updated wellness program: ${id}`);
      return program;
    } catch (error) {
      logger.error(`Error updating wellness program ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Search for wellness programs
   */
  async searchWellnessPrograms(params: ProgramSearchParams): Promise<WellnessProgram[]> {
    try {
      let query = db.select().from(wellnessPrograms)
        .where(eq(wellnessPrograms.employerId, params.employerId));
      
      // Apply search filters
      if (params.type) {
        query = query.where(eq(wellnessPrograms.type, params.type));
      }
      
      if (params.status) {
        query = query.where(eq(wellnessPrograms.status, params.status));
      }
      
      if (params.active === true) {
        const now = new Date();
        query = query.where(
          and(
            or(
              isNull(wellnessPrograms.startDate),
              wellnessPrograms.startDate.lte(now)
            ),
            or(
              isNull(wellnessPrograms.endDate),
              wellnessPrograms.endDate.gte(now)
            )
          )
        );
      }
      
      // Apply pagination
      if (params.limit) {
        query = query.limit(params.limit);
      }
      
      if (params.offset) {
        query = query.offset(params.offset);
      }
      
      // Execute query
      const results = await query;
      return results;
    } catch (error) {
      logger.error('Error searching wellness programs:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // Incentive Program Management
  // ============================================================================
  
  /**
   * Create a new incentive rule
   */
  async createIncentiveRule(data: InsertIncentiveRule): Promise<IncentiveRule> {
    try {
      // Generate ID if not provided
      if (!data.id) {
        data.id = uuidv4();
      }
      
      // Set created timestamp
      data.createdAt = new Date();
      
      // Insert the incentive rule
      const [rule] = await db.insert(incentiveRules).values(data).returning();
      
      if (!rule) {
        throw new Error('Failed to create incentive rule');
      }
      
      logger.info(`Created incentive rule: ${rule.id} (${rule.name}) for employer ${rule.employerId}`);
      return rule;
    } catch (error) {
      logger.error('Error creating incentive rule:', error);
      throw error;
    }
  }
  
  /**
   * Get an incentive rule by ID
   */
  async getIncentiveRule(id: string): Promise<IncentiveRule | undefined> {
    try {
      const [rule] = await db.select().from(incentiveRules).where(eq(incentiveRules.id, id));
      return rule;
    } catch (error) {
      logger.error(`Error getting incentive rule ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Award incentive points to an employee
   */
  async awardIncentivePoints(
    employeeId: string,
    incentiveRuleId: string,
    activityId?: string,
    programId?: string
  ): Promise<any> {
    try {
      // Get the incentive rule details
      const rule = await this.getIncentiveRule(incentiveRuleId);
      if (!rule) {
        throw new Error('Incentive rule not found');
      }
      
      // Check if rule is active
      if (!rule.active) {
        throw new Error('Incentive rule is not active');
      }
      
      // Check for valid dates
      const now = new Date();
      if (rule.startDate && rule.startDate > now) {
        throw new Error('Incentive rule start date is in the future');
      }
      if (rule.endDate && rule.endDate < now) {
        throw new Error('Incentive rule end date has passed');
      }
      
      // Create the award record
      const [award] = await db
        .insert(incentiveAwards)
        .values({
          id: uuidv4(),
          employeeId,
          incentiveRuleId,
          activityId,
          programId,
          awardDate: now,
          pointsAwarded: rule.value,
          status: 'awarded',
          createdAt: now
        })
        .returning();
      
      if (!award) {
        throw new Error('Failed to create incentive award');
      }
      
      // Create wallet transaction
      const [transaction] = await db
        .insert(walletTransactions)
        .values({
          id: uuidv4(),
          employeeId,
          transactionDate: now,
          transactionType: 'award',
          points: rule.value,
          awardId: award.id,
          description: `Points awarded for ${rule.name}`,
          createdAt: now
        })
        .returning();
      
      logger.info(`Awarded ${rule.value} incentive points to employee ${employeeId} for rule ${incentiveRuleId}`);
      
      return {
        award,
        transaction
      };
    } catch (error) {
      logger.error(`Error awarding incentive points to employee ${employeeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get employee wallet balance
   */
  async getEmployeeWalletBalance(employeeId: string): Promise<number> {
    try {
      // Calculate sum of all transactions
      const result = await db.execute(
        `SELECT COALESCE(SUM(points), 0) as balance 
         FROM wallet_transactions 
         WHERE employee_id = $1`,
        [employeeId]
      );
      
      // Extract balance from result
      return result.rows[0]?.balance || 0;
    } catch (error) {
      logger.error(`Error getting wallet balance for employee ${employeeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get employee wallet transaction history
   */
  async getEmployeeWalletTransactions(employeeId: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      // Get transaction history
      const transactions = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.employeeId, employeeId))
        .orderBy(desc(walletTransactions.transactionDate))
        .limit(limit)
        .offset(offset);
      
      return transactions;
    } catch (error) {
      logger.error(`Error getting wallet transactions for employee ${employeeId}:`, error);
      throw error;
    }
  }
  
  // ============================================================================
  // Analytics
  // ============================================================================
  
  /**
   * Get employer dashboard analytics
   * This would typically generate or fetch precomputed analytics
   */
  async getEmployerAnalytics(employerId: string): Promise<any> {
    try {
      // This is a placeholder implementation
      // In a real system, this would connect to an analytics pipeline or data warehouse
      
      // Get summary statistics
      const employeeCount = await db
        .select({ count: employees.id })
        .from(employees)
        .where(eq(employees.employerId, employerId));
      
      const programCount = await db
        .select({ count: wellnessPrograms.id })
        .from(wellnessPrograms)
        .where(eq(wellnessPrograms.employerId, employerId));
      
      const activePrograms = await db
        .select({ count: wellnessPrograms.id })
        .from(wellnessPrograms)
        .where(
          and(
            eq(wellnessPrograms.employerId, employerId),
            eq(wellnessPrograms.status, 'active')
          )
        );
      
      // Return the analytics data
      return {
        summary: {
          employeeCount: employeeCount[0]?.count || 0,
          programCount: programCount[0]?.count || 0,
          activeProgramCount: activePrograms[0]?.count || 0,
        },
        // This would include additional aggregated metrics in a real implementation
        metrics: {
          participationRate: 0.0, // Placeholder
          averagePointsEarned: 0, // Placeholder
          completionRate: 0.0, // Placeholder
        }
      };
    } catch (error) {
      logger.error(`Error getting analytics for employer ${employerId}:`, error);
      throw error;
    }
  }
}

// Create and export the service instance
export const employerService = new EmployerService();