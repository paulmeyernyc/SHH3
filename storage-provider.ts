/**
 * Document Storage Provider Interface
 * 
 * This module defines the interface for document storage providers 
 * and implements common functionality.
 */

import { Readable } from 'stream';
import crypto from 'crypto';

/**
 * Document Storage Provider Interface
 */
export interface StorageProvider {
  /**
   * Unique identifier for this storage provider
   */
  readonly provider: string;
  
  /**
   * Store a document with the given path
   */
  storeDocument(
    path: string, 
    contentStream: Readable, 
    contentLength: number, 
    metadata?: Record<string, any>
  ): Promise<StorageResult>;
  
  /**
   * Retrieve a document from storage
   */
  getDocument(path: string): Promise<RetrieveResult>;
  
  /**
   * Delete a document from storage
   */
  deleteDocument(path: string): Promise<DeleteResult>;
  
  /**
   * Generate a temporary signed URL for direct download
   */
  generateSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
  
  /**
   * Check if a document exists in storage
   */
  documentExists(path: string): Promise<boolean>;
  
  /**
   * Move a document to a new path
   */
  moveDocument(sourcePath: string, destinationPath: string): Promise<MoveResult>;
  
  /**
   * Copy a document to a new path
   */
  copyDocument(sourcePath: string, destinationPath: string): Promise<CopyResult>;
  
  /**
   * List documents in a directory
   */
  listDocuments(directory: string, recursive?: boolean): Promise<ListResult>;
  
  /**
   * Generate a path for a new document
   */
  generatePath(userId: number, documentId: number, filename: string): string;
  
  /**
   * Calculate hash for a document stream
   */
  calculateHash(stream: Readable): Promise<string>;
  
  /**
   * Check document content against a hash
   */
  verifyDocument(path: string, hash: string): Promise<VerifyResult>;
}

/**
 * Base Storage Provider with common functionality
 */
export abstract class BaseStorageProvider implements StorageProvider {
  abstract readonly provider: string;
  
  abstract storeDocument(
    path: string, 
    contentStream: Readable, 
    contentLength: number, 
    metadata?: Record<string, any>
  ): Promise<StorageResult>;
  
  abstract getDocument(path: string): Promise<RetrieveResult>;
  
  abstract deleteDocument(path: string): Promise<DeleteResult>;
  
  abstract generateSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
  
  abstract documentExists(path: string): Promise<boolean>;
  
  abstract moveDocument(sourcePath: string, destinationPath: string): Promise<MoveResult>;
  
  abstract copyDocument(sourcePath: string, destinationPath: string): Promise<CopyResult>;
  
  abstract listDocuments(directory: string, recursive?: boolean): Promise<ListResult>;
  
  /**
   * Generate a path for a new document using a consistent pattern
   */
  generatePath(userId: number, documentId: number, filename: string): string {
    // Sanitize filename
    const sanitizedFilename = this.sanitizeFilename(filename);
    
    // Create YYYY/MM/DD structure based on current date
    const now = new Date();
    const year = now.getFullYear();
    // Add leading zero if month < 10 (e.g., 01, 02, etc.)
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // Format: documents/{userId}/{year}/{month}/{day}/{documentId}/{sanitizedFilename}
    return `documents/${userId}/${year}/${month}/${day}/${documentId}/${sanitizedFilename}`;
  }
  
  /**
   * Sanitize a filename to ensure it's safe for storage
   */
  sanitizeFilename(filename: string): string {
    // Remove any path components
    const baseName = filename.split(/[\\/]/).pop() || 'unnamed';
    
    // Replace any non-alphanumeric characters except for safe punctuation with a dash
    const sanitized = baseName
      .replace(/[^\w\s.-]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    
    return sanitized;
  }
  
  /**
   * Calculate SHA-512 hash for a document stream
   */
  async calculateHash(stream: Readable): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha512');
      
      stream.on('data', (chunk) => {
        hash.update(chunk);
      });
      
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  /**
   * Check document content against a hash
   */
  async verifyDocument(path: string, hash: string): Promise<VerifyResult> {
    try {
      // Get the document
      const retrieval = await this.getDocument(path);
      
      // Calculate the hash
      const calculatedHash = await this.calculateHash(retrieval.content);
      
      // Compare the hashes
      const isValid = calculatedHash === hash;
      
      return {
        isValid,
        calculated: calculatedHash,
        expected: hash
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

// Result interfaces for storage operations

export interface StorageResult {
  path: string;
  hash: string;
  size: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface RetrieveResult {
  content: Readable;
  contentType: string;
  contentLength: number;
  metadata?: Record<string, any>;
  lastModified?: Date;
}

export interface DeleteResult {
  path: string;
  deleted: boolean;
  timestamp: Date;
}

export interface MoveResult {
  sourcePath: string;
  destinationPath: string;
  success: boolean;
  timestamp: Date;
}

export interface CopyResult {
  sourcePath: string;
  destinationPath: string;
  success: boolean;
  timestamp: Date;
}

export interface ListResult {
  directory: string;
  recursive: boolean;
  items: Array<ListItem>;
}

export interface ListItem {
  path: string;
  isDirectory: boolean;
  size?: number;
  lastModified?: Date;
}

export interface VerifyResult {
  isValid: boolean;
  calculated?: string;
  expected?: string;
  error?: string;
}