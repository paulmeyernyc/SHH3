/**
 * Library Service
 * 
 * Business logic layer for document library management
 */

import { 
  DocumentLibrary, 
  DocumentLibraryPermission, 
  DocumentPermissionTypes
} from '../../../../shared/document-schema';
import { LibraryRepository, LibraryFilters } from '../repositories/library-repository';
import { NotFoundError, AccessDeniedError, ValidationError, ConflictError } from './errors';

export class LibraryService {
  private libraryRepo: LibraryRepository;
  
  constructor(libraryRepo: LibraryRepository) {
    this.libraryRepo = libraryRepo;
  }
  
  /**
   * Get all libraries with filtering options
   */
  async getAllLibraries(filters: LibraryFilters = {}): Promise<DocumentLibrary[]> {
    return this.libraryRepo.getAllLibraries(filters);
  }
  
  /**
   * Get a library by ID
   */
  async getLibraryById(id: number): Promise<DocumentLibrary> {
    const library = await this.libraryRepo.getLibraryById(id);
    
    if (!library) {
      throw new NotFoundError(`Library with ID ${id} not found`);
    }
    
    return library;
  }
  
  /**
   * Get default library for an organization
   */
  async getDefaultLibrary(organizationId: number): Promise<DocumentLibrary> {
    const library = await this.libraryRepo.getDefaultLibrary(organizationId);
    
    if (!library) {
      throw new NotFoundError(`Default library for organization ${organizationId} not found`);
    }
    
    return library;
  }
  
  /**
   * Create a new document library
   */
  async createLibrary(
    libraryData: {
      name: string;
      description?: string;
      organizationId: number;
      isDefault?: boolean;
      securityLevel?: string;
      settings?: Record<string, any>;
      retentionPolicy?: Record<string, any>;
    },
    userId: number
  ): Promise<DocumentLibrary> {
    // Create the library
    const library = await this.libraryRepo.createLibrary({
      name: libraryData.name,
      description: libraryData.description,
      organizationId: libraryData.organizationId,
      isDefault: libraryData.isDefault || false,
      securityLevel: libraryData.securityLevel || 'standard',
      settings: libraryData.settings || {},
      retentionPolicy: libraryData.retentionPolicy || {}
    });
    
    // If this is the default library, make sure it's the only default
    if (library.isDefault) {
      await this.libraryRepo.setAsDefault(library.id, library.organizationId);
    }
    
    // Add admin permission for creator
    await this.libraryRepo.addLibraryPermission({
      libraryId: library.id,
      principalType: 'user',
      principalId: userId,
      permission: DocumentPermissionTypes.ADMIN
    });
    
    return library;
  }
  
  /**
   * Update a document library
   */
  async updateLibrary(
    id: number,
    updates: {
      name?: string;
      description?: string;
      isDefault?: boolean;
      securityLevel?: string;
      settings?: Record<string, any>;
      retentionPolicy?: Record<string, any>;
    }
  ): Promise<DocumentLibrary> {
    // Verify library exists
    const library = await this.getLibraryById(id);
    
    // Update library
    const updatedLibrary = await this.libraryRepo.updateLibrary(id, updates);
    
    if (!updatedLibrary) {
      throw new Error(`Failed to update library with ID ${id}`);
    }
    
    // If this is now the default library, make sure it's the only default
    if (updates.isDefault === true && !library.isDefault) {
      await this.libraryRepo.setAsDefault(id, library.organizationId);
    }
    
    return updatedLibrary;
  }
  
  /**
   * Delete a document library
   */
  async deleteLibrary(id: number): Promise<boolean> {
    // Verify library exists
    const library = await this.getLibraryById(id);
    
    // Don't allow deleting the default library
    if (library.isDefault) {
      throw new ValidationError('Cannot delete the default library');
    }
    
    // Delete library
    return this.libraryRepo.deleteLibrary(id);
  }
  
  /**
   * Set a library as the default for an organization
   */
  async setAsDefault(id: number): Promise<DocumentLibrary> {
    // Verify library exists
    const library = await this.getLibraryById(id);
    
    // Already default?
    if (library.isDefault) {
      return library;
    }
    
    // Update library
    const updatedLibrary = await this.libraryRepo.setAsDefault(id, library.organizationId);
    
    if (!updatedLibrary) {
      throw new Error(`Failed to set library ${id} as default`);
    }
    
    return updatedLibrary;
  }
  
  /**
   * Get library permissions
   */
  async getLibraryPermissions(libraryId: number): Promise<DocumentLibraryPermission[]> {
    // Verify library exists
    await this.getLibraryById(libraryId);
    
    // Get permissions
    return this.libraryRepo.getLibraryPermissions(libraryId);
  }
  
  /**
   * Add library permission
   */
  async addLibraryPermission(
    libraryId: number,
    permission: {
      principalType: string;
      principalId: number;
      permission: string;
    }
  ): Promise<DocumentLibraryPermission> {
    // Verify library exists
    await this.getLibraryById(libraryId);
    
    // Add permission
    return this.libraryRepo.addLibraryPermission({
      libraryId,
      principalType: permission.principalType,
      principalId: permission.principalId,
      permission: permission.permission
    });
  }
  
  /**
   * Update library permission
   */
  async updateLibraryPermission(
    permissionId: number,
    libraryId: number,
    updates: {
      permission: string;
    }
  ): Promise<DocumentLibraryPermission | undefined> {
    // Verify library exists
    await this.getLibraryById(libraryId);
    
    // Update permission
    return this.libraryRepo.updateLibraryPermission(permissionId, {
      permission: updates.permission
    });
  }
  
  /**
   * Remove library permission
   */
  async removeLibraryPermission(
    permissionId: number,
    libraryId: number
  ): Promise<boolean> {
    // Verify library exists
    await this.getLibraryById(libraryId);
    
    // Remove permission
    return this.libraryRepo.removeLibraryPermission(permissionId);
  }
  
  /**
   * Check if a user has permission for a library
   */
  async checkUserPermission(
    libraryId: number,
    userId: number,
    requiredPermission: string
  ): Promise<boolean> {
    return this.libraryRepo.hasLibraryPermission(
      libraryId,
      'user',
      userId,
      requiredPermission
    );
  }
}