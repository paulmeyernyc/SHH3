/**
 * Multi-Factor Authentication Service
 * 
 * Service for managing different types of MFA methods including
 * TOTP (Time-based One-Time Password), SMS, and Email verification.
 */

import { authenticator } from 'otplib';
import crypto from 'crypto';
import { promisify } from 'util';
import { AppError } from '../../../common/error/app-error';
import { ErrorCode } from '../../../common/error/error-types';
import { EncryptionService } from './encryption-service';
import {
  User,
  MfaMethod,
  MfaType,
  MfaVerificationResponse,
  MfaSetupResponse,
  MfaStatus
} from '../model';

// Promisify crypto functions
const randomBytesAsync = promisify(crypto.randomBytes);

/**
 * MFA configuration
 */
interface MfaConfig {
  /**
   * TOTP configuration
   */
  totp?: {
    /**
     * Issuer for TOTP
     */
    issuer: string;
    
    /**
     * Number of digits in TOTP code
     */
    digits?: number;
    
    /**
     * Time step in seconds
     */
    step?: number;
    
    /**
     * TOTP algorithm
     */
    algorithm?: string;
  };
  
  /**
   * SMS configuration
   */
  sms?: {
    /**
     * Code expiration time in seconds
     */
    codeExpirationSeconds: number;
    
    /**
     * Number of digits in SMS code
     */
    codeLength?: number;
    
    /**
     * Rate limiting in seconds
     */
    rateLimit?: number;
  };
  
  /**
   * Email configuration
   */
  email?: {
    /**
     * Code expiration time in seconds
     */
    codeExpirationSeconds: number;
    
    /**
     * Number of digits in email code
     */
    codeLength?: number;
    
    /**
     * Rate limiting in seconds
     */
    rateLimit?: number;
  };
}

/**
 * MFA verification parameters
 */
interface MfaVerificationParams {
  /**
   * User to verify
   */
  user: User;
  
  /**
   * MFA method ID
   */
  methodId: string;
  
  /**
   * Verification code
   */
  code: string;
  
  /**
   * MFA type
   */
  type: MfaType;
}

/**
 * TOTP Verification parameters
 */
interface TotpVerificationParams {
  /**
   * User to verify
   */
  user: User;
  
  /**
   * MFA method ID
   */
  methodId: string;
  
  /**
   * TOTP code
   */
  code: string;
}

/**
 * SMS/Email Verification parameters
 */
interface CodeVerificationParams {
  /**
   * User to verify
   */
  user: User;
  
  /**
   * MFA method ID
   */
  methodId: string;
  
  /**
   * Verification code
   */
  code: string;
  
  /**
   * Code expiration time in seconds
   */
  expirationSeconds: number;
}

/**
 * TOTP setup parameters
 */
interface TotpSetupParams {
  /**
   * User to setup TOTP for
   */
  user: User;
  
  /**
   * User's account email
   */
  accountName: string;
  
  /**
   * Issuer name
   */
  issuer: string;
}

/**
 * SMS setup parameters
 */
interface SmsSetupParams {
  /**
   * User to setup SMS for
   */
  user: User;
  
  /**
   * Phone number
   */
  phoneNumber: string;
}

/**
 * Email setup parameters
 */
interface EmailSetupParams {
  /**
   * User to setup email for
   */
  user: User;
  
  /**
   * Email address
   */
  email: string;
}

/**
 * MFA service implementation
 */
export class MfaService {
  private readonly encryptionService: EncryptionService;
  private readonly config: MfaConfig;
  private readonly userMethods: Map<string, MfaMethod[]> = new Map();
  private readonly pendingOtpCodes: Map<string, { code: string, expiresAt: number }> = new Map();
  
  constructor(encryptionService: EncryptionService, config: MfaConfig = {}) {
    this.encryptionService = encryptionService;
    
    // Set default configuration
    this.config = {
      totp: {
        issuer: 'Smart Health Hub',
        digits: 6,
        step: 30,
        algorithm: 'sha1',
        ...config.totp
      },
      sms: {
        codeExpirationSeconds: 300, // 5 minutes
        codeLength: 6,
        rateLimit: 60, // 1 minute
        ...config.sms
      },
      email: {
        codeExpirationSeconds: 600, // 10 minutes
        codeLength: 6,
        rateLimit: 60, // 1 minute
        ...config.email
      }
    };
    
    // Configure TOTP library
    authenticator.options = {
      digits: this.config.totp!.digits!,
      step: this.config.totp!.step!,
      algorithm: this.config.totp!.algorithm! as 'sha1' | 'sha256' | 'sha512'
    };
  }
  
  /**
   * Get MFA methods for a user
   */
  async getMfaMethods(userId: string): Promise<MfaMethod[]> {
    return this.userMethods.get(userId) || [];
  }
  
  /**
   * Setup TOTP MFA method
   */
  async setupTotpMethod(params: TotpSetupParams): Promise<MfaSetupResponse> {
    const { user, accountName, issuer } = params;
    
    try {
      // Generate a secret
      const secret = authenticator.generateSecret();
      
      // Create method ID
      const methodId = await this.generateMethodId();
      
      // Create TOTP method
      const method: MfaMethod = {
        id: methodId,
        type: MfaType.TOTP,
        createdAt: new Date(),
        lastUsedAt: null,
        isVerified: false,
        status: MfaStatus.PENDING,
        data: {
          secret,
          accountName,
          issuer: issuer || this.config.totp!.issuer
        }
      };
      
      // Store method
      await this.addMethodToUser(user.id, method);
      
      // Generate TOTP URI
      const totpUri = authenticator.keyuri(
        accountName,
        issuer || this.config.totp!.issuer,
        secret
      );
      
      return {
        methodId,
        secret,
        uri: totpUri
      };
    } catch (error) {
      throw new AppError(
        'Failed to setup TOTP method',
        500,
        { code: ErrorCode.MFA_SETUP_FAILED, cause: error }
      );
    }
  }
  
  /**
   * Setup SMS MFA method
   */
  async setupSmsMethod(params: SmsSetupParams): Promise<MfaSetupResponse> {
    const { user, phoneNumber } = params;
    
    try {
      // Validate phone number format (simple validation)
      if (!this.isValidPhoneNumber(phoneNumber)) {
        throw new AppError(
          'Invalid phone number format',
          400,
          { code: ErrorCode.INVALID_INPUT }
        );
      }
      
      // Create method ID
      const methodId = await this.generateMethodId();
      
      // Generate verification code
      const code = await this.generateOtpCode(this.config.sms!.codeLength!);
      
      // Create SMS method
      const method: MfaMethod = {
        id: methodId,
        type: MfaType.SMS,
        createdAt: new Date(),
        lastUsedAt: null,
        isVerified: false,
        status: MfaStatus.PENDING,
        data: {
          phoneNumber,
          hashedPhoneNumber: this.encryptionService.hash({ data: phoneNumber })
        }
      };
      
      // Store method
      await this.addMethodToUser(user.id, method);
      
      // Store code for verification (typically would send SMS here)
      const expiresAt = Math.floor(Date.now() / 1000) + this.config.sms!.codeExpirationSeconds;
      this.pendingOtpCodes.set(`${methodId}:${user.id}`, { code, expiresAt });
      
      // In a real system, we would send the SMS here
      console.log(`[MFA] SMS Code for ${phoneNumber}: ${code}`);
      
      return {
        methodId,
        destination: this.maskPhoneNumber(phoneNumber),
        expiresAt: new Date(expiresAt * 1000)
      };
    } catch (error) {
      throw new AppError(
        'Failed to setup SMS method',
        error instanceof AppError ? error.httpStatus : 500,
        { code: error instanceof AppError ? error.code : ErrorCode.MFA_SETUP_FAILED, cause: error }
      );
    }
  }
  
  /**
   * Setup Email MFA method
   */
  async setupEmailMethod(params: EmailSetupParams): Promise<MfaSetupResponse> {
    const { user, email } = params;
    
    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        throw new AppError(
          'Invalid email format',
          400,
          { code: ErrorCode.INVALID_INPUT }
        );
      }
      
      // Create method ID
      const methodId = await this.generateMethodId();
      
      // Generate verification code
      const code = await this.generateOtpCode(this.config.email!.codeLength!);
      
      // Create Email method
      const method: MfaMethod = {
        id: methodId,
        type: MfaType.EMAIL,
        createdAt: new Date(),
        lastUsedAt: null,
        isVerified: false,
        status: MfaStatus.PENDING,
        data: {
          email,
          hashedEmail: this.encryptionService.hash({ data: email.toLowerCase() })
        }
      };
      
      // Store method
      await this.addMethodToUser(user.id, method);
      
      // Store code for verification (typically would send email here)
      const expiresAt = Math.floor(Date.now() / 1000) + this.config.email!.codeExpirationSeconds;
      this.pendingOtpCodes.set(`${methodId}:${user.id}`, { code, expiresAt });
      
      // In a real system, we would send the email here
      console.log(`[MFA] Email Code for ${email}: ${code}`);
      
      return {
        methodId,
        destination: this.maskEmail(email),
        expiresAt: new Date(expiresAt * 1000)
      };
    } catch (error) {
      throw new AppError(
        'Failed to setup Email method',
        error instanceof AppError ? error.httpStatus : 500,
        { code: error instanceof AppError ? error.code : ErrorCode.MFA_SETUP_FAILED, cause: error }
      );
    }
  }
  
  /**
   * Verify MFA method
   */
  async verifyMethod(params: MfaVerificationParams): Promise<MfaVerificationResponse> {
    const { user, methodId, code, type } = params;
    
    try {
      // Find method
      const method = await this.getUserMethod(user.id, methodId);
      
      if (!method) {
        throw new AppError(
          'MFA method not found',
          404,
          { code: ErrorCode.NOT_FOUND }
        );
      }
      
      // Check method type
      if (method.type !== type) {
        throw new AppError(
          'MFA method type mismatch',
          400,
          { code: ErrorCode.INVALID_INPUT }
        );
      }
      
      let isVerified = false;
      
      // Verify based on method type
      switch (method.type) {
        case MfaType.TOTP:
          isVerified = await this.verifyTotpCode({
            user,
            methodId,
            code
          });
          break;
          
        case MfaType.SMS:
          isVerified = await this.verifyOtpCode({
            user,
            methodId,
            code,
            expirationSeconds: this.config.sms!.codeExpirationSeconds
          });
          break;
          
        case MfaType.EMAIL:
          isVerified = await this.verifyOtpCode({
            user,
            methodId,
            code,
            expirationSeconds: this.config.email!.codeExpirationSeconds
          });
          break;
          
        default:
          throw new AppError(
            'Unsupported MFA method type',
            400,
            { code: ErrorCode.UNSUPPORTED_OPERATION }
          );
      }
      
      if (isVerified) {
        // Update method status
        method.isVerified = true;
        method.status = MfaStatus.ACTIVE;
        method.lastUsedAt = new Date();
        
        // Store updated method
        await this.updateUserMethod(user.id, method);
        
        return {
          verified: true,
          methodId,
          type: method.type
        };
      } else {
        throw new AppError(
          'Invalid verification code',
          400,
          { code: ErrorCode.INVALID_CREDENTIALS }
        );
      }
    } catch (error) {
      throw new AppError(
        error instanceof AppError ? error.message : 'Failed to verify MFA method',
        error instanceof AppError ? error.httpStatus : 500,
        {
          code: error instanceof AppError ? error.code : ErrorCode.MFA_VERIFICATION_FAILED,
          cause: error
        }
      );
    }
  }
  
  /**
   * Verify TOTP code
   */
  private async verifyTotpCode(params: TotpVerificationParams): Promise<boolean> {
    const { user, methodId, code } = params;
    
    try {
      // Find method
      const method = await this.getUserMethod(user.id, methodId);
      
      if (!method || method.type !== MfaType.TOTP) {
        return false;
      }
      
      // Verify TOTP code
      const secret = method.data.secret;
      return authenticator.verify({ token: code, secret });
    } catch (error) {
      console.error('TOTP verification error:', error);
      return false;
    }
  }
  
  /**
   * Verify SMS/Email code
   */
  private async verifyOtpCode(params: CodeVerificationParams): Promise<boolean> {
    const { user, methodId, code, expirationSeconds } = params;
    
    try {
      // Get stored code
      const codeKey = `${methodId}:${user.id}`;
      const storedCode = this.pendingOtpCodes.get(codeKey);
      
      if (!storedCode) {
        return false;
      }
      
      // Check if code has expired
      const now = Math.floor(Date.now() / 1000);
      if (now > storedCode.expiresAt) {
        this.pendingOtpCodes.delete(codeKey);
        return false;
      }
      
      // Verify code
      const isValid = storedCode.code === code;
      
      if (isValid) {
        // Remove code after successful verification
        this.pendingOtpCodes.delete(codeKey);
      }
      
      return isValid;
    } catch (error) {
      console.error('OTP verification error:', error);
      return false;
    }
  }
  
  /**
   * Remove MFA method
   */
  async removeMethod(userId: string, methodId: string): Promise<boolean> {
    try {
      // Find user methods
      const methods = this.userMethods.get(userId) || [];
      
      // Find method index
      const methodIndex = methods.findIndex(m => m.id === methodId);
      
      if (methodIndex === -1) {
        throw new AppError(
          'MFA method not found',
          404,
          { code: ErrorCode.NOT_FOUND }
        );
      }
      
      // Remove method
      methods.splice(methodIndex, 1);
      this.userMethods.set(userId, methods);
      
      return true;
    } catch (error) {
      throw new AppError(
        error instanceof AppError ? error.message : 'Failed to remove MFA method',
        error instanceof AppError ? error.httpStatus : 500,
        {
          code: error instanceof AppError ? error.code : ErrorCode.OPERATION_FAILED,
          cause: error
        }
      );
    }
  }
  
  /**
   * Request new verification code for SMS/Email methods
   */
  async requestNewCode(userId: string, methodId: string): Promise<MfaSetupResponse> {
    try {
      // Find method
      const method = await this.getUserMethod(userId, methodId);
      
      if (!method) {
        throw new AppError(
          'MFA method not found',
          404,
          { code: ErrorCode.NOT_FOUND }
        );
      }
      
      // Check method type
      if (method.type !== MfaType.SMS && method.type !== MfaType.EMAIL) {
        throw new AppError(
          'Cannot generate code for this method type',
          400,
          { code: ErrorCode.INVALID_OPERATION }
        );
      }
      
      // Generate new code
      const codeLength = method.type === MfaType.SMS
        ? this.config.sms!.codeLength!
        : this.config.email!.codeLength!;
        
      const expirationSeconds = method.type === MfaType.SMS
        ? this.config.sms!.codeExpirationSeconds
        : this.config.email!.codeExpirationSeconds;
      
      const code = await this.generateOtpCode(codeLength);
      
      // Store code for verification
      const expiresAt = Math.floor(Date.now() / 1000) + expirationSeconds;
      this.pendingOtpCodes.set(`${methodId}:${userId}`, { code, expiresAt });
      
      let destination = '';
      
      // In a real system, we would send the code via SMS or Email here
      if (method.type === MfaType.SMS) {
        const phoneNumber = method.data.phoneNumber;
        console.log(`[MFA] SMS Code for ${phoneNumber}: ${code}`);
        destination = this.maskPhoneNumber(phoneNumber);
      } else if (method.type === MfaType.EMAIL) {
        const email = method.data.email;
        console.log(`[MFA] Email Code for ${email}: ${code}`);
        destination = this.maskEmail(email);
      }
      
      return {
        methodId,
        destination,
        expiresAt: new Date(expiresAt * 1000)
      };
    } catch (error) {
      throw new AppError(
        error instanceof AppError ? error.message : 'Failed to generate new verification code',
        error instanceof AppError ? error.httpStatus : 500,
        {
          code: error instanceof AppError ? error.code : ErrorCode.OPERATION_FAILED,
          cause: error
        }
      );
    }
  }
  
  /**
   * Generate method ID
   */
  private async generateMethodId(): Promise<string> {
    return this.encryptionService.generateUuid();
  }
  
  /**
   * Generate OTP code
   */
  private async generateOtpCode(length: number): Promise<string> {
    return this.encryptionService.generateOtp(length);
  }
  
  /**
   * Get user method
   */
  private async getUserMethod(userId: string, methodId: string): Promise<MfaMethod | undefined> {
    const methods = this.userMethods.get(userId) || [];
    return methods.find(m => m.id === methodId);
  }
  
  /**
   * Add method to user
   */
  private async addMethodToUser(userId: string, method: MfaMethod): Promise<void> {
    const methods = this.userMethods.get(userId) || [];
    methods.push(method);
    this.userMethods.set(userId, methods);
  }
  
  /**
   * Update user method
   */
  private async updateUserMethod(userId: string, method: MfaMethod): Promise<void> {
    const methods = this.userMethods.get(userId) || [];
    const index = methods.findIndex(m => m.id === method.id);
    
    if (index !== -1) {
      methods[index] = method;
      this.userMethods.set(userId, methods);
    }
  }
  
  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Simple validation - in a real system, use a proper library
    return /^\+?[1-9]\d{1,14}$/.test(phoneNumber);
  }
  
  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    // Simple validation - in a real system, use a proper library
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  /**
   * Mask phone number for display
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) return phoneNumber;
    
    const lastFour = phoneNumber.slice(-4);
    const mask = '*'.repeat(phoneNumber.length - 4);
    return mask + lastFour;
  }
  
  /**
   * Mask email for display
   */
  private maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    
    if (!username || !domain) return email;
    
    let maskedUsername = '';
    
    if (username.length <= 2) {
      maskedUsername = username;
    } else {
      maskedUsername = username[0] + '*'.repeat(username.length - 2) + username.slice(-1);
    }
    
    return `${maskedUsername}@${domain}`;
  }
}