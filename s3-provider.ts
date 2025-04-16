/**
 * S3 Storage Provider
 * 
 * This module implements the StorageProvider interface for AWS S3 storage.
 */

import { Readable } from 'stream';
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  GetObjectRequest,
  DeleteObjectRequest
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

/**
 * S3 Storage Provider
 */
export class S3StorageProvider extends BaseStorageProvider {
  readonly provider = 's3';
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  
  /**
   * Create a new S3StorageProvider
   * @param config S3 configuration
   */
  constructor(config: S3StorageConfig) {
    super();
    
    this.bucket = config.bucket;
    this.region = config.region;
    
    // Create S3 client
    this.client = new S3Client({
      region: this.region,
      credentials: config.credentials,
      endpoint: config.endpoint
    });
  }
  
  /**
   * Store a document in S3
   */
  async storeDocument(
    path: string, 
    contentStream: Readable, 
    contentLength: number, 
    metadata?: Record<string, any>
  ): Promise<StorageResult> {
    // Calculate content type
    const contentType = mime.lookup(path) || 'application/octet-stream';
    
    // Create a passthrough stream to calculate hash while uploading
    const { PassThrough } = await import('stream');
    const passthrough = new PassThrough();
    
    // Calculate hash while streaming
    const hashPromise = this.calculateHash(contentStream);
    
    // Pipe content to passthrough
    contentStream.pipe(passthrough);
    
    // Upload to S3
    const uploadParams = {
      Bucket: this.bucket,
      Key: path,
      Body: passthrough,
      ContentType: contentType,
      ContentLength: contentLength,
      Metadata: metadata ? this.formatMetadata(metadata) : undefined
    };
    
    const uploadCommand = new PutObjectCommand(uploadParams);
    await this.client.send(uploadCommand);
    
    // Wait for hash calculation to complete
    const hash = await hashPromise;
    
    return {
      path,
      hash,
      size: contentLength,
      metadata,
      timestamp: new Date()
    };
  }
  
  /**
   * Retrieve a document from S3
   */
  async getDocument(path: string): Promise<RetrieveResult> {
    const getParams: GetObjectRequest = {
      Bucket: this.bucket,
      Key: path
    };
    
    // Get object
    const getCommand = new GetObjectCommand(getParams);
    const response = await this.client.send(getCommand);
    
    // Verify response has a body
    if (!response.Body) {
      throw new Error(`No content returned for document: ${path}`);
    }
    
    // Convert to Readable stream
    const content = response.Body as Readable;
    
    // Get metadata
    const metadata = this.parseMetadata(response.Metadata);
    
    return {
      content,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || 0,
      metadata,
      lastModified: response.LastModified
    };
  }
  
  /**
   * Delete a document from S3
   */
  async deleteDocument(path: string): Promise<DeleteResult> {
    const deleteParams: DeleteObjectRequest = {
      Bucket: this.bucket,
      Key: path
    };
    
    try {
      // Check if object exists first
      const exists = await this.documentExists(path);
      
      if (!exists) {
        return {
          path,
          deleted: false,
          timestamp: new Date()
        };
      }
      
      // Delete object
      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await this.client.send(deleteCommand);
      
      return {
        path,
        deleted: true,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error deleting document ${path}:`, error);
      
      return {
        path,
        deleted: false,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Generate a signed URL for a document
   */
  async generateSignedUrl(path: string, expiresInSeconds: number): Promise<string> {
    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path
    });
    
    // Create presigned URL
    const url = await getSignedUrl(this.client, getCommand, { 
      expiresIn: expiresInSeconds 
    });
    
    return url;
  }
  
  /**
   * Check if a document exists in S3
   */
  async documentExists(path: string): Promise<boolean> {
    try {
      const headParams = {
        Bucket: this.bucket,
        Key: path
      };
      
      const headCommand = new HeadObjectCommand(headParams);
      await this.client.send(headCommand);
      
      return true;
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      
      // Rethrow other errors
      throw error;
    }
  }
  
  /**
   * Move a document to a new path in S3
   * Note: S3 doesn't have a move operation, so we copy and delete
   */
  async moveDocument(sourcePath: string, destinationPath: string): Promise<MoveResult> {
    try {
      // Copy first
      const copyResult = await this.copyDocument(sourcePath, destinationPath);
      
      if (copyResult.success) {
        // Then delete the original
        const deleteResult = await this.deleteDocument(sourcePath);
        
        return {
          sourcePath,
          destinationPath,
          success: deleteResult.deleted,
          timestamp: new Date()
        };
      }
      
      return {
        sourcePath,
        destinationPath,
        success: false,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error moving document from ${sourcePath} to ${destinationPath}:`, error);
      
      return {
        sourcePath,
        destinationPath,
        success: false,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Copy a document to a new path in S3
   */
  async copyDocument(sourcePath: string, destinationPath: string): Promise<CopyResult> {
    try {
      const copyParams = {
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourcePath}`,
        Key: destinationPath
      };
      
      const copyCommand = new CopyObjectCommand(copyParams);
      await this.client.send(copyCommand);
      
      return {
        sourcePath,
        destinationPath,
        success: true,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error copying document from ${sourcePath} to ${destinationPath}:`, error);
      
      return {
        sourcePath,
        destinationPath,
        success: false,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * List documents in a directory
   */
  async listDocuments(directory: string, recursive = false): Promise<ListResult> {
    // Normalize directory path to ensure it ends with a /
    const prefix = directory ? 
      (directory.endsWith('/') ? directory : `${directory}/`) : 
      '';
    
    // If not recursive, we need to use a delimiter
    const delimiter = recursive ? undefined : '/';
    
    const listParams = {
      Bucket: this.bucket,
      Prefix: prefix,
      Delimiter: delimiter
    };
    
    const listCommand = new ListObjectsV2Command(listParams);
    const response = await this.client.send(listCommand);
    
    const items: ListItem[] = [];
    
    // Process files
    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key) {
          // Skip the directory itself if it's included
          if (object.Key === prefix) {
            continue;
          }
          
          items.push({
            path: object.Key,
            isDirectory: object.Key.endsWith('/'),
            size: object.Size,
            lastModified: object.LastModified
          });
        }
      }
    }
    
    // Process directories (CommonPrefixes)
    if (response.CommonPrefixes) {
      for (const prefix of response.CommonPrefixes) {
        if (prefix.Prefix) {
          items.push({
            path: prefix.Prefix,
            isDirectory: true
          });
        }
      }
    }
    
    return {
      directory,
      recursive,
      items
    };
  }
  
  /**
   * Format metadata for S3 storage
   */
  private formatMetadata(metadata: Record<string, any>): Record<string, string> {
    // S3 metadata must be strings
    const result: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      // Skip undefined values
      if (value === undefined) {
        continue;
      }
      
      // Convert non-string values to JSON
      if (typeof value !== 'string') {
        result[key] = JSON.stringify(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  /**
   * Parse metadata from S3 response
   */
  private parseMetadata(metadata?: Record<string, string>): Record<string, any> | undefined {
    if (!metadata) {
      return undefined;
    }
    
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      // Try to parse JSON values
      try {
        result[key] = JSON.parse(value);
      } catch (e) {
        // If parsing fails, use the original string value
        result[key] = value;
      }
    }
    
    return result;
  }
}

/**
 * S3 Storage Configuration
 */
export interface S3StorageConfig {
  region: string;
  bucket: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint?: string;
}