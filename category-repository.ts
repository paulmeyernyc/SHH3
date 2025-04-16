/**
 * Category Repository
 * 
 * Data access layer for document categories
 */

import { db } from '../db';
import { eq, sql, and, or, like, desc, asc, isNull } from 'drizzle-orm';
import { 
  documentCategories, 
  DocumentCategory 
} from '../../../../shared/document-schema';
import { NotFoundError } from '../services/errors';

export interface CategoryFilters {
  search?: string;
  securityLevel?: string;
  isSystem?: boolean;
}

export class CategoryRepository {
  /**
   * Get all categories with optional filtering
   */
  async getAllCategories(filters: CategoryFilters = {}): Promise<DocumentCategory[]> {
    let query = db.select().from(documentCategories);
    
    // Apply search filter if provided
    if (filters.search) {
      query = query.where(
        like(documentCategories.name, `%${filters.search}%`)
      );
    }
    
    // Apply security level filter if provided
    if (filters.securityLevel) {
      query = query.where(
        eq(documentCategories.securityLevel, filters.securityLevel)
      );
    }
    
    // Apply system filter if provided
    if (filters.isSystem !== undefined) {
      query = query.where(
        eq(documentCategories.isSystem, filters.isSystem)
      );
    }
    
    // Order by name for consistent results
    query = query.orderBy(asc(documentCategories.name));
    
    return query;
  }
  
  /**
   * Get a category by ID
   */
  async getCategoryById(id: number): Promise<DocumentCategory | undefined> {
    const [category] = await db
      .select()
      .from(documentCategories)
      .where(eq(documentCategories.id, id));
    
    return category;
  }
  
  /**
   * Get a category by name
   */
  async getCategoryByName(name: string): Promise<DocumentCategory | undefined> {
    const [category] = await db
      .select()
      .from(documentCategories)
      .where(eq(documentCategories.name, name));
    
    return category;
  }
  
  /**
   * Create a new document category
   */
  async createCategory(
    categoryData: {
      name: string;
      description?: string | null;
      parentId?: number | null;
      metadata?: Record<string, any>;
      securityLevel?: string;
      isSystem?: boolean;
    }
  ): Promise<DocumentCategory> {
    const [category] = await db
      .insert(documentCategories)
      .values({
        name: categoryData.name,
        description: categoryData.description ?? null,
        parentId: categoryData.parentId ?? null,
        metadata: categoryData.metadata ?? {},
        securityLevel: categoryData.securityLevel ?? 'standard',
        isSystem: categoryData.isSystem ?? false
      })
      .returning();
    
    return category;
  }
  
  /**
   * Update a document category
   */
  async updateCategory(
    id: number,
    updates: {
      name?: string;
      description?: string | null;
      parentId?: number | null;
      metadata?: Record<string, any>;
      securityLevel?: string;
    }
  ): Promise<DocumentCategory | undefined> {
    // Build update object with only the fields that are provided
    const updateData: Partial<DocumentCategory> = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.parentId !== undefined) updateData.parentId = updates.parentId;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
    if (updates.securityLevel !== undefined) updateData.securityLevel = updates.securityLevel;
    
    const [updatedCategory] = await db
      .update(documentCategories)
      .set(updateData)
      .where(eq(documentCategories.id, id))
      .returning();
    
    return updatedCategory;
  }
  
  /**
   * Delete a document category
   */
  async deleteCategory(id: number): Promise<boolean> {
    // Check if category has children
    const childrenCount = await this.getChildCategoriesCount(id);
    
    if (childrenCount > 0) {
      throw new Error(`Cannot delete category with ID ${id} because it has ${childrenCount} child categories`);
    }
    
    // Check if category is used by any documents
    // This would require a document repository to check, but for now we'll
    // assume a direct query
    const documentCount = await this.getDocumentCountByCategory(id);
    
    if (documentCount > 0) {
      throw new Error(`Cannot delete category with ID ${id} because it is used by ${documentCount} documents`);
    }
    
    // Delete the category
    const result = await db
      .delete(documentCategories)
      .where(eq(documentCategories.id, id));
    
    return result.rowCount > 0;
  }
  
  /**
   * Get count of child categories
   */
  async getChildCategoriesCount(parentId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(documentCategories)
      .where(eq(documentCategories.parentId, parentId));
    
    return result[0].count;
  }
  
  /**
   * Get count of documents using a category
   */
  async getDocumentCountByCategory(categoryId: number): Promise<number> {
    // This is a placeholder. In a real implementation, this would query
    // the documents table to count documents with this category
    return 0;
  }
  
  /**
   * Get all child categories for a parent category
   */
  async getChildCategories(parentId: number): Promise<DocumentCategory[]> {
    return db
      .select()
      .from(documentCategories)
      .where(eq(documentCategories.parentId, parentId))
      .orderBy(asc(documentCategories.name));
  }
  
  /**
   * Get all root categories (categories with no parent)
   */
  async getRootCategories(): Promise<DocumentCategory[]> {
    return db
      .select()
      .from(documentCategories)
      .where(isNull(documentCategories.parentId))
      .orderBy(asc(documentCategories.name));
  }
  
  /**
   * Get parent category
   */
  async getParentCategory(categoryId: number): Promise<DocumentCategory | undefined> {
    const category = await this.getCategoryById(categoryId);
    
    if (!category || !category.parentId) {
      return undefined;
    }
    
    return this.getCategoryById(category.parentId);
  }
  
  /**
   * Get category path (from root to the target category)
   */
  async getCategoryPath(categoryId: number): Promise<DocumentCategory[]> {
    const path: DocumentCategory[] = [];
    let currentId: number | null = categoryId;
    
    // Prevent infinite loops in case of circular references
    const maxDepth = 20;
    let depth = 0;
    
    while (currentId !== null && depth < maxDepth) {
      const category = await this.getCategoryById(currentId);
      
      if (!category) {
        break;
      }
      
      // Add to the front of the array to build the path from root to target
      path.unshift(category);
      
      currentId = category.parentId;
      depth++;
    }
    
    return path;
  }
}