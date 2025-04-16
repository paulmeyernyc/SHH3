/**
 * Document Service Routes
 * 
 * API routes for document management functionality
 */

import express from 'express';
import { DocumentController } from './controllers/document-controller';
import { LibraryController } from './controllers/library-controller';
import { CategoryController } from './controllers/category-controller';
import { DocumentService } from './services/document-service';
import { LibraryService } from './services/library-service';
import { CategoryService } from './services/category-service';
import { DocumentRepository } from './repositories/document-repository';
import { LibraryRepository } from './repositories/library-repository';
import { CategoryRepository } from './repositories/category-repository';
import { StorageFactory } from './storage/storage-factory';
import { requireAuth, requireRole } from './middleware/auth-middleware';
import { errorHandler } from './middleware/error-middleware';
import { 
  uploadDocument, 
  handleUploadErrors, 
  verifyUpload 
} from './middleware/upload-middleware';

export function registerRoutes(app: express.Express): void {
  // Initialize repositories
  const documentRepo = new DocumentRepository();
  const libraryRepo = new LibraryRepository();
  const categoryRepo = new CategoryRepository();
  
  // Initialize storage provider
  const storageProvider = StorageFactory.createProvider();
  
  // Initialize services
  const documentService = new DocumentService(documentRepo, storageProvider);
  const libraryService = new LibraryService(libraryRepo);
  const categoryService = new CategoryService(categoryRepo);
  
  // Initialize controllers
  const documentController = new DocumentController(documentService);
  const libraryController = new LibraryController(libraryService);
  const categoryController = new CategoryController(categoryService);
  
  // Create API router
  const apiRouter = express.Router();
  
  // Apply auth middleware to all routes
  apiRouter.use(requireAuth);
  
  // Library routes
  apiRouter.get('/libraries', libraryController.getAllLibraries.bind(libraryController));
  apiRouter.get('/libraries/:id', libraryController.getLibraryById.bind(libraryController));
  apiRouter.post('/libraries', libraryController.createLibrary.bind(libraryController));
  apiRouter.put('/libraries/:id', libraryController.updateLibrary.bind(libraryController));
  apiRouter.post('/libraries/:id/archive', libraryController.archiveLibrary.bind(libraryController));
  apiRouter.post('/libraries/:id/restore', libraryController.restoreLibrary.bind(libraryController));
  apiRouter.get('/libraries/:id/stats', libraryController.getLibraryStats.bind(libraryController));
  apiRouter.get('/libraries/check-name', libraryController.checkLibraryNameAvailability.bind(libraryController));
  
  // Category routes
  apiRouter.get('/categories', categoryController.getAllCategories.bind(categoryController));
  apiRouter.get('/categories/:id', categoryController.getCategoryById.bind(categoryController));
  apiRouter.post('/categories', requireRole('admin'), categoryController.createCategory.bind(categoryController));
  apiRouter.put('/categories/:id', requireRole('admin'), categoryController.updateCategory.bind(categoryController));
  apiRouter.delete('/categories/:id', requireRole('admin'), categoryController.deleteCategory.bind(categoryController));
  apiRouter.get('/categories/parent/:parentId/children', categoryController.getChildCategories.bind(categoryController));
  apiRouter.get('/categories/root', categoryController.getRootCategories.bind(categoryController));
  apiRouter.get('/categories/:id/path', categoryController.getCategoryPath.bind(categoryController));
  apiRouter.get('/categories/tree', categoryController.getCategoryTree.bind(categoryController));
  
  // Document routes
  apiRouter.get('/documents', documentController.getAllDocuments.bind(documentController));
  apiRouter.get('/documents/:id', documentController.getDocumentById.bind(documentController));
  apiRouter.post('/documents', 
    uploadDocument, 
    handleUploadErrors, 
    verifyUpload, 
    documentController.uploadDocument.bind(documentController)
  );
  apiRouter.put('/documents/:id', documentController.updateDocument.bind(documentController));
  apiRouter.delete('/documents/:id', documentController.deleteDocument.bind(documentController));
  apiRouter.post('/documents/:id/restore', documentController.restoreDocument.bind(documentController));
  
  // Document version routes
  apiRouter.post('/documents/:id/versions', 
    uploadDocument, 
    handleUploadErrors, 
    verifyUpload, 
    documentController.uploadNewVersion.bind(documentController)
  );
  apiRouter.get('/documents/:id/versions', documentController.getDocumentVersions.bind(documentController));
  
  // Document download routes
  apiRouter.get('/documents/:id/download', documentController.downloadDocument.bind(documentController));
  apiRouter.get('/documents/:id/download-url', documentController.getDownloadUrl.bind(documentController));
  
  // Document permission routes
  apiRouter.get('/documents/:id/permissions', documentController.getDocumentPermissions.bind(documentController));
  apiRouter.post('/documents/:id/permissions', documentController.addDocumentPermission.bind(documentController));
  apiRouter.delete('/documents/:id/permissions/:permissionId', documentController.removeDocumentPermission.bind(documentController));
  
  // Document share routes
  apiRouter.get('/documents/:id/shares', documentController.getDocumentShares.bind(documentController));
  apiRouter.post('/documents/:id/shares', documentController.createDocumentShare.bind(documentController));
  apiRouter.delete('/documents/:id/shares/:shareId', documentController.deleteDocumentShare.bind(documentController));
  
  // Public document access via share token
  app.post('/api/shared/:token', documentController.getDocumentByShareToken.bind(documentController));
  app.get('/api/shared/:token/download', documentController.downloadDocument.bind(documentController));
  
  // Document audit routes
  apiRouter.get('/documents/:id/audit', documentController.getDocumentAuditRecords.bind(documentController));
  
  // Register API router
  app.use('/api', apiRouter);
  
  // Register error handler
  app.use(errorHandler);
}