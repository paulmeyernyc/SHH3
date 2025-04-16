/**
 * Library Controller
 * 
 * Controller for document library management operations
 */

import { Request, Response, NextFunction } from 'express';
import { BaseController } from './base-controller';
import { LibraryService } from '../services/library-service';
import { extractUserId, extractOrganizationId } from '../middleware/auth-middleware';
import { ValidationError, AccessDeniedError } from '../services/errors';

export class LibraryController extends BaseController {
  private libraryService: LibraryService;
  
  constructor(libraryService: LibraryService) {
    super();
    this.libraryService = libraryService;
  }
  
  /**
   * Get all libraries with filtering
   */
  async getAllLibraries(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      // Extract filter parameters
      const { type, status, search } = req.query;
      
      // Extract pagination and sorting
      const { limit, offset } = this.getPaginationParams(req);
      const { orderBy, order } = this.getSortingParams(req);
      
      // Get organization ID to filter libraries by organization
      const organizationId = extractOrganizationId(req);
      
      // Build filter object
      const filters = {
        organizationId,
        type: type as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
        limit,
        offset,
        orderBy,
        order
      };
      
      // Get libraries
      const libraries = await this.libraryService.getAllLibraries(filters);
      
      this.sendSuccessResponse(res, libraries);
    });
  }
  
  /**
   * Get a library by ID
   */
  async getLibraryById(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const libraryId = this.getIdParam(req);
      
      // Get library
      const library = await this.libraryService.getLibraryById(libraryId);
      
      // Check if user's organization has access to this library
      const userOrganizationId = extractOrganizationId(req);
      if (library.organizationId !== userOrganizationId) {
        throw new AccessDeniedError('You do not have access to this library');
      }
      
      this.sendSuccessResponse(res, library);
    });
  }
  
  /**
   * Create a new library
   */
  async createLibrary(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      // Extract library data from request body
      const { 
        name, 
        description, 
        type, 
        defaultSecurityLevel,
        quota,
        retentionPolicy,
        settings,
        metadata
      } = req.body;
      
      // Validate required fields
      if (!name) {
        throw new ValidationError('Library name is required');
      }
      
      // Get user and organization IDs
      const userId = extractUserId(req);
      const organizationId = extractOrganizationId(req);
      
      // Parse metadata and settings if provided as strings
      const parsedMetadata = metadata ? 
        (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : 
        undefined;
      
      const parsedSettings = settings ? 
        (typeof settings === 'string' ? JSON.parse(settings) : settings) : 
        undefined;
      
      const parsedRetentionPolicy = retentionPolicy ? 
        (typeof retentionPolicy === 'string' ? JSON.parse(retentionPolicy) : retentionPolicy) : 
        undefined;
      
      // Create library
      const library = await this.libraryService.createLibrary({
        name,
        description,
        organizationId,
        createdById: userId,
        type: type || 'general',
        defaultSecurityLevel: defaultSecurityLevel || 'standard',
        quota: quota ? parseInt(quota) : undefined,
        retentionPolicy: parsedRetentionPolicy,
        settings: parsedSettings,
        metadata: parsedMetadata
      });
      
      this.sendCreatedResponse(res, library, 'Library created successfully');
    });
  }
  
  /**
   * Update a library
   */
  async updateLibrary(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const libraryId = this.getIdParam(req);
      
      // Extract update fields from request body
      const { 
        name, 
        description,
        type,
        defaultSecurityLevel,
        status,
        quota,
        retentionPolicy,
        settings,
        metadata
      } = req.body;
      
      // Get user ID for audit
      const userId = extractUserId(req);
      
      // Check if user's organization has access to this library
      const library = await this.libraryService.getLibraryById(libraryId);
      const userOrganizationId = extractOrganizationId(req);
      
      if (library.organizationId !== userOrganizationId) {
        throw new AccessDeniedError('You do not have access to this library');
      }
      
      // Parse metadata, settings, and retention policy if provided as strings
      const parsedMetadata = metadata ? 
        (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : 
        undefined;
      
      const parsedSettings = settings ? 
        (typeof settings === 'string' ? JSON.parse(settings) : settings) : 
        undefined;
      
      const parsedRetentionPolicy = retentionPolicy ? 
        (typeof retentionPolicy === 'string' ? JSON.parse(retentionPolicy) : retentionPolicy) : 
        undefined;
      
      // Update library
      const updatedLibrary = await this.libraryService.updateLibrary(
        libraryId,
        {
          name,
          description,
          type,
          defaultSecurityLevel,
          status,
          quota: quota ? parseInt(quota) : undefined,
          retentionPolicy: parsedRetentionPolicy,
          settings: parsedSettings,
          metadata: parsedMetadata
        },
        userId
      );
      
      this.sendSuccessResponse(res, updatedLibrary, 'Library updated successfully');
    });
  }
  
  /**
   * Archive a library
   */
  async archiveLibrary(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const libraryId = this.getIdParam(req);
      
      // Get user ID for audit
      const userId = extractUserId(req);
      
      // Check if user's organization has access to this library
      const library = await this.libraryService.getLibraryById(libraryId);
      const userOrganizationId = extractOrganizationId(req);
      
      if (library.organizationId !== userOrganizationId) {
        throw new AccessDeniedError('You do not have access to this library');
      }
      
      // Archive library
      const archivedLibrary = await this.libraryService.archiveLibrary(libraryId, userId);
      
      this.sendSuccessResponse(res, archivedLibrary, 'Library archived successfully');
    });
  }
  
  /**
   * Restore an archived library
   */
  async restoreLibrary(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const libraryId = this.getIdParam(req);
      
      // Get user ID for audit
      const userId = extractUserId(req);
      
      // Check if user's organization has access to this library
      const library = await this.libraryService.getLibraryById(libraryId);
      const userOrganizationId = extractOrganizationId(req);
      
      if (library.organizationId !== userOrganizationId) {
        throw new AccessDeniedError('You do not have access to this library');
      }
      
      // Restore library
      const restoredLibrary = await this.libraryService.restoreLibrary(libraryId, userId);
      
      this.sendSuccessResponse(res, restoredLibrary, 'Library restored successfully');
    });
  }
  
  /**
   * Get library usage statistics
   */
  async getLibraryStats(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const libraryId = this.getIdParam(req);
      
      // Check if user's organization has access to this library
      const library = await this.libraryService.getLibraryById(libraryId);
      const userOrganizationId = extractOrganizationId(req);
      
      if (library.organizationId !== userOrganizationId) {
        throw new AccessDeniedError('You do not have access to this library');
      }
      
      // Get library statistics
      const stats = await this.libraryService.getLibraryStats(libraryId);
      
      this.sendSuccessResponse(res, stats);
    });
  }
  
  /**
   * Check if library name is available
   */
  async checkLibraryNameAvailability(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const { name } = req.query;
      
      if (!name) {
        throw new ValidationError('Library name is required');
      }
      
      // Get organization ID
      const organizationId = extractOrganizationId(req);
      
      // Check if name is available
      const isAvailable = await this.libraryService.isLibraryNameAvailable(
        name as string,
        organizationId
      );
      
      this.sendSuccessResponse(res, { isAvailable });
    });
  }
}