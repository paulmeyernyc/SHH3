/**
 * Storage Provider Factory
 * 
 * This module creates and manages storage providers based on configuration.
 */

import path from 'path';
import { StorageProvider } from './storage-provider';
import { FilesystemStorageProvider } from './filesystem-provider';
import { S3StorageProvider, S3StorageConfig } from './s3-provider';

export type StorageProviderType = 'filesystem' | 's3' | 'azure_blob';

/**
 * Storage configuration for all providers
 */
export interface StorageConfig {
  default: StorageProviderType;
  providers: {
    filesystem?: {
      basePath: string;
    };
    s3?: S3StorageConfig;
    azure_blob?: {
      connectionString: string;
      containerName: string;
    };
  };
}

/**
 * Factory for creating storage providers
 */
export class StorageFactory {
  private providers: Map<StorageProviderType, StorageProvider> = new Map();
  private readonly config: StorageConfig;
  
  /**
   * Create a new StorageFactory
   */
  constructor(config: StorageConfig) {
    this.config = config;
    
    // Initialize default provider
    this.getProvider(config.default);
  }
  
  /**
   * Get a storage provider by type
   */
  getProvider(type: StorageProviderType): StorageProvider {
    // Return cached provider if available
    if (this.providers.has(type)) {
      return this.providers.get(type)!;
    }
    
    // Create new provider
    const provider = this.createProvider(type);
    this.providers.set(type, provider);
    
    return provider;
  }
  
  /**
   * Get the default storage provider
   */
  getDefaultProvider(): StorageProvider {
    return this.getProvider(this.config.default);
  }
  
  /**
   * Create a new storage provider
   */
  private createProvider(type: StorageProviderType): StorageProvider {
    switch (type) {
      case 'filesystem':
        return this.createFilesystemProvider();
      case 's3':
        return this.createS3Provider();
      case 'azure_blob':
        throw new Error('Azure Blob storage provider not implemented yet');
      default:
        throw new Error(`Unknown storage provider type: ${type}`);
    }
  }
  
  /**
   * Create a filesystem storage provider
   */
  private createFilesystemProvider(): StorageProvider {
    const config = this.config.providers.filesystem;
    
    if (!config) {
      throw new Error('Filesystem storage provider config not found');
    }
    
    // Resolve base path if it's relative
    const basePath = path.isAbsolute(config.basePath) 
      ? config.basePath 
      : path.resolve(process.cwd(), config.basePath);
    
    return new FilesystemStorageProvider(basePath);
  }
  
  /**
   * Create an S3 storage provider
   */
  private createS3Provider(): StorageProvider {
    const config = this.config.providers.s3;
    
    if (!config) {
      throw new Error('S3 storage provider config not found');
    }
    
    return new S3StorageProvider(config);
  }
}

/**
 * Create a storage factory with config from environment
 */
export function createStorageFactoryFromEnv(): StorageFactory {
  // Determine default provider from environment
  const defaultProvider = (process.env.STORAGE_PROVIDER || 'filesystem') as StorageProviderType;
  
  // Create config based on environment variables
  const config: StorageConfig = {
    default: defaultProvider,
    providers: {}
  };
  
  // Configure filesystem provider if used
  if (defaultProvider === 'filesystem' || process.env.FILESYSTEM_STORAGE_PATH) {
    config.providers.filesystem = {
      basePath: process.env.FILESYSTEM_STORAGE_PATH || path.resolve(process.cwd(), 'storage')
    };
  }
  
  // Configure S3 provider if used
  if (defaultProvider === 's3' || process.env.S3_BUCKET) {
    config.providers.s3 = {
      region: process.env.S3_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || 'health-documents',
      endpoint: process.env.S3_ENDPOINT,
      credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
      } : undefined
    };
  }
  
  // Configure Azure Blob provider if used
  if (defaultProvider === 'azure_blob' || process.env.AZURE_BLOB_CONNECTION_STRING) {
    config.providers.azure_blob = {
      connectionString: process.env.AZURE_BLOB_CONNECTION_STRING || '',
      containerName: process.env.AZURE_BLOB_CONTAINER || 'documents'
    };
  }
  
  return new StorageFactory(config);
}