/**
 * Category Controller
 * 
 * Controller for document category management operations
 */

import { Request, Response, NextFunction } from 'express';
import { BaseController } from './base-controller';
import { CategoryService } from '../services/category-service';
import { extractUserId } from '../middleware/auth-middleware';
import { ValidationError } from '../services/errors';

export class CategoryController extends BaseController {
  private categoryService: CategoryService;
  
  constructor(categoryService: CategoryService) {
    super();
    this.categoryService = categoryService;
  }
  
  /**
   * Get all categories
   */
  async getAllCategories(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      // Extract filter parameters
      const { search, securityLevel, isSystem } = req.query;
      
      const filters = {
        search: search as string | undefined,
        securityLevel: securityLevel as string | undefined,
        isSystem: isSystem === 'true' ? true : isSystem === 'false' ? false : undefined
      };
      
      // Get categories
      const categories = await this.categoryService.getAllCategories(filters);
      
      this.sendSuccessResponse(res, categories);
    });
  }
  
  /**
   * Get a category by ID
   */
  async getCategoryById(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const categoryId = this.getIdParam(req);
      
      // Get category
      const category = await this.categoryService.getCategoryById(categoryId);
      
      this.sendSuccessResponse(res, category);
    });
  }
  
  /**
   * Create a new category
   */
  async createCategory(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      // Extract category data from request body
      const { name, description, parentId, metadata, securityLevel, isSystem } = req.body;
      
      // Validate required fields
      if (!name) {
        throw new ValidationError('Category name is required');
      }
      
      // Parse metadata if provided as string
      const parsedMetadata = metadata ? 
        (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : 
        undefined;
      
      // Create category
      const category = await this.categoryService.createCategory({
        name,
        description,
        parentId: parentId ? parseInt(parentId) : undefined,
        metadata: parsedMetadata,
        securityLevel,
        isSystem: isSystem === 'true' || isSystem === true
      });
      
      this.sendCreatedResponse(res, category, 'Category created successfully');
    });
  }
  
  /**
   * Update a category
   */
  async updateCategory(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const categoryId = this.getIdParam(req);
      
      // Extract update fields from request body
      const { name, description, parentId, metadata, securityLevel } = req.body;
      
      // Parse metadata if provided as string
      const parsedMetadata = metadata ? 
        (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : 
        undefined;
      
      // Handle parentId value
      let parsedParentId: number | null | undefined;
      if (parentId === null || parentId === 'null') {
        parsedParentId = null;
      } else if (parentId !== undefined) {
        parsedParentId = parseInt(parentId);
      }
      
      // Update category
      const updatedCategory = await this.categoryService.updateCategory(
        categoryId,
        {
          name,
          description,
          parentId: parsedParentId,
          metadata: parsedMetadata,
          securityLevel
        }
      );
      
      this.sendSuccessResponse(res, updatedCategory, 'Category updated successfully');
    });
  }
  
  /**
   * Delete a category
   */
  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const categoryId = this.getIdParam(req);
      
      // Delete category
      await this.categoryService.deleteCategory(categoryId);
      
      this.sendNoContentResponse(res);
    });
  }
  
  /**
   * Get child categories for a parent category
   */
  async getChildCategories(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const parentId = this.getIdParam(req, 'parentId');
      
      // Get child categories
      const categories = await this.categoryService.getChildCategories(parentId);
      
      this.sendSuccessResponse(res, categories);
    });
  }
  
  /**
   * Get root categories
   */
  async getRootCategories(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      // Get root categories
      const categories = await this.categoryService.getRootCategories();
      
      this.sendSuccessResponse(res, categories);
    });
  }
  
  /**
   * Get category tree
   */
  async getCategoryTree(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      // Extract optional root ID
      const rootId = req.query.rootId ? parseInt(req.query.rootId as string) : undefined;
      
      // Get category tree
      const tree = await this.categoryService.getCategoryTree(rootId);
      
      this.sendSuccessResponse(res, tree);
    });
  }
  
  /**
   * Get category path
   */
  async getCategoryPath(req: Request, res: Response, next: NextFunction) {
    await this.executeAction(req, res, next, async () => {
      const categoryId = this.getIdParam(req);
      
      // Get category path
      const path = await this.categoryService.getCategoryPath(categoryId);
      
      this.sendSuccessResponse(res, path);
    });
  }
}