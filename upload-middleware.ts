/**
 * Upload middleware for document service
 * 
 * Handles file uploads with security checks, validation and metadata extraction
 */

import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { ValidationError, PayloadTooLargeError, SecurityError } from '../services/errors';

// Constants for file upload configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB default
const MAX_FILES = parseInt(process.env.MAX_FILES || '5', 10); // 5 files max default

// Create upload directory if it doesn't exist
async function ensureUploadDirExists() {
  try {
    await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error(`Error creating upload directory: ${error}`);
    throw error;
  }
}

// Initialize upload directory
ensureUploadDirExists();

// Define storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Create a secure filename with original extension
    const originalExt = path.extname(file.originalname);
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(16).toString('hex');
    const filename = `${timestamp}-${randomString}${originalExt}`;
    cb(null, filename);
  }
});

// File filter for multer to check file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Get allowed file types from request route configuration or use defaults
  const allowedTypes = (req as any).allowedFileTypes || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/json',
    'application/xml'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    // Accepted file type
    cb(null, true);
  } else {
    // Rejected file type
    cb(new ValidationError(`File type not allowed: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`));
  }
};

// Configure multer
export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES
  },
  fileFilter
});

/**
 * Enhanced middleware to process uploaded files
 * Adds security checks, validation, and metadata extraction
 */
export function processUploadedFiles(req: Request, res: Response, next: NextFunction) {
  if (!req.files && !req.file) {
    return next();
  }
  
  try {
    // Process single file upload
    if (req.file) {
      // Extract metadata
      const metadata = extractFileMetadata(req.file);
      
      // Perform security check (simulated virus scan)
      const scanResult = simulateVirusScan(req.file.path);
      
      if (!scanResult.safe) {
        // Delete the unsafe file
        fs.unlinkSync(req.file.path);
        return next(new SecurityError('Potentially malicious file detected', {
          reason: scanResult.reason,
          filename: req.file.originalname
        }));
      }
      
      // Add enhanced file info to request
      req.processedFile = {
        ...req.file,
        metadata,
        securityScan: scanResult
      };
    }
    
    // Process multiple file uploads
    if (req.files) {
      const processedFiles: any[] = [];
      
      // Handle array of files
      if (Array.isArray(req.files)) {
        for (const file of req.files) {
          const metadata = extractFileMetadata(file);
          const scanResult = simulateVirusScan(file.path);
          
          if (!scanResult.safe) {
            // Delete the unsafe file
            fs.unlinkSync(file.path);
            return next(new SecurityError('Potentially malicious file detected', {
              reason: scanResult.reason,
              filename: file.originalname
            }));
          }
          
          processedFiles.push({
            ...file,
            metadata,
            securityScan: scanResult
          });
        }
      } 
      // Handle fields with multiple files
      else {
        for (const fieldName in req.files) {
          const fieldFiles = req.files[fieldName];
          
          for (const file of fieldFiles) {
            const metadata = extractFileMetadata(file);
            const scanResult = simulateVirusScan(file.path);
            
            if (!scanResult.safe) {
              // Delete the unsafe file
              fs.unlinkSync(file.path);
              return next(new SecurityError('Potentially malicious file detected', {
                reason: scanResult.reason,
                filename: file.originalname,
                field: fieldName
              }));
            }
            
            processedFiles.push({
              ...file,
              fieldName,
              metadata,
              securityScan: scanResult
            });
          }
        }
      }
      
      // Add processed files to request
      req.processedFiles = processedFiles;
    }
    
    next();
  } catch (error) {
    // Clean up any uploaded files if there's an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    } else if (req.files) {
      if (Array.isArray(req.files)) {
        for (const file of req.files) {
          fs.unlinkSync(file.path);
        }
      } else {
        for (const fieldName in req.files) {
          const fieldFiles = req.files[fieldName];
          for (const file of fieldFiles) {
            fs.unlinkSync(file.path);
          }
        }
      }
    }
    
    next(error);
  }
}

/**
 * Extract metadata from uploaded file based on file type
 */
function extractFileMetadata(file: Express.Multer.File) {
  const metadata: Record<string, any> = {
    size: file.size,
    mimetype: file.mimetype,
    originalName: file.originalname,
    extension: path.extname(file.originalname).toLowerCase(),
    uploadedAt: new Date().toISOString()
  };
  
  // Add content-type specific metadata
  // In a real implementation, you would use libraries like exiftool,
  // pdf-parse, etc. to extract more detailed metadata
  if (file.mimetype.startsWith('image/')) {
    metadata.category = 'image';
    // Would normally extract dimensions, EXIF data, etc.
  } else if (file.mimetype === 'application/pdf') {
    metadata.category = 'document';
    // Would normally extract page count, author, etc.
  } else if (file.mimetype.includes('word')) {
    metadata.category = 'document';
    // Would normally extract author, revision info, etc.
  } else if (file.mimetype === 'text/plain') {
    metadata.category = 'text';
    // Would normally extract line count, character count, etc.
  } else {
    metadata.category = 'other';
  }
  
  return metadata;
}

/**
 * Simulate a virus scan (would be replaced with a real AV in production)
 */
function simulateVirusScan(filePath: string) {
  // In a real implementation, you would integrate with a virus scanning service
  // This is just a placeholder for demonstration
  
  try {
    // Read first few bytes of file for demo purposes
    const fileBuffer = fs.readFileSync(filePath, { flag: 'r' });
    const firstBytes = fileBuffer.slice(0, 4);
    
    // Simulating detection of malicious patterns (purely for demonstration)
    const firstBytesHex = firstBytes.toString('hex');
    
    // Check for "MZ" header (commonly used in executable files)
    if (firstBytesHex.startsWith('4d5a')) {
      return {
        safe: false,
        reason: 'Executable file detected'
      };
    }
    
    // Example check for potential script content in a non-script file type
    if (!filePath.endsWith('.js') && !filePath.endsWith('.html')) {
      const content = fileBuffer.slice(0, 500).toString();
      if (content.includes('<script>') || content.includes('eval(')) {
        return {
          safe: false,
          reason: 'Potential script injection detected'
        };
      }
    }
    
    // In this simulation, most files will pass the scan
    return {
      safe: true,
      scannedAt: new Date().toISOString()
    };
  } catch (error) {
    // If there's an error reading the file, fail the scan to be safe
    return {
      safe: false,
      reason: `Error scanning file: ${(error as Error).message}`
    };
  }
}

/**
 * Helper middleware to validate single file upload
 */
export function validateSingleFile(fieldName: string = 'file') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next(new ValidationError(`Missing required file in field: ${fieldName}`));
    }
    next();
  };
}

/**
 * Helper middleware to validate multiple file uploads
 */
export function validateMultipleFiles(fieldName: string = 'files', minFiles: number = 1, maxFiles: number = MAX_FILES) {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as Express.Multer.File[];
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return next(new ValidationError(`Missing required files in field: ${fieldName}`));
    }
    
    if (files.length < minFiles) {
      return next(new ValidationError(`At least ${minFiles} files must be uploaded`));
    }
    
    if (files.length > maxFiles) {
      return next(new ValidationError(`Maximum of ${maxFiles} files allowed`));
    }
    
    next();
  };
}

/**
 * Helper middleware to check content type header before processing multipart form data
 * This can save server resources by rejecting invalid requests early
 */
export function checkContentType(req: Request, res: Response, next: NextFunction) {
  const contentType = req.headers['content-type'] || '';
  
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!contentType.includes('multipart/form-data')) {
      return next(new ValidationError('Content-Type must be multipart/form-data for file uploads'));
    }
  }
  
  next();
}

/**
 * Helper to get clean file path
 * Removes path traversal vulnerabilities
 */
export function getSecureFilename(filename: string): string {
  // Remove any directory paths that might be in the filename
  return path.basename(filename);
}

/**
 * Validate a file extension against allowed extensions
 */
export function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(ext);
}

/**
 * Apply content type validation based on route
 */
export function contentBasedValidation(req: Request, res: Response, next: NextFunction) {
  const routePath = req.path;
  
  // Set appropriate allowed file types based on route
  if (routePath.includes('/documents/clinical')) {
    (req as any).allowedFileTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/dicom'
    ];
  } else if (routePath.includes('/documents/administrative')) {
    (req as any).allowedFileTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
  } else if (routePath.includes('/documents/images')) {
    (req as any).allowedFileTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
  }
  
  next();
}

/**
 * Create middleware to validate specific file types
 */
function validateFileTypes(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).allowedFileTypes = allowedTypes;
    next();
  };
}

// Define document content types
export const documentTypes = {
  clinical: validateFileTypes([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/dicom'
  ]),
  administrative: validateFileTypes([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]),
  images: validateFileTypes([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]),
  data: validateFileTypes([
    'application/json',
    'application/xml',
    'text/csv'
  ])
};

// Extend Request interface
declare global {
  namespace Express {
    export interface Request {
      processedFile?: any;
      processedFiles?: any[];
    }
  }
}