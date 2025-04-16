/**
 * Filesystem Storage Provider
 * 
 * This module implements the StorageProvider interface for local filesystem storage.
 */

import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import crypto from 'crypto';
import mime from 'mime-types';
import { 
  BaseStorageProvider, 
  StorageResult, 
  RetrieveResult, 
  DeleteResult, 
  MoveResult, 
  CopyResult, 
  ListResult,
  ListItem
} from './storage-provider';

// Promisify filesystem operations
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const rename = promisify(fs.rename);
const access = promisify(fs.access);
const copyFile = promisify(fs.copyFile);

/**
 * Filesystem Storage Provider
 */
export class FilesystemStorageProvider extends BaseStorageProvider {
  readonly provider = 'filesystem';
  private readonly basePath: string;
  
  /**
   * Create a new FilesystemStorageProvider
   * @param basePath Base directory for document storage
   */
  constructor(basePath: string) {
    super();
    this.basePath = basePath;
    
    // Create base directory if it doesn't exist
    this.ensureDirectory(this.basePath);
  }
  
  /**
   * Store a document on the filesystem
   */
  async storeDocument(
    path: string, 
    contentStream: Readable, 
    contentLength: number, 
    metadata?: Record<string, any>
  ): Promise<StorageResult> {
    // Ensure the directory exists
    const fullPath = this.getFullPath(path);
    await this.ensureDirectory(this.getDirectory(fullPath));
    
    // Calculate hash while writing to file
    const hash = crypto.createHash('sha512');
    const fileStream = fs.createWriteStream(fullPath);
    
    await new Promise<void>((resolve, reject) => {
      contentStream.on('data', (chunk) => {
        hash.update(chunk);
        fileStream.write(chunk);
      });
      
      contentStream.on('end', () => {
        fileStream.end();
        resolve();
      });
      
      contentStream.on('error', reject);
      fileStream.on('error', reject);
    });
    
    // Get file size
    const stats = await stat(fullPath);
    
    // Create metadata file if provided
    if (metadata) {
      const metadataPath = `${fullPath}.metadata.json`;
      await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }
    
    return {
      path,
      hash: hash.digest('hex'),
      size: stats.size,
      metadata,
      timestamp: new Date()
    };
  }
  
  /**
   * Retrieve a document from the filesystem
   */
  async getDocument(path: string): Promise<RetrieveResult> {
    const fullPath = this.getFullPath(path);
    
    // Check if file exists
    await this.fileExists(fullPath);
    
    // Get file stats
    const stats = await stat(fullPath);
    
    // Create readable stream
    const contentStream = fs.createReadStream(fullPath);
    
    // Determine content type
    const contentType = mime.lookup(fullPath) || 'application/octet-stream';
    
    // Try to read metadata if it exists
    let metadata: Record<string, any> | undefined;
    const metadataPath = `${fullPath}.metadata.json`;
    try {
      const metadataExists = await this.fileExists(metadataPath, false);
      if (metadataExists) {
        const metadataContent = await fs.promises.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(metadataContent);
      }
    } catch (error) {
      console.warn(`Failed to read metadata for ${path}:`, error);
    }
    
    return {
      content: contentStream,
      contentType,
      contentLength: stats.size,
      metadata,
      lastModified: stats.mtime
    };
  }
  
  /**
   * Delete a document from the filesystem
   */
  async deleteDocument(path: string): Promise<DeleteResult> {
    const fullPath = this.getFullPath(path);
    
    // Check if file exists
    const exists = await this.fileExists(fullPath, false);
    
    if (exists) {
      // Delete the file
      await unlink(fullPath);
      
      // Try to delete metadata file if it exists
      try {
        const metadataPath = `${fullPath}.metadata.json`;
        const metadataExists = await this.fileExists(metadataPath, false);
        if (metadataExists) {
          await unlink(metadataPath);
        }
      } catch (error) {
        console.warn(`Failed to delete metadata for ${path}:`, error);
      }
      
      return {
        path,
        deleted: true,
        timestamp: new Date()
      };
    }
    
    return {
      path,
      deleted: false,
      timestamp: new Date()
    };
  }
  
  /**
   * Generate a signed URL for a document
   * Note: For filesystem, this just returns a file path that can be used with 
   * a file serving endpoint.
   */
  async generateSignedUrl(path: string, expiresInSeconds: number): Promise<string> {
    // For filesystem, we don't have actual signing
    // In real implementation, this would include a token or signature parameter
    // that's validated by the file serving endpoint
    
    // Check if file exists
    const fullPath = this.getFullPath(path);
    await this.fileExists(fullPath);
    
    // Generate a simple token for demonstration purposes
    // In production, this would be a cryptographically secure token
    const expiryTime = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const hmac = crypto.createHmac('sha256', 'filesystemsecret');
    hmac.update(`${path}:${expiryTime}`);
    const signature = hmac.digest('hex');
    
    // Return a URL that points to a file serving endpoint
    return `/api/documents/download?path=${encodeURIComponent(path)}&expires=${expiryTime}&signature=${signature}`;
  }
  
  /**
   * Check if a document exists
   */
  async documentExists(path: string): Promise<boolean> {
    return this.fileExists(this.getFullPath(path), false);
  }
  
  /**
   * Move a document to a new path
   */
  async moveDocument(sourcePath: string, destinationPath: string): Promise<MoveResult> {
    const sourceFullPath = this.getFullPath(sourcePath);
    const destFullPath = this.getFullPath(destinationPath);
    
    // Check if source file exists
    await this.fileExists(sourceFullPath);
    
    // Ensure destination directory exists
    await this.ensureDirectory(this.getDirectory(destFullPath));
    
    // Move the file
    await rename(sourceFullPath, destFullPath);
    
    // Try to move metadata file if it exists
    try {
      const sourceMetadataPath = `${sourceFullPath}.metadata.json`;
      const destMetadataPath = `${destFullPath}.metadata.json`;
      const metadataExists = await this.fileExists(sourceMetadataPath, false);
      
      if (metadataExists) {
        await rename(sourceMetadataPath, destMetadataPath);
      }
    } catch (error) {
      console.warn(`Failed to move metadata for ${sourcePath}:`, error);
    }
    
    return {
      sourcePath,
      destinationPath,
      success: true,
      timestamp: new Date()
    };
  }
  
  /**
   * Copy a document to a new path
   */
  async copyDocument(sourcePath: string, destinationPath: string): Promise<CopyResult> {
    const sourceFullPath = this.getFullPath(sourcePath);
    const destFullPath = this.getFullPath(destinationPath);
    
    // Check if source file exists
    await this.fileExists(sourceFullPath);
    
    // Ensure destination directory exists
    await this.ensureDirectory(this.getDirectory(destFullPath));
    
    // Copy the file
    await copyFile(sourceFullPath, destFullPath);
    
    // Try to copy metadata file if it exists
    try {
      const sourceMetadataPath = `${sourceFullPath}.metadata.json`;
      const destMetadataPath = `${destFullPath}.metadata.json`;
      const metadataExists = await this.fileExists(sourceMetadataPath, false);
      
      if (metadataExists) {
        await copyFile(sourceMetadataPath, destMetadataPath);
      }
    } catch (error) {
      console.warn(`Failed to copy metadata for ${sourcePath}:`, error);
    }
    
    return {
      sourcePath,
      destinationPath,
      success: true,
      timestamp: new Date()
    };
  }
  
  /**
   * List documents in a directory
   */
  async listDocuments(directory: string, recursive = false): Promise<ListResult> {
    const fullDirPath = this.getFullPath(directory);
    
    // Check if directory exists
    const dirExists = await this.directoryExists(fullDirPath);
    if (!dirExists) {
      return {
        directory,
        recursive,
        items: []
      };
    }
    
    const items: ListItem[] = await this.listDirectoryContents(fullDirPath, recursive);
    
    // Convert full paths to relative paths
    const relativizedItems = items.map(item => {
      const relativePath = path.relative(this.basePath, item.path);
      return {
        ...item,
        path: relativePath
      };
    });
    
    return {
      directory,
      recursive,
      items: relativizedItems
    };
  }
  
  /**
   * List contents of a directory
   */
  private async listDirectoryContents(dirPath: string, recursive: boolean): Promise<ListItem[]> {
    // Read directory contents
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    const result: ListItem[] = [];
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      // Skip metadata files
      if (entry.name.endsWith('.metadata.json')) {
        continue;
      }
      
      if (entry.isDirectory()) {
        result.push({
          path: entryPath,
          isDirectory: true
        });
        
        // Recursively list contents if requested
        if (recursive) {
          const subDirContents = await this.listDirectoryContents(entryPath, true);
          result.push(...subDirContents);
        }
      } else if (entry.isFile()) {
        try {
          const stats = await stat(entryPath);
          result.push({
            path: entryPath,
            isDirectory: false,
            size: stats.size,
            lastModified: stats.mtime
          });
        } catch (error) {
          console.warn(`Failed to get stats for ${entryPath}:`, error);
          result.push({
            path: entryPath,
            isDirectory: false
          });
        }
      }
    }
    
    return result;
  }
  
  /**
   * Get the full filesystem path
   */
  private getFullPath(relativePath: string): string {
    // Normalize and resolve path to prevent path traversal
    const normalizedPath = path.normalize(relativePath)
      .replace(/^(\.\.(\/|\\|$))+/, ''); // Remove leading "../" to prevent traversal
    
    return path.resolve(this.basePath, normalizedPath);
  }
  
  /**
   * Get the directory part of a path
   */
  private getDirectory(filePath: string): string {
    return path.dirname(filePath);
  }
  
  /**
   * Ensure a directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Check if directory already exists
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
  
  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string, throwIfNotExists = true): Promise<boolean> {
    try {
      await access(filePath, fs.constants.F_OK);
      return true;
    } catch (error) {
      if (throwIfNotExists) {
        throw new Error(`File not found: ${filePath}`);
      }
      return false;
    }
  }
  
  /**
   * Check if a directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await stat(dirPath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }
}