/**
 * Document Library Repository
 * 
 * Data access layer for document libraries management
 */

import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, not, or } from 'drizzle-orm';
import { db } from '../db';
import { 
  documentLibraries,
  documentLibraryPermissions,
  type DocumentLibrary,
  type InsertDocumentLibrary,
  type DocumentLibraryPermission,
  type InsertDocumentLibraryPermission
} from '../../../../shared/document-schema';

export class LibraryRepository {
  /**
   * Get all document libraries with optional filters
   */
  async getAllLibraries(filters: LibraryFilters = {}): Promise<DocumentLibrary[]> {
    let query = db.select().from(documentLibraries);
    
    // Apply filters
    if (filters.organizationId) {
      query = query.where(eq(documentLibraries.organizationId, filters.organizationId));
    }
    
    if (filters.isDefault !== undefined) {
      query = query.where(eq(documentLibraries.isDefault, filters.isDefault));
    }
    
    if (filters.securityLevel) {
      query = query.where(eq(documentLibraries.securityLevel, filters.securityLevel));
    }
    
    if (filters.search) {
      query = query.where(
        or(
          ilike(documentLibraries.name, `%${filters.search}%`),
          ilike(documentLibraries.description, `%${filters.search}%`)
        )
      );
    }
    
    // Apply ordering
    if (filters.orderBy) {
      const column = this.getOrderColumn(filters.orderBy);
      if (column) {
        query = query.orderBy(filters.order === 'desc' ? desc(column) : asc(column));
      }
    } else {
      // Default order by name
      query = query.orderBy(asc(documentLibraries.name));
    }
    
    // Apply pagination
    if (filters.limit !== undefined) {
      query = query.limit(filters.limit);
      
      if (filters.offset !== undefined) {
        query = query.offset(filters.offset);
      }
    }
    
    return query;
  }
  
  /**
   * Get library by ID
   */
  async getLibraryById(id: number): Promise<DocumentLibrary | undefined> {
    const [result] = await db
      .select()
      .from(documentLibraries)
      .where(eq(documentLibraries.id, id));
    
    return result;
  }
  
  /**
   * Get default library for an organization
   */
  async getDefaultLibrary(organizationId: number): Promise<DocumentLibrary | undefined> {
    const [result] = await db
      .select()
      .from(documentLibraries)
      .where(
        and(
          eq(documentLibraries.organizationId, organizationId),
          eq(documentLibraries.isDefault, true)
        )
      );
    
    return result;
  }
  
  /**
   * Create a new library
   */
  async createLibrary(library: InsertDocumentLibrary): Promise<DocumentLibrary> {
    const [result] = await db
      .insert(documentLibraries)
      .values(library)
      .returning();
    
    return result;
  }
  
  /**
   * Update a library
   */
  async updateLibrary(id: number, library: Partial<InsertDocumentLibrary>): Promise<DocumentLibrary | undefined> {
    const [result] = await db
      .update(documentLibraries)
      .set({
        ...library,
        updatedAt: new Date()
      })
      .where(eq(documentLibraries.id, id))
      .returning();
    
    return result;
  }
  
  /**
   * Delete a library
   */
  async deleteLibrary(id: number): Promise<boolean> {
    const result = await db
      .delete(documentLibraries)
      .where(eq(documentLibraries.id, id));
    
    return result.rowCount > 0;
  }
  
  /**
   * Set a library as the default for an organization
   */
  async setAsDefault(id: number, organizationId: number): Promise<DocumentLibrary | undefined> {
    // First, remove default flag from all libraries for this organization
    await db
      .update(documentLibraries)
      .set({ isDefault: false })
      .where(
        and(
          eq(documentLibraries.organizationId, organizationId),
          eq(documentLibraries.isDefault, true)
        )
      );
    
    // Then set the new default
    const [result] = await db
      .update(documentLibraries)
      .set({ 
        isDefault: true,
        updatedAt: new Date()
      })
      .where(eq(documentLibraries.id, id))
      .returning();
    
    return result;
  }
  
  /**
   * Get library permissions
   */
  async getLibraryPermissions(libraryId: number): Promise<DocumentLibraryPermission[]> {
    return db
      .select()
      .from(documentLibraryPermissions)
      .where(eq(documentLibraryPermissions.libraryId, libraryId));
  }
  
  /**
   * Add a permission for a library
   */
  async addLibraryPermission(permission: InsertDocumentLibraryPermission): Promise<DocumentLibraryPermission> {
    const [result] = await db
      .insert(documentLibraryPermissions)
      .values(permission)
      .returning();
    
    return result;
  }
  
  /**
   * Update a library permission
   */
  async updateLibraryPermission(
    id: number,
    updates: Partial<InsertDocumentLibraryPermission>
  ): Promise<DocumentLibraryPermission | undefined> {
    const [result] = await db
      .update(documentLibraryPermissions)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(documentLibraryPermissions.id, id))
      .returning();
    
    return result;
  }
  
  /**
   * Remove a library permission
   */
  async removeLibraryPermission(id: number): Promise<boolean> {
    const result = await db
      .delete(documentLibraryPermissions)
      .where(eq(documentLibraryPermissions.id, id));
    
    return result.rowCount > 0;
  }
  
  /**
   * Check if a principal has permission for a library
   */
  async hasLibraryPermission(
    libraryId: number, 
    principalType: string, 
    principalId: number, 
    requiredPermission: string
  ): Promise<boolean> {
    // Get all permissions for this principal on this library
    const permissions = await db
      .select()
      .from(documentLibraryPermissions)
      .where(
        and(
          eq(documentLibraryPermissions.libraryId, libraryId),
          eq(documentLibraryPermissions.principalType, principalType),
          eq(documentLibraryPermissions.principalId, principalId)
        )
      );
    
    // Check if any permission matches the required permission
    return permissions.some(p => p.permission === requiredPermission);
  }
  
  /**
   * Get the order column for a field name
   */
  private getOrderColumn(field: string) {
    switch (field) {
      case 'name':
        return documentLibraries.name;
      case 'createdAt':
        return documentLibraries.createdAt;
      case 'updatedAt':
        return documentLibraries.updatedAt;
      default:
        return null;
    }
  }
}

/**
 * Library filter options
 */
export interface LibraryFilters {
  organizationId?: number;
  isDefault?: boolean;
  securityLevel?: string;
  search?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}