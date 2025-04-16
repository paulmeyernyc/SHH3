/**
 * Category Service
 * 
 * Business logic layer for document category management
 */

import { DocumentCategory } from '../../../../shared/document-schema';
import { CategoryRepository, CategoryFilters } from '../repositories/category-repository';
import { NotFoundError, ValidationError, ConflictError } from './errors';

export class CategoryService {
  private categoryRepo: CategoryRepository;
  
  constructor(categoryRepo: CategoryRepository) {
    this.categoryRepo = categoryRepo;
  }
  
  /**
   * Get all categories with filtering options
   */
  async getAllCategories(filters: CategoryFilters = {}): Promise<DocumentCategory[]> {
    return this.categoryRepo.getAllCategories(filters);
  }
  
  /**
   * Get a category by ID
   */
  async getCategoryById(id: number): Promise<DocumentCategory> {
    const category = await this.categoryRepo.getCategoryById(id);
    
    if (!category) {
      throw new NotFoundError(`Category with ID ${id} not found`);
    }
    
    return category;
  }
  
  /**
   * Get a category by name
   */
  async getCategoryByName(name: string): Promise<DocumentCategory | undefined> {
    return this.categoryRepo.getCategoryByName(name);
  }
  
  /**
   * Create a new document category
   */
  async createCategory(
    categoryData: {
      name: string;
      description?: string;
      parentId?: number;
      metadata?: Record<string, any>;
      securityLevel?: string;
      isSystem?: boolean;
    }
  ): Promise<DocumentCategory> {
    // Check for duplicate name
    const existing = await this.categoryRepo.getCategoryByName(categoryData.name);
    if (existing) {
      throw new ConflictError(`Category with name "${categoryData.name}" already exists`);
    }
    
    // Verify parent exists if provided
    if (categoryData.parentId) {
      const parent = await this.categoryRepo.getCategoryById(categoryData.parentId);
      if (!parent) {
        throw new NotFoundError(`Parent category with ID ${categoryData.parentId} not found`);
      }
    }
    
    // Create the category
    return this.categoryRepo.createCategory({
      name: categoryData.name,
      description: categoryData.description,
      parentId: categoryData.parentId,
      metadata: categoryData.metadata || {},
      securityLevel: categoryData.securityLevel || 'standard',
      isSystem: categoryData.isSystem || false
    });
  }
  
  /**
   * Update a document category
   */
  async updateCategory(
    id: number,
    updates: {
      name?: string;
      description?: string;
      parentId?: number | null;
      metadata?: Record<string, any>;
      securityLevel?: string;
    }
  ): Promise<DocumentCategory> {
    // Verify category exists
    const category = await this.getCategoryById(id);
    
    // Don't allow modifying system categories
    if (category.isSystem) {
      throw new ValidationError('Cannot modify system categories');
    }
    
    // Check for name uniqueness if changing name
    if (updates.name && updates.name !== category.name) {
      const existing = await this.categoryRepo.getCategoryByName(updates.name);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Category with name "${updates.name}" already exists`);
      }
    }
    
    // Verify parent exists if provided and changing
    if (updates.parentId !== undefined && updates.parentId !== category.parentId) {
      // If not null (making it a root category), verify parent exists
      if (updates.parentId !== null) {
        const parent = await this.categoryRepo.getCategoryById(updates.parentId);
        if (!parent) {
          throw new NotFoundError(`Parent category with ID ${updates.parentId} not found`);
        }
        
        // Check for circular references
        const path = await this.getCategoryPath(updates.parentId);
        if (path.some(c => c.id === id)) {
          throw new ValidationError('Cannot create circular category references');
        }
      }
    }
    
    // Update category
    const updatedCategory = await this.categoryRepo.updateCategory(id, updates);
    
    if (!updatedCategory) {
      throw new Error(`Failed to update category with ID ${id}`);
    }
    
    return updatedCategory;
  }
  
  /**
   * Delete a document category
   */
  async deleteCategory(id: number): Promise<boolean> {
    // Verify category exists
    const category = await this.getCategoryById(id);
    
    // Don't allow deleting system categories
    if (category.isSystem) {
      throw new ValidationError('Cannot delete system categories');
    }
    
    // Delete category (the repository will check for children)
    try {
      return await this.categoryRepo.deleteCategory(id);
    } catch (error) {
      if (error.message.includes('child categories')) {
        throw new ValidationError(error.message);
      }
      throw error;
    }
  }
  
  /**
   * Get child categories for a parent category
   */
  async getChildCategories(parentId: number): Promise<DocumentCategory[]> {
    // Verify parent exists
    await this.getCategoryById(parentId);
    
    // Get children
    return this.categoryRepo.getChildCategories(parentId);
  }
  
  /**
   * Get root categories
   */
  async getRootCategories(): Promise<DocumentCategory[]> {
    return this.categoryRepo.getRootCategories();
  }
  
  /**
   * Get parent category
   */
  async getParentCategory(categoryId: number): Promise<DocumentCategory | undefined> {
    // Verify category exists
    await this.getCategoryById(categoryId);
    
    // Get parent
    return this.categoryRepo.getParentCategory(categoryId);
  }
  
  /**
   * Get category path (from root to the target category)
   */
  async getCategoryPath(categoryId: number): Promise<DocumentCategory[]> {
    // Verify category exists
    await this.getCategoryById(categoryId);
    
    // Get path
    return this.categoryRepo.getCategoryPath(categoryId);
  }
  
  /**
   * Get category tree (category with all descendants)
   */
  async getCategoryTree(rootId?: number): Promise<CategoryTreeNode[]> {
    let rootCategories: DocumentCategory[];
    
    if (rootId) {
      // Use specified root
      const root = await this.getCategoryById(rootId);
      rootCategories = [root];
    } else {
      // Use all root categories
      rootCategories = await this.getRootCategories();
    }
    
    // Build tree for each root category
    const tree: CategoryTreeNode[] = [];
    
    for (const rootCategory of rootCategories) {
      const node = await this.buildCategoryTreeNode(rootCategory);
      tree.push(node);
    }
    
    return tree;
  }
  
  /**
   * Recursively build a category tree node
   */
  private async buildCategoryTreeNode(category: DocumentCategory): Promise<CategoryTreeNode> {
    const children = await this.categoryRepo.getChildCategories(category.id);
    
    const childNodes: CategoryTreeNode[] = [];
    
    for (const child of children) {
      const childNode = await this.buildCategoryTreeNode(child);
      childNodes.push(childNode);
    }
    
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      securityLevel: category.securityLevel,
      isSystem: category.isSystem,
      metadata: category.metadata,
      children: childNodes
    };
  }
}

/**
 * Category tree node type
 */
export interface CategoryTreeNode {
  id: number;
  name: string;
  description: string | null;
  securityLevel: string;
  isSystem: boolean;
  metadata: Record<string, any>;
  children: CategoryTreeNode[];
}