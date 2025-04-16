/**
 * Document Controller
 * 
 * Controller for document management operations
 */

import { Request, Response, NextFunction } from 'express';
import { BaseController } from './base-controller';
import { DocumentService } from '../services/document-service';
import { extractUserId, extractOrganizationId } from '../middleware/auth-middleware';
import { 
  getUploadedFile, 
  UploadedFile
} from '../middleware/upload-middleware';
import fs from 'fs';
import { ValidationError, AccessDeniedError, NotFoundError } from '../services/errors';
import { DocumentPermissionTypes } from '../../../../shared/document-schema';

export class DocumentController extends BaseController {
  private documentService: DocumentService;
  
  constructor(documentService: DocumentService) {
    super();
    this.documentService = documentService;
  }
  
  /**
   * Get all documents with filtering
   */
  async getAllDocuments(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      // Extract filter parameters
      const { 
        libraryId, 
        categoryId, 
        patientId, 
        encounterId, 
        securityLevel, 
        status, 
        search 
      } = req.query;
      
      // Extract pagination and sorting
      const { limit, offset } = this.getPaginationParams(req);
      const { orderBy, order } = this.getSortingParams(req);
      
      // If specified, filter by owner (current user)
      const ownerId = req.query.onlyOwned === 'true' ? extractUserId(req) : undefined;
      
      // Build filter object
      const filters = {
        libraryId: libraryId ? parseInt(libraryId as string) : undefined,
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        patientId: patientId ? parseInt(patientId as string) : undefined,
        encounterId: encounterId ? parseInt(encounterId as string) : undefined,
        securityLevel: securityLevel as string | undefined,
        status: status as string | undefined,
        ownerId,
        search: search as string | undefined,
        limit,
        offset,
        orderBy,
        order
      };
      
      // Get documents
      const documents = await this.documentService.getAllDocuments(filters);
      
      this.sendSuccessResponse(res, documents);
    });
  }
  
  /**
   * Get a document by ID
   */
  async getDocumentById(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      
      // Check if user has permission to view this document
      const userId = extractUserId(req);
      const hasPermission = await this.documentService.checkUserPermission(
        documentId, 
        userId, 
        DocumentPermissionTypes.READ
      );
      
      if (!hasPermission) {
        throw new AccessDeniedError('You do not have permission to view this document');
      }
      
      // Get document
      const document = await this.documentService.getDocumentById(documentId);
      
      this.sendSuccessResponse(res, document);
    });
  }
  
  /**
   * Upload a new document
   */
  async uploadDocument(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      // Get uploaded file info
      const fileInfo = getUploadedFile(req);
      
      // Extract document metadata from request body
      const { 
        title, 
        description, 
        libraryId, 
        categoryId,
        securityLevel, 
        patientId, 
        encounterId, 
        metadata,
        tags 
      } = req.body;
      
      // Validate required fields
      if (!title) {
        throw new ValidationError('Title is required');
      }
      
      if (!libraryId) {
        throw new ValidationError('Library ID is required');
      }
      
      // Parse metadata and tags if provided as strings
      const parsedMetadata = metadata ? 
        (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : 
        undefined;
      
      const parsedTags = tags ? 
        (typeof tags === 'string' ? JSON.parse(tags) : tags) : 
        undefined;
      
      // Get user ID for document ownership
      const userId = extractUserId(req);
      
      try {
        // Create read stream from uploaded file
        const fileStream = fs.createReadStream(fileInfo.path);
        
        // Create document
        const document = await this.documentService.createDocument(
          {
            filename: fileInfo.filename,
            title,
            description,
            libraryId: parseInt(libraryId),
            categoryId: categoryId ? parseInt(categoryId) : undefined,
            mimeType: fileInfo.mimetype,
            size: fileInfo.size,
            securityLevel,
            patientId: patientId ? parseInt(patientId) : undefined,
            encounterId: encounterId ? parseInt(encounterId) : undefined,
            ownerId: userId,
            metadata: parsedMetadata,
            tags: parsedTags
          },
          fileStream,
          userId
        );
        
        this.sendCreatedResponse(res, document, 'Document uploaded successfully');
      } finally {
        // Clean up temporary file
        this.cleanupTempFile(fileInfo.path);
      }
    });
  }
  
  /**
   * Update document metadata
   */
  async updateDocument(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      
      // Extract update fields from request body
      const { 
        title, 
        description, 
        categoryId, 
        securityLevel, 
        status,
        patientId, 
        encounterId, 
        metadata,
        tags 
      } = req.body;
      
      // Check if user has permission to modify this document
      const userId = extractUserId(req);
      const hasPermission = await this.documentService.checkUserPermission(
        documentId, 
        userId, 
        DocumentPermissionTypes.WRITE
      );
      
      if (!hasPermission) {
        throw new AccessDeniedError('You do not have permission to modify this document');
      }
      
      // Parse metadata and tags if provided as strings
      const parsedMetadata = metadata ? 
        (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : 
        undefined;
      
      const parsedTags = tags ? 
        (typeof tags === 'string' ? JSON.parse(tags) : tags) : 
        undefined;
      
      // Update document
      const updatedDocument = await this.documentService.updateDocument(
        documentId,
        {
          title,
          description,
          categoryId: categoryId === null ? null : (categoryId ? parseInt(categoryId) : undefined),
          securityLevel,
          status,
          patientId: patientId === null ? null : (patientId ? parseInt(patientId) : undefined),
          encounterId: encounterId === null ? null : (encounterId ? parseInt(encounterId) : undefined),
          metadata: parsedMetadata,
          tags: parsedTags
        },
        userId
      );
      
      this.sendSuccessResponse(res, updatedDocument, 'Document updated successfully');
    });
  }
  
  /**
   * Delete a document
   */
  async deleteDocument(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      
      // Check if user has permission to delete this document
      const userId = extractUserId(req);
      const hasPermission = await this.documentService.checkUserPermission(
        documentId, 
        userId, 
        DocumentPermissionTypes.DELETE
      );
      
      if (!hasPermission) {
        throw new AccessDeniedError('You do not have permission to delete this document');
      }
      
      // Determine if this is a soft or hard delete
      const hardDelete = req.query.permanent === 'true';
      
      if (hardDelete) {
        // Only admins can permanently delete
        const hasAdminPermission = await this.documentService.checkUserPermission(
          documentId, 
          userId, 
          DocumentPermissionTypes.ADMIN
        );
        
        if (!hasAdminPermission) {
          throw new AccessDeniedError('Only administrators can permanently delete documents');
        }
        
        await this.documentService.hardDeleteDocument(documentId, userId);
        this.sendNoContentResponse(res);
      } else {
        // Soft delete
        const document = await this.documentService.softDeleteDocument(documentId, userId);
        this.sendSuccessResponse(res, document, 'Document deleted successfully');
      }
    });
  }
  
  /**
   * Restore a deleted document
   */
  async restoreDocument(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      
      // Check if user has permission to administer this document
      const userId = extractUserId(req);
      const hasPermission = await this.documentService.checkUserPermission(
        documentId, 
        userId, 
        DocumentPermissionTypes.ADMIN
      );
      
      if (!hasPermission) {
        throw new AccessDeniedError('You do not have permission to restore this document');
      }
      
      const document = await this.documentService.restoreDocument(documentId, userId);
      
      this.sendSuccessResponse(res, document, 'Document restored successfully');
    });
  }
  
  /**
   * Upload a new version of a document
   */
  async uploadNewVersion(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      
      // Get uploaded file info
      const fileInfo = getUploadedFile(req);
      
      // Extract comment from request body
      const { comment, metadata } = req.body;
      
      // Check if user has permission to modify this document
      const userId = extractUserId(req);
      const hasPermission = await this.documentService.checkUserPermission(
        documentId, 
        userId, 
        DocumentPermissionTypes.WRITE
      );
      
      if (!hasPermission) {
        throw new AccessDeniedError('You do not have permission to upload a new version');
      }
      
      // Parse metadata if provided as string
      const parsedMetadata = metadata ? 
        (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : 
        undefined;
      
      try {
        // Create read stream from uploaded file
        const fileStream = fs.createReadStream(fileInfo.path);
        
        // Create new version
        const version = await this.documentService.createDocumentVersion(
          documentId,
          fileStream,
          fileInfo.size,
          userId,
          comment,
          parsedMetadata
        );
        
        this.sendCreatedResponse(res, version, 'New version uploaded successfully');
      } finally {
        // Clean up temporary file
        this.cleanupTempFile(fileInfo.path);
      }
    });
  }
  
  /**
   * Get document versions
   */
  async getDocumentVersions(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      
      // Check if user has permission to view this document
      const userId = extractUserId(req);
      const hasPermission = await this.documentService.checkUserPermission(
        documentId, 
        userId, 
        DocumentPermissionTypes.READ
      );
      
      if (!hasPermission) {
        throw new AccessDeniedError('You do not have permission to view this document');
      }
      
      // Get versions
      const versions = await this.documentService.getDocumentVersions(documentId);
      
      this.sendSuccessResponse(res, versions);
    });
  }
  
  /**
   * Download document content
   */
  async downloadDocument(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      const versionId = req.query.versionId ? parseInt(req.query.versionId as string) : undefined;
      
      // If this is a public share access, get token from query
      const shareToken = req.query.shareToken as string;
      
      let userId: number | undefined;
      
      // If not accessing via share token, check permissions
      if (!shareToken) {
        // Extract user ID from auth
        userId = extractUserId(req);
        
        // Check if user has permission to view this document
        const hasPermission = await this.documentService.checkUserPermission(
          documentId, 
          userId, 
          DocumentPermissionTypes.READ
        );
        
        if (!hasPermission) {
          throw new AccessDeniedError('You do not have permission to download this document');
        }
      }
      
      try {
        // Get document content
        const { content, document, version } = await this.documentService.getDocumentContent(
          documentId, 
          versionId,
          userId
        );
        
        // Set content type and disposition headers
        res.setHeader('Content-Type', document.mimeType);
        res.setHeader(
          'Content-Disposition', 
          `attachment; filename="${encodeURIComponent(document.filename)}"`
        );
        
        // Stream the content to the response
        content.pipe(res);
      } catch (error) {
        // Make sure we end the response in case of error
        if (!res.headersSent) {
          next(error);
        } else {
          console.error('Error streaming document content:', error);
          res.end();
        }
      }
    });
  }
  
  /**
   * Get download URL for document
   */
  async getDownloadUrl(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      const versionId = req.query.versionId ? parseInt(req.query.versionId as string) : undefined;
      
      // Duration URL is valid (in seconds)
      const expiresIn = req.query.expiresIn ? 
        parseInt(req.query.expiresIn as string) : 3600; // Default: 1 hour
      
      // Check if user has permission to view this document
      const userId = extractUserId(req);
      const hasPermission = await this.documentService.checkUserPermission(
        documentId, 
        userId, 
        DocumentPermissionTypes.READ
      );
      
      if (!hasPermission) {
        throw new AccessDeniedError('You do not have permission to download this document');
      }
      
      // Get download URL
      const downloadInfo = await this.documentService.getDownloadUrl(
        documentId, 
        versionId, 
        userId,
        expiresIn
      );
      
      this.sendSuccessResponse(res, downloadInfo);
    });
  }
  
  /**
   * Get document permissions
   */
  async getDocumentPermissions(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      
      // Check if user has permission to view this document
      const userId = extractUserId(req);
      const hasPermission = await this.documentService.checkUserPermission(
        documentId, 
        userId, 
        DocumentPermissionTypes.READ
      );
      
      if (!hasPermission) {
        throw new AccessDeniedError('You do not have permission to view this document');
      }
      
      // Get permissions
      const permissions = await this.documentService.getDocumentPermissions(documentId);
      
      this.sendSuccessResponse(res, permissions);
    });
  }
  
  /**
   * Add document permission
   */
  async addDocumentPermission(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      
      // Extract permission data
      const { principalType, principalId, permission, expiresAt } = req.body;
      
      // Validate required fields
      if (!principalType || !principalId || !permission) {
        throw new ValidationError('Principal type, principal ID, and permission are required');
      }
      
      // Check if user has admin permission for this document
      const userId = extractUserId(req);
      const hasPermission = await this.documentService.checkUserPermission(
        documentId, 
        userId, 
        DocumentPermissionTypes.ADMIN
      );
      
      if (!hasPermission) {
        throw new AccessDeniedError('You do not have permission to modify document permissions');
      }
      
      // Parse expiresAt date if provided
      const parsedExpiresAt = expiresAt ? new Date(expiresAt) : undefined;
      
      // Add permission
      const newPermission = await this.documentService.addDocumentPermission(
        documentId,
        {
          principalType,
          principalId: parseInt(principalId),
          permission,
          expiresAt: parsedExpiresAt
        },
        userId
      );
      
      this.sendCreatedResponse(res, newPermission, 'Permission added successfully');
    });
  }
  
  /**
   * Remove document permission
   */
  async removeDocumentPermission(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      const permissionId = this.getIdParam(req, 'permissionId');
      
      // Check if user has admin permission for this document
      const userId = extractUserId(req);
      const hasPermission = await this.documentService.checkUserPermission(
        documentId, 
        userId, 
        DocumentPermissionTypes.ADMIN
      );
      
      if (!hasPermission) {
        throw new AccessDeniedError('You do not have permission to modify document permissions');
      }
      
      // Remove permission
      const removed = await this.documentService.removeDocumentPermission(
        permissionId,
        documentId,
        userId
      );
      
      if (removed) {
        this.sendNoContentResponse(res);
      } else {
        throw new NotFoundError(`Permission with ID ${permissionId} not found`);
      }
    });
  }
  
  /**
   * Get document shares
   */
  async getDocumentShares(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      
      // Check if user has permission to view this document
      const userId = extractUserId(req);
      const hasPermission = await this.documentService.checkUserPermission(
        documentId, 
        userId, 
        DocumentPermissionTypes.READ
      );
      
      if (!hasPermission) {
        throw new AccessDeniedError('You do not have permission to view document shares');
      }
      
      // Get shares
      const shares = await this.documentService.getDocumentShares(documentId);
      
      this.sendSuccessResponse(res, shares);
    });
  }
  
  /**
   * Create document share
   */
  async createDocumentShare(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      
      // Extract share data
      const { name, maxAccess, permission, password, expiresAt, notifyOnAccess } = req.body;
      
      // Validate required fields
      if (!name) {
        throw new ValidationError('Share name is required');
      }
      
      // Check if user has share permission for this document
      const userId = extractUserId(req);
      const hasPermission = await this.documentService.checkUserPermission(
        documentId, 
        userId, 
        DocumentPermissionTypes.SHARE
      );
      
      if (!hasPermission) {
        throw new AccessDeniedError('You do not have permission to share this document');
      }
      
      // Parse expiresAt date if provided
      const parsedExpiresAt = expiresAt ? new Date(expiresAt) : undefined;
      
      // Create share
      const share = await this.documentService.createDocumentShare(
        documentId,
        {
          name,
          createdById: userId,
          maxAccess: maxAccess ? parseInt(maxAccess) : undefined,
          permission,
          password,
          expiresAt: parsedExpiresAt,
          notifyOnAccess: notifyOnAccess === 'true' || notifyOnAccess === true
        }
      );
      
      this.sendCreatedResponse(res, share, 'Share created successfully');
    });
  }
  
  /**
   * Delete document share
   */
  async deleteDocumentShare(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      const shareId = this.getIdParam(req, 'shareId');
      
      // Check if user has share permission for this document
      const userId = extractUserId(req);
      const hasPermission = await this.documentService.checkUserPermission(
        documentId, 
        userId, 
        DocumentPermissionTypes.SHARE
      );
      
      if (!hasPermission) {
        throw new AccessDeniedError('You do not have permission to manage document shares');
      }
      
      // Delete share
      const deleted = await this.documentService.deleteDocumentShare(
        shareId,
        documentId,
        userId
      );
      
      if (deleted) {
        this.sendNoContentResponse(res);
      } else {
        throw new NotFoundError(`Share with ID ${shareId} not found`);
      }
    });
  }
  
  /**
   * Get document by share token
   */
  async getDocumentByShareToken(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const token = req.params.token;
      
      if (!token) {
        throw new ValidationError('Share token is required');
      }
      
      // Extract password if provided
      const { password } = req.body;
      
      // Access shared document
      const { document, share } = await this.documentService.accessSharedDocument(
        token,
        password
      );
      
      // Return document metadata
      this.sendSuccessResponse(res, {
        document,
        share: {
          id: share.id,
          name: share.name,
          permission: share.permission,
          expiresAt: share.expiresAt,
          accessCount: share.accessCount
        }
      });
    });
  }
  
  /**
   * Get document audit records
   */
  async getDocumentAuditRecords(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const documentId = this.getIdParam(req);
      
      // Extract pagination
      const { limit, offset } = this.getPaginationParams(req);
      
      // Check if user has admin permission for this document
      const userId = extractUserId(req);
      const hasPermission = await this.documentService.checkUserPermission(
        documentId, 
        userId, 
        DocumentPermissionTypes.ADMIN
      );
      
      if (!hasPermission) {
        throw new AccessDeniedError('You do not have permission to view document audit records');
      }
      
      // Get audit records
      const auditRecords = await this.documentService.getDocumentAuditRecords(
        documentId,
        limit,
        offset
      );
      
      this.sendSuccessResponse(res, auditRecords);
    });
  }
  
  /**
   * Clean up temporary file after processing
   */
  private cleanupTempFile(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Error cleaning up temporary file ${filePath}:`, error);
    }
  }
}