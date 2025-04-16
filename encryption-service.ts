/**
 * Encryption Service
 * 
 * Service for encrypting/decrypting sensitive data and handling
 * cryptographic operations.
 */

import crypto from 'crypto';
import { promisify } from 'util';
import { AppError } from '../../../common/error/app-error';
import { ErrorCode } from '../../../common/error/error-types';

// Promisify crypto functions
const randomBytesAsync = promisify(crypto.randomBytes);
const scryptAsync = promisify(crypto.scrypt);

/**
 * Encryption key derivation parameters
 */
interface KeyDerivationParams {
  /**
   * Password or passphrase
   */
  password: string;
  
  /**
   * Salt (16 bytes recommended)
   */
  salt: Buffer;
  
  /**
   * Key length in bytes
   */
  keyLength?: number;
}

/**
 * Encryption parameters
 */
interface EncryptionParams {
  /**
   * Encryption key
   */
  key: Buffer;
  
  /**
   * Initialization vector
   */
  iv: Buffer;
  
  /**
   * Algorithm to use
   */
  algorithm?: string;
}

/**
 * Hashing parameters
 */
interface HashingParams {
  /**
   * Data to hash
   */
  data: string;
  
  /**
   * Salt (optional)
   */
  salt?: string;
  
  /**
   * Algorithm to use
   */
  algorithm?: string;
}

/**
 * Token generation parameters
 */
interface TokenParams {
  /**
   * Data to encode
   */
  data: string;
  
  /**
   * Expiration in seconds
   */
  expiresIn?: number;
  
  /**
   * Secret key
   */
  secretKey: string;
}

/**
 * Encryption service implementation
 */
export class EncryptionService {
  private readonly secretKey: string;
  private readonly defaultAlgorithm = 'aes-256-gcm';
  private readonly defaultHashAlgorithm = 'sha256';
  private readonly defaultKeyLength = 32; // 256 bits
  private readonly defaultIvLength = 16; // 128 bits
  private readonly defaultPepper: string;
  
  constructor(secretKey: string, options: { defaultPepper?: string } = {}) {
    if (!secretKey) {
      throw new Error('Encryption service requires a secret key');
    }
    
    this.secretKey = secretKey;
    this.defaultPepper = options.defaultPepper || process.env.CRYPTO_PEPPER || '';
  }
  
  /**
   * Derive encryption key from password
   */
  async deriveKey(params: KeyDerivationParams): Promise<Buffer> {
    const { password, salt, keyLength = this.defaultKeyLength } = params;
    
    try {
      // Derive key using scrypt
      return await scryptAsync(password, salt, keyLength) as Buffer;
    } catch (error) {
      throw new AppError(
        'Key derivation failed',
        500,
        { code: ErrorCode.ENCRYPTION_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Generate a random salt
   */
  async generateSalt(length: number = 16): Promise<Buffer> {
    try {
      return await randomBytesAsync(length);
    } catch (error) {
      throw new AppError(
        'Salt generation failed',
        500,
        { code: ErrorCode.ENCRYPTION_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Generate a random initialization vector
   */
  async generateIv(length: number = this.defaultIvLength): Promise<Buffer> {
    try {
      return await randomBytesAsync(length);
    } catch (error) {
      throw new AppError(
        'IV generation failed',
        500,
        { code: ErrorCode.ENCRYPTION_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Encrypt data
   */
  encrypt(data: string, params: EncryptionParams): string {
    const { key, iv, algorithm = this.defaultAlgorithm } = params;
    
    try {
      // Create cipher
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      // Encrypt
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get auth tag for GCM mode
      const authTag = algorithm.includes('gcm') ? cipher.getAuthTag() : Buffer.alloc(0);
      
      // Return IV + Auth Tag (if applicable) + Encrypted Data
      return Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]).toString('base64');
    } catch (error) {
      throw new AppError(
        'Encryption failed',
        500,
        { code: ErrorCode.ENCRYPTION_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Decrypt data
   */
  decrypt(encryptedData: string, params: Pick<EncryptionParams, 'key' | 'algorithm'>): string {
    const { key, algorithm = this.defaultAlgorithm } = params;
    
    try {
      // Decode from base64
      const buffer = Buffer.from(encryptedData, 'base64');
      
      // Extract IV, auth tag, and encrypted data
      const ivLength = this.defaultIvLength;
      const iv = buffer.slice(0, ivLength);
      
      let authTagLength = 0;
      let authTag: Buffer;
      
      if (algorithm.includes('gcm')) {
        authTagLength = 16; // GCM auth tag is 16 bytes
        authTag = buffer.slice(ivLength, ivLength + authTagLength);
      }
      
      const encrypted = buffer.slice(ivLength + authTagLength);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      
      // Set auth tag for GCM mode
      if (algorithm.includes('gcm')) {
        decipher.setAuthTag(authTag!);
      }
      
      // Decrypt
      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new AppError(
        'Decryption failed',
        500,
        { code: ErrorCode.ENCRYPTION_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Encrypt object
   */
  async encryptObject<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[],
    encryptionKey?: string
  ): Promise<T> {
    // Use provided key or derive from secret key
    const key = encryptionKey 
      ? Buffer.from(encryptionKey, 'hex') 
      : await this.deriveKey({
          password: this.secretKey,
          salt: Buffer.from(this.defaultPepper, 'hex'),
        });
    
    // Generate IV
    const iv = await this.generateIv();
    
    // Create a copy of the object
    const result = { ...obj };
    
    // Encrypt each specified field
    for (const field of fields) {
      if (result[field] !== undefined && result[field] !== null) {
        const value = typeof result[field] === 'object'
          ? JSON.stringify(result[field])
          : String(result[field]);
        
        result[field] = this.encrypt(value, { key, iv });
      }
    }
    
    return result;
  }
  
  /**
   * Decrypt object
   */
  async decryptObject<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[],
    encryptionKey?: string
  ): Promise<T> {
    // Use provided key or derive from secret key
    const key = encryptionKey 
      ? Buffer.from(encryptionKey, 'hex') 
      : await this.deriveKey({
          password: this.secretKey,
          salt: Buffer.from(this.defaultPepper, 'hex'),
        });
    
    // Create a copy of the object
    const result = { ...obj };
    
    // Decrypt each specified field
    for (const field of fields) {
      if (result[field] !== undefined && result[field] !== null) {
        try {
          const decrypted = this.decrypt(String(result[field]), { key });
          
          // Try to parse as JSON if it looks like an object
          if (decrypted.startsWith('{') && decrypted.endsWith('}')) {
            try {
              result[field] = JSON.parse(decrypted);
            } catch {
              result[field] = decrypted;
            }
          } else {
            result[field] = decrypted;
          }
        } catch (error) {
          // If decryption fails, leave as is (it might not be encrypted)
          console.error(`Failed to decrypt field ${String(field)}:`, error);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Hash data with optional salt
   */
  hash(params: HashingParams): string {
    const { data, salt, algorithm = this.defaultHashAlgorithm } = params;
    
    try {
      const hash = crypto.createHash(algorithm);
      
      // Add pepper if available
      if (this.defaultPepper) {
        hash.update(this.defaultPepper);
      }
      
      // Add data
      hash.update(data);
      
      // Add salt if available
      if (salt) {
        hash.update(salt);
      }
      
      return hash.digest('hex');
    } catch (error) {
      throw new AppError(
        'Hashing failed',
        500,
        { code: ErrorCode.ENCRYPTION_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Hash password with salt
   */
  async hashPassword(password: string): Promise<string> {
    // Generate salt
    const salt = (await this.generateSalt()).toString('hex');
    
    // Hash password with salt
    const hash = this.hash({ data: password, salt });
    
    // Return hash.salt format
    return `${hash}.${salt}`;
  }
  
  /**
   * Verify password against hash
   */
  verifyPassword(password: string, storedHash: string): boolean {
    try {
      // Split hash and salt
      const [hash, salt] = storedHash.split('.');
      
      // Hash the provided password with the same salt
      const computedHash = this.hash({ data: password, salt });
      
      // Compare hashes
      return computedHash === hash;
    } catch (error) {
      throw new AppError(
        'Password verification failed',
        500,
        { code: ErrorCode.ENCRYPTION_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Generate random string token
   */
  async generateRandomToken(length: number = 32): Promise<string> {
    try {
      const buffer = await randomBytesAsync(Math.ceil(length / 2));
      return buffer.toString('hex').slice(0, length);
    } catch (error) {
      throw new AppError(
        'Token generation failed',
        500,
        { code: ErrorCode.ENCRYPTION_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Generate HMAC signature
   */
  generateHmac(data: string, key: string = this.secretKey): string {
    try {
      return crypto
        .createHmac(this.defaultHashAlgorithm, key)
        .update(data)
        .digest('hex');
    } catch (error) {
      throw new AppError(
        'HMAC generation failed',
        500,
        { code: ErrorCode.ENCRYPTION_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Verify HMAC signature
   */
  verifyHmac(data: string, signature: string, key: string = this.secretKey): boolean {
    try {
      const computedSignature = this.generateHmac(data, key);
      return crypto.timingSafeEqual(
        Buffer.from(computedSignature, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch (error) {
      throw new AppError(
        'HMAC verification failed',
        500,
        { code: ErrorCode.ENCRYPTION_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Generate secure random OTP
   */
  async generateOtp(length: number = 6): Promise<string> {
    try {
      // Generate random bytes
      const randomBytes = await randomBytesAsync(length * 2);
      
      // Convert to number string
      let otp = '';
      for (let i = 0; i < length; i++) {
        otp += randomBytes[i] % 10;
      }
      
      return otp;
    } catch (error) {
      throw new AppError(
        'OTP generation failed',
        500,
        { code: ErrorCode.ENCRYPTION_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Generate API key
   */
  async generateApiKey(): Promise<string> {
    try {
      // Generate 32 bytes of random data
      const bytes = await randomBytesAsync(32);
      
      // Convert to base64url format
      return bytes.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    } catch (error) {
      throw new AppError(
        'API key generation failed',
        500,
        { code: ErrorCode.ENCRYPTION_ERROR, cause: error }
      );
    }
  }
  
  /**
   * Hash API key for storage
   */
  hashApiKey(apiKey: string): string {
    return this.hash({ data: apiKey });
  }
  
  /**
   * Generate UUID v4
   */
  generateUuid(): string {
    return crypto.randomUUID();
  }
}