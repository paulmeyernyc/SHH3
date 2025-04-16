/**
 * Document Service
 * 
 * Business logic layer for document management
 */

import { Readable } from 'stream';
import { 
  Document, 
  DocumentVersion, 
  DocumentAuditRecord, 
  DocumentPermission, 
  DocumentShare,
  DocumentAuditActions,
  DocumentPermissionTypes,
  DocumentStatus
} from '../../../../shared/document-schema';
import { DocumentRepository, DocumentFilters } from '../repositories/document-repository';
import { StorageProvider } from '../storage/storage-provider';
import { NotFoundError, AccessDeniedError, ValidationError } from './errors';

export class DocumentService {
  private documentRepo: DocumentRepository;
  private storageProvider: StorageProvider;
  
  constructor(documentRepo: DocumentRepository, storageProvider: StorageProvider) {
    this.documentRepo = documentRepo;
    this.storageProvider = storageProvider;
  }
  
  /**
   * Get all documents with filtering options
   */
  async getAllDocuments(filters: DocumentFilters = {}): Promise<Document[]> {
    return this.documentRepo.getAllDocuments(filters);
  }
  
  /**
   * Get a document by ID
   */
  async getDocumentById(id: number): Promise<Document> {
    const document = await this.documentRepo.getDocumentById(id);
    
    if (!document) {
      throw new NotFoundError(`Document with ID ${id} not found`);
    }
    
    return document;
  }
  
  /**
   * Get a document by external ID
   */
  async getDocumentByExternalId(externalId: string): Promise<Document> {
    const document = await this.documentRepo.getDocumentByExternalId(externalId);
    
    if (!document) {
      throw new NotFoundError(`Document with external ID ${externalId} not found`);
    }
    
    return document;
  }
  
  /**
   * Create a new document with the first version
   */
  async createDocument(
    documentData: {
      filename: string;
      title: string;
      description?: string;
      libraryId: number;
      categoryId?: number;
      mimeType: string;
      size: number;
      status?: string;
      securityLevel?: string;
      patientId?: number;
      encounterId?: number;
      ownerId: number;
      metadata?: Record<string, any>;
      tags?: string[];
    },
    contentStream: Readable,
    userId: number
  ): Promise<Document> {
    // Create the document record
    const document = await this.documentRepo.createDocument({
      filename: documentData.filename,
      title: documentData.title,
      description: documentData.description,
      libraryId: documentData.libraryId,
      categoryId: documentData.categoryId,
      mimeType: documentData.mimeType,
      size: documentData.size,
      status: documentData.status || DocumentStatus.ACTIVE,
      securityLevel: documentData.securityLevel || 'standard',
      patientId: documentData.patientId,
      encounterId: documentData.encounterId,
      ownerId: documentData.ownerId,
      metadata: documentData.metadata || {},
      tags: documentData.tags || []
    });
    
    // Generate storage path for the document version
    const storagePath = this.storageProvider.generatePath(
      userId,
      document.id,
      documentData.filename
    );
    
    // Store the content
    const storageResult = await this.storageProvider.storeDocument(
      storagePath,
      contentStream,
      documentData.size,
      documentData.metadata
    );
    
    // Create the first version
    const version = await this.documentRepo.createVersion({
      documentId: document.id,
      versionNumber: 1,
      storageProvider: this.storageProvider.provider,
      storagePath: storageResult.path,
      size: storageResult.size,
      hash: storageResult.hash,
      metadata: documentData.metadata || {},
      createdById: userId,
      comment: 'Initial version'
    });
    
    // Update document with current version ID
    await this.documentRepo.updateCurrentVersion(document.id, version.id);
    
    // Log audit record
    await this.documentRepo.recordAudit({
      documentId: document.id,
      action: DocumentAuditActions.CREATED,
      userId,
      details: {
        version: version.versionNumber,
        hash: version.hash
      },
      success: true
    });
    
    // Add owner permission (admin)
    await this.documentRepo.addPermission({
      documentId: document.id,
      principalType: 'user',
      principalId: documentData.ownerId,
      permission: DocumentPermissionTypes.ADMIN
    });
    
    // Return the created document with all fields
    return this.getDocumentById(document.id);
  }
  
  /**
   * Update document metadata
   */
  async updateDocument(
    id: number,
    updates: {
      title?: string;
      description?: string;
      categoryId?: number | null;
      status?: string;
      securityLevel?: string;
      patientId?: number | null;
      encounterId?: number | null;
      metadata?: Record<string, any>;
      tags?: string[];
    },
    userId: number
  ): Promise<Document> {
    // Verify document exists
    const document = await this.getDocumentById(id);
    
    // Update document
    const updatedDocument = await this.documentRepo.updateDocument(id, updates);
    
    if (!updatedDocument) {
      throw new Error(`Failed to update document with ID ${id}`);
    }
    
    // Log audit record
    await this.documentRepo.recordAudit({
      documentId: id,
      action: DocumentAuditActions.METADATA_CHANGED,
      userId,
      details: {
        changes: updates
      },
      success: true
    });
    
    return updatedDocument;
  }
  
  /**
   * Create a new document version
   */
  async createDocumentVersion(
    documentId: number, 
    content: Readable, 
    contentSize: number,
    userId: number, 
    comment?: string,
    metadata?: Record<string, any>
  ): Promise<DocumentVersion> {
    // Verify document exists
    const document = await this.getDocumentById(documentId);
    
    // Get the latest version number
    const latestVersionNumber = await this.documentRepo.getLatestVersionNumber(documentId);
    const newVersionNumber = latestVersionNumber + 1;
    
    // Generate storage path
    const storagePath = this.storageProvider.generatePath(
      userId,
      documentId,
      document.filename
    );
    
    // Store the content
    const storageResult = await this.storageProvider.storeDocument(
      `${storagePath}_v${newVersionNumber}`,
      content,
      contentSize,
      metadata
    );
    
    // Create new version record
    const version = await this.documentRepo.createVersion({
      documentId,
      versionNumber: newVersionNumber,
      storageProvider: this.storageProvider.provider,
      storagePath: storageResult.path,
      size: storageResult.size,
      hash: storageResult.hash,
      metadata: metadata || {},
      createdById: userId,
      comment
    });
    
    // Update document's current version
    await this.documentRepo.updateCurrentVersion(documentId, version.id);
    
    // Log audit record
    await this.documentRepo.recordAudit({
      documentId,
      action: DocumentAuditActions.VERSION_CREATED,
      userId,
      details: {
        version: version.versionNumber,
        hash: version.hash,
        comment
      },
      success: true
    });
    
    return version;
  }
  
  /**
   * Get document content for a specific version
   */
  async getDocumentContent(
    documentId: number, 
    versionId?: number,
    userId?: number
  ): Promise<{ content: Readable; document: Document; version: DocumentVersion }> {
    // Verify document exists
    const document = await this.getDocumentById(documentId);
    
    // Get the version (current or specific)
    let version: DocumentVersion | undefined;
    
    if (versionId) {
      version = await this.documentRepo.getVersionById(versionId);
      if (!version || version.documentId !== documentId) {
        throw new NotFoundError(`Version ${versionId} not found for document ${documentId}`);
      }
    } else {
      // Use current version
      if (!document.currentVersionId) {
        throw new Error(`Document ${documentId} has no current version`);
      }
      
      version = await this.documentRepo.getVersionById(document.currentVersionId);
      if (!version) {
        throw new Error(`Current version ${document.currentVersionId} not found for document ${documentId}`);
      }
    }
    
    // Retrieve content from storage
    try {
      const retrieveResult = await this.storageProvider.getDocument(version.storagePath);
      
      // Log access if user ID provided
      if (userId) {
        await this.documentRepo.recordAudit({
          documentId,
          action: DocumentAuditActions.VIEWED,
          userId,
          details: {
            version: version.versionNumber
          },
          success: true
        });
      }
      
      return {
        content: retrieveResult.content,
        document,
        version
      };
    } catch (error) {
      // Log access failure if user ID provided
      if (userId) {
        await this.documentRepo.recordAudit({
          documentId,
          action: DocumentAuditActions.VIEWED,
          userId,
          details: {
            version: version.versionNumber,
            error: error.message
          },
          success: false
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Generate a signed URL for document download
   */
  async getDownloadUrl(
    documentId: number, 
    versionId?: number, 
    userId?: number,
    expiresInSeconds: number = 3600
  ): Promise<{ url: string; filename: string; mimeType: string }> {
    // Verify document exists
    const document = await this.getDocumentById(documentId);
    
    // Get the version (current or specific)
    let version: DocumentVersion | undefined;
    
    if (versionId) {
      version = await this.documentRepo.getVersionById(versionId);
      if (!version || version.documentId !== documentId) {
        throw new NotFoundError(`Version ${versionId} not found for document ${documentId}`);
      }
    } else {
      // Use current version
      if (!document.currentVersionId) {
        throw new Error(`Document ${documentId} has no current version`);
      }
      
      version = await this.documentRepo.getVersionById(document.currentVersionId);
      if (!version) {
        throw new Error(`Current version ${document.currentVersionId} not found for document ${documentId}`);
      }
    }
    
    // Generate signed URL
    const url = await this.storageProvider.generateSignedUrl(
      version.storagePath,
      expiresInSeconds
    );
    
    // Log download if user ID provided
    if (userId) {
      await this.documentRepo.recordAudit({
        documentId,
        action: DocumentAuditActions.DOWNLOADED,
        userId,
        details: {
          version: version.versionNumber
        },
        success: true
      });
    }
    
    return {
      url,
      filename: document.filename,
      mimeType: document.mimeType
    };
  }
  
  /**
   * Get document versions
   */
  async getDocumentVersions(documentId: number): Promise<DocumentVersion[]> {
    // Verify document exists
    await this.getDocumentById(documentId);
    
    // Get versions
    return this.documentRepo.getVersions(documentId);
  }
  
  /**
   * Soft delete a document
   */
  async softDeleteDocument(id: number, userId: number): Promise<Document> {
    // Verify document exists
    const document = await this.getDocumentById(id);
    
    // Delete document
    const deletedDocument = await this.documentRepo.softDeleteDocument(id);
    
    if (!deletedDocument) {
      throw new Error(`Failed to delete document with ID ${id}`);
    }
    
    // Log audit record
    await this.documentRepo.recordAudit({
      documentId: id,
      action: DocumentAuditActions.DELETED,
      userId,
      success: true
    });
    
    return deletedDocument;
  }
  
  /**
   * Restore a soft-deleted document
   */
  async restoreDocument(id: number, userId: number): Promise<Document> {
    // Verify document exists (even if deleted)
    const document = await this.documentRepo.getDocumentById(id);
    
    if (!document) {
      throw new NotFoundError(`Document with ID ${id} not found`);
    }
    
    if (document.status !== DocumentStatus.DELETED) {
      throw new ValidationError(`Document ${id} is not deleted`);
    }
    
    // Restore document
    const restoredDocument = await this.documentRepo.restoreDocument(id);
    
    if (!restoredDocument) {
      throw new Error(`Failed to restore document with ID ${id}`);
    }
    
    // Log audit record
    await this.documentRepo.recordAudit({
      documentId: id,
      action: DocumentAuditActions.RESTORED,
      userId,
      success: true
    });
    
    return restoredDocument;
  }
  
  /**
   * Hard delete a document and its content
   */
  async hardDeleteDocument(id: number, userId: number): Promise<boolean> {
    // Verify document exists
    const document = await this.getDocumentById(id);
    
    // Get all versions to delete storage content
    const versions = await this.documentRepo.getVersions(id);
    
    // Delete content from storage
    for (const version of versions) {
      try {
        await this.storageProvider.deleteDocument(version.storagePath);
      } catch (error) {
        console.warn(`Failed to delete storage for document ${id}, version ${version.versionNumber}:`, error);
      }
    }
    
    // Delete document from database
    const deleted = await this.documentRepo.hardDeleteDocument(id);
    
    return deleted;
  }
  
  /**
   * Get document permissions
   */
  async getDocumentPermissions(documentId: number): Promise<DocumentPermission[]> {
    // Verify document exists
    await this.getDocumentById(documentId);
    
    // Get permissions
    return this.documentRepo.getPermissions(documentId);
  }
  
  /**
   * Add document permission
   */
  async addDocumentPermission(
    documentId: number,
    permission: {
      principalType: string;
      principalId: number;
      permission: string;
      expiresAt?: Date;
    },
    userId: number
  ): Promise<DocumentPermission> {
    // Verify document exists
    await this.getDocumentById(documentId);
    
    // Add permission
    const newPermission = await this.documentRepo.addPermission({
      documentId,
      principalType: permission.principalType,
      principalId: permission.principalId,
      permission: permission.permission,
      expiresAt: permission.expiresAt
    });
    
    // Log audit record
    await this.documentRepo.recordAudit({
      documentId,
      action: DocumentAuditActions.PERMISSION_CHANGED,
      userId,
      details: {
        action: 'added',
        principalType: permission.principalType,
        principalId: permission.principalId,
        permission: permission.permission
      },
      success: true
    });
    
    return newPermission;
  }
  
  /**
   * Remove document permission
   */
  async removeDocumentPermission(
    permissionId: number,
    documentId: number,
    userId: number
  ): Promise<boolean> {
    // Verify document exists
    await this.getDocumentById(documentId);
    
    // Remove permission
    const deleted = await this.documentRepo.removePermission(permissionId);
    
    if (deleted) {
      // Log audit record
      await this.documentRepo.recordAudit({
        documentId,
        action: DocumentAuditActions.PERMISSION_CHANGED,
        userId,
        details: {
          action: 'removed',
          permissionId
        },
        success: true
      });
    }
    
    return deleted;
  }
  
  /**
   * Check if a user has permission for a document
   */
  async checkUserPermission(
    documentId: number,
    userId: number,
    requiredPermission: string
  ): Promise<boolean> {
    // Get document
    const document = await this.documentRepo.getDocumentById(documentId);
    
    if (!document) {
      return false;
    }
    
    // Document owner has all permissions
    if (document.ownerId === userId) {
      return true;
    }
    
    // Check user permission
    return this.documentRepo.hasPermission(documentId, 'user', userId, requiredPermission);
  }
  
  /**
   * Create a document share
   */
  async createDocumentShare(
    documentId: number,
    shareData: {
      name: string;
      createdById: number;
      maxAccess?: number;
      permission?: string;
      password?: string;
      expiresAt?: Date;
      notifyOnAccess?: boolean;
    }
  ): Promise<DocumentShare> {
    // Verify document exists
    await this.getDocumentById(documentId);
    
    // Create share
    const share = await this.documentRepo.createShare({
      documentId,
      name: shareData.name,
      createdById: shareData.createdById,
      maxAccess: shareData.maxAccess,
      permission: shareData.permission || DocumentPermissionTypes.READ,
      password: shareData.password,
      expiresAt: shareData.expiresAt,
      notifyOnAccess: shareData.notifyOnAccess
    });
    
    // Log audit record
    await this.documentRepo.recordAudit({
      documentId,
      action: DocumentAuditActions.SHARED,
      userId: shareData.createdById,
      details: {
        shareId: share.id,
        name: share.name,
        expiresAt: share.expiresAt
      },
      success: true
    });
    
    return share;
  }
  
  /**
   * Get document shares
   */
  async getDocumentShares(documentId: number): Promise<DocumentShare[]> {
    // Verify document exists
    await this.getDocumentById(documentId);
    
    // Get shares
    return this.documentRepo.getShares(documentId);
  }
  
  /**
   * Delete a document share
   */
  async deleteDocumentShare(
    shareId: number,
    documentId: number,
    userId: number
  ): Promise<boolean> {
    // Verify document exists
    await this.getDocumentById(documentId);
    
    // Delete share
    const deleted = await this.documentRepo.deleteShare(shareId);
    
    if (deleted) {
      // Log audit record
      await this.documentRepo.recordAudit({
        documentId,
        action: DocumentAuditActions.SHARED,
        userId,
        details: {
          action: 'deleted',
          shareId
        },
        success: true
      });
    }
    
    return deleted;
  }
  
  /**
   * Access a document through a share
   */
  async accessSharedDocument(
    token: string,
    password?: string
  ): Promise<{ content: Readable; document: Document; version: DocumentVersion; share: DocumentShare }> {
    // Get share by token
    const share = await this.documentRepo.getShareByToken(token);
    
    if (!share) {
      throw new NotFoundError('Share not found');
    }
    
    // Check if share is expired
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new AccessDeniedError('Share has expired');
    }
    
    // Check if max access reached
    if (share.maxAccess && share.accessCount >= share.maxAccess) {
      throw new AccessDeniedError('Maximum access count reached');
    }
    
    // Check password if set
    if (share.password && share.password !== password) {
      throw new AccessDeniedError('Invalid password');
    }
    
    // Increment access count
    await this.documentRepo.incrementShareAccessCount(share.id);
    
    // Get document content
    const { content, document, version } = await this.getDocumentContent(share.documentId);
    
    // Log access in audit
    await this.documentRepo.recordAudit({
      documentId: share.documentId,
      action: DocumentAuditActions.VIEWED,
      userId: 0, // Anonymous or system user
      details: {
        shareId: share.id,
        accessCount: share.accessCount + 1
      },
      success: true
    });
    
    return { content, document, version, share };
  }
  
  /**
   * Get document audit records
   */
  async getDocumentAuditRecords(
    documentId: number,
    limit?: number,
    offset?: number
  ): Promise<DocumentAuditRecord[]> {
    // Verify document exists
    await this.getDocumentById(documentId);
    
    // Get audit records
    return this.documentRepo.getAuditRecords(documentId, limit, offset);
  }
}