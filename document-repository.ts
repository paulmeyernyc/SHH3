/**
 * Document Repository
 * 
 * Data access layer for document management
 */

import { and, asc, desc, eq, gt, gte, ilike, inArray, isNull, lt, lte, not, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { 
  documents, 
  documentVersions, 
  documentLibraries, 
  documentCategories,
  documentPermissions,
  documentShares,
  documentAuditRecords,
  documentTags,
  type Document, 
  type InsertDocument,
  type DocumentVersion,
  type InsertDocumentVersion,
  type DocumentPermission,
  type InsertDocumentPermission,
  type DocumentShare,
  type InsertDocumentShare,
  type DocumentAuditRecord,
  type InsertDocumentAuditRecord
} from '../../../../shared/document-schema';

export class DocumentRepository {
  /**
   * Get all documents with optional filters
   */
  async getAllDocuments(filters: DocumentFilters = {}): Promise<Document[]> {
    let query = db.select().from(documents);
    
    // Apply filters
    if (filters.status) {
      query = query.where(eq(documents.status, filters.status));
    } else {
      // By default, exclude deleted documents
      query = query.where(not(eq(documents.status, 'deleted')));
    }
    
    if (filters.libraryId) {
      query = query.where(eq(documents.libraryId, filters.libraryId));
    }
    
    if (filters.categoryId) {
      query = query.where(eq(documents.categoryId, filters.categoryId));
    }
    
    if (filters.patientId) {
      query = query.where(eq(documents.patientId, filters.patientId));
    }
    
    if (filters.encounterId) {
      query = query.where(eq(documents.encounterId, filters.encounterId));
    }
    
    if (filters.ownerId) {
      query = query.where(eq(documents.ownerId, filters.ownerId));
    }
    
    if (filters.securityLevel) {
      query = query.where(eq(documents.securityLevel, filters.securityLevel));
    }
    
    if (filters.search) {
      query = query.where(
        or(
          ilike(documents.title, `%${filters.search}%`),
          ilike(documents.filename, `%${filters.search}%`),
          ilike(documents.description, `%${filters.search}%`)
        )
      );
    }
    
    if (filters.createdAfter) {
      query = query.where(gte(documents.createdAt, filters.createdAfter));
    }
    
    if (filters.createdBefore) {
      query = query.where(lte(documents.createdAt, filters.createdBefore));
    }
    
    // Apply ordering
    if (filters.orderBy) {
      const column = this.getOrderColumn(filters.orderBy);
      if (column) {
        query = query.orderBy(filters.order === 'desc' ? desc(column) : asc(column));
      }
    } else {
      // Default order by created date, newest first
      query = query.orderBy(desc(documents.createdAt));
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
   * Get a document by ID
   */
  async getDocumentById(id: number): Promise<Document | undefined> {
    const [result] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    
    return result;
  }
  
  /**
   * Get a document by external ID
   */
  async getDocumentByExternalId(externalId: string): Promise<Document | undefined> {
    const [result] = await db
      .select()
      .from(documents)
      .where(eq(documents.externalId, externalId));
    
    return result;
  }
  
  /**
   * Create a new document
   */
  async createDocument(document: InsertDocument): Promise<Document> {
    const [result] = await db
      .insert(documents)
      .values(document)
      .returning();
    
    return result;
  }
  
  /**
   * Update a document
   */
  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined> {
    const [result] = await db
      .update(documents)
      .set({
        ...document,
        updatedAt: new Date()
      })
      .where(eq(documents.id, id))
      .returning();
    
    return result;
  }
  
  /**
   * Soft delete a document (update status to 'deleted')
   */
  async softDeleteDocument(id: number): Promise<Document | undefined> {
    const [result] = await db
      .update(documents)
      .set({
        status: 'deleted',
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(documents.id, id))
      .returning();
    
    return result;
  }
  
  /**
   * Hard delete a document (permanent deletion)
   */
  async hardDeleteDocument(id: number): Promise<boolean> {
    const result = await db
      .delete(documents)
      .where(eq(documents.id, id));
    
    return result.rowCount > 0;
  }
  
  /**
   * Restore a soft-deleted document
   */
  async restoreDocument(id: number): Promise<Document | undefined> {
    const [result] = await db
      .update(documents)
      .set({
        status: 'active',
        deletedAt: null,
        updatedAt: new Date()
      })
      .where(eq(documents.id, id))
      .returning();
    
    return result;
  }
  
  /**
   * Update document's current version
   */
  async updateCurrentVersion(id: number, versionId: number): Promise<Document | undefined> {
    const [result] = await db
      .update(documents)
      .set({
        currentVersionId: versionId,
        updatedAt: new Date()
      })
      .where(eq(documents.id, id))
      .returning();
    
    return result;
  }
  
  /**
   * Get document versions
   */
  async getVersions(documentId: number): Promise<DocumentVersion[]> {
    return db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.versionNumber));
  }
  
  /**
   * Get a specific document version
   */
  async getVersionById(id: number): Promise<DocumentVersion | undefined> {
    const [result] = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.id, id));
    
    return result;
  }
  
  /**
   * Get the latest version number for a document
   */
  async getLatestVersionNumber(documentId: number): Promise<number> {
    const [result] = await db
      .select({ maxVersion: sql<number>`MAX(${documentVersions.versionNumber})` })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId));
    
    return result?.maxVersion || 0;
  }
  
  /**
   * Create a new document version
   */
  async createVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const [result] = await db
      .insert(documentVersions)
      .values(version)
      .returning();
    
    return result;
  }
  
  /**
   * Get document permissions
   */
  async getPermissions(documentId: number): Promise<DocumentPermission[]> {
    return db
      .select()
      .from(documentPermissions)
      .where(eq(documentPermissions.documentId, documentId));
  }
  
  /**
   * Check if a principal has permission for a document
   */
  async hasPermission(
    documentId: number, 
    principalType: string, 
    principalId: number, 
    requiredPermission: string
  ): Promise<boolean> {
    // Get all permissions for this principal on this document
    const permissions = await db
      .select()
      .from(documentPermissions)
      .where(
        and(
          eq(documentPermissions.documentId, documentId),
          eq(documentPermissions.principalType, principalType),
          eq(documentPermissions.principalId, principalId)
        )
      );
    
    // Check if any permission matches the required permission
    // For simplicity, we're doing exact match, but in reality you might want
    // to implement a permission hierarchy (e.g., admin > write > read)
    return permissions.some(p => p.permission === requiredPermission);
  }
  
  /**
   * Add a permission for a document
   */
  async addPermission(permission: InsertDocumentPermission): Promise<DocumentPermission> {
    const [result] = await db
      .insert(documentPermissions)
      .values(permission)
      .returning();
    
    return result;
  }
  
  /**
   * Update a permission
   */
  async updatePermission(
    id: number,
    updates: Partial<InsertDocumentPermission>
  ): Promise<DocumentPermission | undefined> {
    const [result] = await db
      .update(documentPermissions)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(documentPermissions.id, id))
      .returning();
    
    return result;
  }
  
  /**
   * Remove a permission
   */
  async removePermission(id: number): Promise<boolean> {
    const result = await db
      .delete(documentPermissions)
      .where(eq(documentPermissions.id, id));
    
    return result.rowCount > 0;
  }
  
  /**
   * Get document shares
   */
  async getShares(documentId: number): Promise<DocumentShare[]> {
    return db
      .select()
      .from(documentShares)
      .where(eq(documentShares.documentId, documentId));
  }
  
  /**
   * Get a share by token
   */
  async getShareByToken(token: string): Promise<DocumentShare | undefined> {
    const [result] = await db
      .select()
      .from(documentShares)
      .where(eq(documentShares.token, token));
    
    return result;
  }
  
  /**
   * Create a document share
   */
  async createShare(share: InsertDocumentShare): Promise<DocumentShare> {
    const [result] = await db
      .insert(documentShares)
      .values(share)
      .returning();
    
    return result;
  }
  
  /**
   * Update a share's access count
   */
  async incrementShareAccessCount(id: number): Promise<DocumentShare | undefined> {
    const [result] = await db
      .update(documentShares)
      .set({
        accessCount: sql`${documentShares.accessCount} + 1`,
        lastAccessedAt: new Date()
      })
      .where(eq(documentShares.id, id))
      .returning();
    
    return result;
  }
  
  /**
   * Delete a share
   */
  async deleteShare(id: number): Promise<boolean> {
    const result = await db
      .delete(documentShares)
      .where(eq(documentShares.id, id));
    
    return result.rowCount > 0;
  }
  
  /**
   * Record an audit event
   */
  async recordAudit(auditRecord: InsertDocumentAuditRecord): Promise<DocumentAuditRecord> {
    const [result] = await db
      .insert(documentAuditRecords)
      .values(auditRecord)
      .returning();
    
    return result;
  }
  
  /**
   * Get audit records for a document
   */
  async getAuditRecords(
    documentId: number,
    limit?: number,
    offset?: number
  ): Promise<DocumentAuditRecord[]> {
    let query = db
      .select()
      .from(documentAuditRecords)
      .where(eq(documentAuditRecords.documentId, documentId))
      .orderBy(desc(documentAuditRecords.timestamp));
    
    if (limit !== undefined) {
      query = query.limit(limit);
      
      if (offset !== undefined) {
        query = query.offset(offset);
      }
    }
    
    return query;
  }
  
  /**
   * Get the order column for a field name
   */
  private getOrderColumn(field: string) {
    switch (field) {
      case 'title':
        return documents.title;
      case 'filename':
        return documents.filename;
      case 'size':
        return documents.size;
      case 'createdAt':
        return documents.createdAt;
      case 'updatedAt':
        return documents.updatedAt;
      default:
        return null;
    }
  }
}

/**
 * Document filter options
 */
export interface DocumentFilters {
  status?: string;
  libraryId?: number;
  categoryId?: number;
  patientId?: number;
  encounterId?: number;
  ownerId?: number;
  securityLevel?: string;
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  orderBy?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}