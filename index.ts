/**
 * User Directory Service
 * 
 * This microservice handles user authentication, authorization, and account management:
 * - User account management (separate from person records)
 * - Authentication and authorization
 * - Role and permission management
 * - Multi-factor authentication
 * - Account security and audit
 */

import { BaseService } from '../../common/base-service';
import { Request, Response, NextFunction } from 'express';
import { ServiceClient } from '../../common/service-client';
import { z } from 'zod';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and, like, or, ne } from 'drizzle-orm';
import ws from 'ws';
import * as schema from '../../../shared/schema';
import { createHash, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

// Load environment variables
dotenv.config();

// Apply web socket for Neon database
neonConfig.webSocketConstructor = ws;

// Promisify scrypt
const scryptAsync = promisify(scrypt);

/**
 * Hash a password using scrypt
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Compare a password with a stored hash
 */
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = await scryptAsync(supplied, salt, 64) as Buffer;
  return hashedBuf.equals(suppliedBuf);
}

// User schema for validation
const UserCreateSchema = z.object({
  userId: z.string().optional(), // Auto-generated if not provided
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['admin', 'provider', 'patient', 'staff']).default('patient'),
  personId: z.number().optional(),
  preferredLanguage: z.string().default('en'),
  timezone: z.string().default('UTC'),
  mfaEnabled: z.boolean().default(false),
  mfaSecret: z.string().optional(),
  authMethod: z.enum(['password', 'oauth', 'saml']).default('password'),
  lastLogin: z.string().datetime().optional(),
  profileImageUrl: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

const UserUpdateSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'provider', 'patient', 'staff']).optional(),
  personId: z.number().optional(),
  preferredLanguage: z.string().optional(),
  timezone: z.string().optional(),
  mfaEnabled: z.boolean().optional(),
  mfaSecret: z.string().optional(),
  authMethod: z.enum(['password', 'oauth', 'saml']).optional(),
  lastLogin: z.string().datetime().optional(),
  profileImageUrl: z.string().optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
  rememberMe: z.boolean().default(false)
});

const MfaVerifySchema = z.object({
  userId: z.string(),
  token: z.string().length(6)
});

const PasswordResetRequestSchema = z.object({
  email: z.string().email()
});

const PasswordResetSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8)
});

/**
 * User Directory Service Class
 */
class UserDirectoryService extends BaseService {
  private serviceClient: ServiceClient;
  private db: any;
  
  constructor() {
    // Initialize base service
    super({
      name: 'user-directory',
      version: '1.0.0',
      description: 'User Directory Service for identity management',
      port: parseInt(process.env.USER_DIRECTORY_PORT || '3008'),
      environment: process.env.NODE_ENV as any || 'development',
      database: {
        url: process.env.DATABASE_URL || ''
      },
      dependencies: {
        services: ['person-directory'],
        databases: [],
        external: []
      }
    });
    
    // Initialize service client for inter-service communication
    this.serviceClient = new ServiceClient({
      gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:3000'
    });

    // Initialize database connection
    if (process.env.DATABASE_URL) {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      this.db = drizzle(pool, { schema });
    }
  }
  
  /**
   * Initialize User Directory service
   */
  protected async initialize(): Promise<void> {
    // Nothing specific to initialize
  }
  
  /**
   * Register routes
   */
  protected registerRoutes(): void {
    // Base endpoint
    this.app.get('/', (req: Request, res: Response) => {
      return res.json({
        service: 'User Directory',
        version: this.config.version,
        description: this.config.description,
        endpoints: [
          '/users',
          '/users/:id',
          '/users/search',
          '/users/:id/person',
          '/auth/login',
          '/auth/logout',
          '/auth/verify-mfa',
          '/auth/reset-password',
          '/auth/profile',
          '/roles',
          '/permissions'
        ]
      });
    });
    
    // User management endpoints
    this.app.get('/users', this.requireAuth, this.getUsersHandler.bind(this));
    this.app.post('/users', this.requireAuth, this.createUserHandler.bind(this));
    this.app.get('/users/:id', this.requireAuth, this.getUserHandler.bind(this));
    this.app.put('/users/:id', this.requireAuth, this.updateUserHandler.bind(this));
    this.app.delete('/users/:id', this.requireAuth, this.deleteUserHandler.bind(this));
    this.app.post('/users/search', this.requireAuth, this.searchUsersHandler.bind(this));
    
    // Person linking
    this.app.post('/users/:id/person', this.requireAuth, this.linkPersonHandler.bind(this));
    this.app.delete('/users/:id/person', this.requireAuth, this.unlinkPersonHandler.bind(this));
    
    // Authentication endpoints
    this.app.post('/auth/login', this.loginHandler.bind(this));
    this.app.post('/auth/logout', this.logoutHandler.bind(this));
    this.app.post('/auth/verify-mfa', this.verifyMfaHandler.bind(this));
    this.app.post('/auth/reset-password', this.resetPasswordHandler.bind(this));
    this.app.get('/auth/profile', this.requireAuth, this.getUserProfileHandler.bind(this));
    
    // Reference data
    this.app.get('/roles', this.requireAuth, this.getRolesHandler.bind(this));
    this.app.get('/permissions', this.requireAuth, this.getPermissionsHandler.bind(this));
  }

  /**
   * Middleware to require authentication
   */
  private requireAuth(req: Request, res: Response, next: NextFunction): void {
    // TODO: Implement proper authentication middleware
    // This is a placeholder for now
    next();
  }
  
  /**
   * Get all users
   */
  private async getUsersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      // Get active users
      const users = await this.db.select({
        id: schema.userDirectory.id,
        userId: schema.userDirectory.userId,
        username: schema.userDirectory.username,
        email: schema.userDirectory.email,
        name: schema.userDirectory.name,
        role: schema.userDirectory.role,
        personId: schema.userDirectory.personId,
        preferredLanguage: schema.userDirectory.preferredLanguage,
        timezone: schema.userDirectory.timezone,
        mfaEnabled: schema.userDirectory.mfaEnabled,
        authMethod: schema.userDirectory.authMethod,
        lastLogin: schema.userDirectory.lastLogin,
        profileImageUrl: schema.userDirectory.profileImageUrl,
        active: schema.userDirectory.active,
        created: schema.userDirectory.created,
        updated: schema.userDirectory.updated
      })
      .from(schema.userDirectory)
      .where(eq(schema.userDirectory.active, true))
      .limit(limit)
      .offset(offset);
      
      // Get total count for pagination
      const [{ count }] = await this.db.select({ 
        count: sql`count(*)` 
      })
      .from(schema.userDirectory)
      .where(eq(schema.userDirectory.active, true));
      
      return res.json({
        data: users,
        pagination: {
          page,
          limit,
          total: Number(count),
          pages: Math.ceil(Number(count) / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Create a new user
   */
  private async createUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const userData = UserCreateSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await this.db.select()
        .from(schema.userDirectory)
        .where(
          or(
            eq(schema.userDirectory.username, userData.username),
            eq(schema.userDirectory.email, userData.email)
          )
        )
        .limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({ 
          error: 'Username or email already exists' 
        });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      // Generate unique user ID if not provided
      const userId = userData.userId || `user-${uuidv4()}`;
      
      // If personId is provided, check if it exists
      if (userData.personId) {
        try {
          const personResponse = await this.serviceClient.get(`/person-directory/people/${userData.personId}`);
          if (!personResponse.data) {
            return res.status(400).json({ 
              error: `Person with ID ${userData.personId} not found` 
            });
          }
        } catch (error) {
          console.error(`Failed to verify person ID ${userData.personId}:`, error);
          return res.status(400).json({ 
            error: `Failed to verify person ID: ${userData.personId}` 
          });
        }
      }
      
      // Create user
      const [newUser] = await this.db.insert(schema.userDirectory)
        .values({
          userId,
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
          personId: userData.personId,
          preferredLanguage: userData.preferredLanguage,
          timezone: userData.timezone,
          mfaEnabled: userData.mfaEnabled,
          mfaSecret: userData.mfaSecret,
          authMethod: userData.authMethod,
          lastLogin: userData.lastLogin ? new Date(userData.lastLogin) : null,
          profileImageUrl: userData.profileImageUrl,
          metadata: userData.metadata,
          active: true,
          created: new Date(),
          updated: new Date()
        })
        .returning({
          id: schema.userDirectory.id,
          userId: schema.userDirectory.userId,
          username: schema.userDirectory.username,
          email: schema.userDirectory.email,
          name: schema.userDirectory.name,
          role: schema.userDirectory.role,
          personId: schema.userDirectory.personId,
          preferredLanguage: schema.userDirectory.preferredLanguage,
          timezone: schema.userDirectory.timezone,
          mfaEnabled: schema.userDirectory.mfaEnabled,
          authMethod: schema.userDirectory.authMethod,
          lastLogin: schema.userDirectory.lastLogin,
          profileImageUrl: schema.userDirectory.profileImageUrl,
          active: schema.userDirectory.active,
          created: schema.userDirectory.created,
          updated: schema.userDirectory.updated
        });
      
      return res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get a user by ID
   */
  private async getUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Find user by ID or userId
      const [user] = await this.db.select({
        id: schema.userDirectory.id,
        userId: schema.userDirectory.userId,
        username: schema.userDirectory.username,
        email: schema.userDirectory.email,
        name: schema.userDirectory.name,
        role: schema.userDirectory.role,
        personId: schema.userDirectory.personId,
        preferredLanguage: schema.userDirectory.preferredLanguage,
        timezone: schema.userDirectory.timezone,
        mfaEnabled: schema.userDirectory.mfaEnabled,
        authMethod: schema.userDirectory.authMethod,
        lastLogin: schema.userDirectory.lastLogin,
        profileImageUrl: schema.userDirectory.profileImageUrl,
        active: schema.userDirectory.active,
        created: schema.userDirectory.created,
        updated: schema.userDirectory.updated
      })
      .from(schema.userDirectory)
      .where(
        or(
          eq(schema.userDirectory.id, parseInt(id)),
          eq(schema.userDirectory.userId, id)
        )
      );
      
      if (!user) {
        return res.status(404).json({ 
          error: `User with ID ${id} not found` 
        });
      }
      
      // If the user has a linked person, get person details
      let person = null;
      if (user.personId) {
        try {
          const personResponse = await this.serviceClient.get(`/person-directory/people/${user.personId}`);
          person = personResponse.data;
        } catch (error) {
          console.error(`Failed to fetch person details for ID ${user.personId}:`, error);
        }
      }
      
      return res.json({
        user,
        person
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update a user
   */
  private async updateUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Validate request body
      const updateData = UserUpdateSchema.parse(req.body);
      
      // Find user
      const [existingUser] = await this.db.select()
        .from(schema.userDirectory)
        .where(
          or(
            eq(schema.userDirectory.id, parseInt(id)),
            eq(schema.userDirectory.userId, id)
          )
        );
      
      if (!existingUser) {
        return res.status(404).json({ 
          error: `User with ID ${id} not found` 
        });
      }
      
      // If username or email is being updated, check for duplicates
      if (updateData.username || updateData.email) {
        const duplicateQuery = [];
        
        if (updateData.username) {
          duplicateQuery.push(
            and(
              eq(schema.userDirectory.username, updateData.username),
              ne(schema.userDirectory.id, existingUser.id)
            )
          );
        }
        
        if (updateData.email) {
          duplicateQuery.push(
            and(
              eq(schema.userDirectory.email, updateData.email),
              ne(schema.userDirectory.id, existingUser.id)
            )
          );
        }
        
        const duplicates = await this.db.select()
          .from(schema.userDirectory)
          .where(or(...duplicateQuery))
          .limit(1);
        
        if (duplicates.length > 0) {
          return res.status(400).json({ 
            error: 'Username or email already in use' 
          });
        }
      }
      
      // If personId is being updated, check if it exists
      if (updateData.personId && updateData.personId !== existingUser.personId) {
        try {
          const personResponse = await this.serviceClient.get(`/person-directory/people/${updateData.personId}`);
          if (!personResponse.data) {
            return res.status(400).json({ 
              error: `Person with ID ${updateData.personId} not found` 
            });
          }
        } catch (error) {
          console.error(`Failed to verify person ID ${updateData.personId}:`, error);
          return res.status(400).json({ 
            error: `Failed to verify person ID: ${updateData.personId}` 
          });
        }
      }
      
      // Prepare update data
      const updateValues: any = {
        ...updateData,
        updated: new Date()
      };
      
      // If password is provided, hash it
      if (updateData.password) {
        updateValues.password = await hashPassword(updateData.password);
      }
      
      // Convert lastLogin to Date object if provided
      if (updateData.lastLogin) {
        updateValues.lastLogin = new Date(updateData.lastLogin);
      }
      
      // Update user
      const [updatedUser] = await this.db.update(schema.userDirectory)
        .set(updateValues)
        .where(
          or(
            eq(schema.userDirectory.id, parseInt(id)),
            eq(schema.userDirectory.userId, id)
          )
        )
        .returning({
          id: schema.userDirectory.id,
          userId: schema.userDirectory.userId,
          username: schema.userDirectory.username,
          email: schema.userDirectory.email,
          name: schema.userDirectory.name,
          role: schema.userDirectory.role,
          personId: schema.userDirectory.personId,
          preferredLanguage: schema.userDirectory.preferredLanguage,
          timezone: schema.userDirectory.timezone,
          mfaEnabled: schema.userDirectory.mfaEnabled,
          authMethod: schema.userDirectory.authMethod,
          lastLogin: schema.userDirectory.lastLogin,
          profileImageUrl: schema.userDirectory.profileImageUrl,
          active: schema.userDirectory.active,
          created: schema.userDirectory.created,
          updated: schema.userDirectory.updated
        });
      
      return res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Link a user to a person
   */
  private async linkPersonHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { personId } = req.body;
      
      if (!personId) {
        return res.status(400).json({ 
          error: 'Person ID is required' 
        });
      }
      
      // Find user
      const [existingUser] = await this.db.select()
        .from(schema.userDirectory)
        .where(
          or(
            eq(schema.userDirectory.id, parseInt(id)),
            eq(schema.userDirectory.userId, id)
          )
        );
      
      if (!existingUser) {
        return res.status(404).json({ 
          error: `User with ID ${id} not found` 
        });
      }
      
      // Verify the person exists
      try {
        const personResponse = await this.serviceClient.get(`/person-directory/people/${personId}`);
        if (!personResponse.data) {
          return res.status(400).json({ 
            error: `Person with ID ${personId} not found` 
          });
        }
      } catch (error) {
        console.error(`Failed to verify person ID ${personId}:`, error);
        return res.status(400).json({ 
          error: `Failed to verify person ID: ${personId}` 
        });
      }
      
      // Update user with personId
      const [updatedUser] = await this.db.update(schema.userDirectory)
        .set({ 
          personId: parseInt(personId),
          updated: new Date()
        })
        .where(
          or(
            eq(schema.userDirectory.id, parseInt(id)),
            eq(schema.userDirectory.userId, id)
          )
        )
        .returning({
          id: schema.userDirectory.id,
          userId: schema.userDirectory.userId,
          username: schema.userDirectory.username,
          email: schema.userDirectory.email,
          name: schema.userDirectory.name,
          role: schema.userDirectory.role,
          personId: schema.userDirectory.personId,
          preferredLanguage: schema.userDirectory.preferredLanguage,
          timezone: schema.userDirectory.timezone,
          mfaEnabled: schema.userDirectory.mfaEnabled,
          authMethod: schema.userDirectory.authMethod,
          lastLogin: schema.userDirectory.lastLogin,
          profileImageUrl: schema.userDirectory.profileImageUrl,
          active: schema.userDirectory.active,
          created: schema.userDirectory.created,
          updated: schema.userDirectory.updated
        });
      
      return res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Unlink a user from a person
   */
  private async unlinkPersonHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Find user
      const [existingUser] = await this.db.select()
        .from(schema.userDirectory)
        .where(
          or(
            eq(schema.userDirectory.id, parseInt(id)),
            eq(schema.userDirectory.userId, id)
          )
        );
      
      if (!existingUser) {
        return res.status(404).json({ 
          error: `User with ID ${id} not found` 
        });
      }
      
      if (!existingUser.personId) {
        return res.status(400).json({ 
          error: 'User is not linked to any person' 
        });
      }
      
      // Update user to remove personId
      const [updatedUser] = await this.db.update(schema.userDirectory)
        .set({ 
          personId: null,
          updated: new Date()
        })
        .where(
          or(
            eq(schema.userDirectory.id, parseInt(id)),
            eq(schema.userDirectory.userId, id)
          )
        )
        .returning({
          id: schema.userDirectory.id,
          userId: schema.userDirectory.userId,
          username: schema.userDirectory.username,
          email: schema.userDirectory.email,
          name: schema.userDirectory.name,
          role: schema.userDirectory.role,
          personId: schema.userDirectory.personId,
          preferredLanguage: schema.userDirectory.preferredLanguage,
          timezone: schema.userDirectory.timezone,
          mfaEnabled: schema.userDirectory.mfaEnabled,
          authMethod: schema.userDirectory.authMethod,
          lastLogin: schema.userDirectory.lastLogin,
          profileImageUrl: schema.userDirectory.profileImageUrl,
          active: schema.userDirectory.active,
          created: schema.userDirectory.created,
          updated: schema.userDirectory.updated
        });
      
      return res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Delete a user
   */
  private async deleteUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Find user
      const [existingUser] = await this.db.select()
        .from(schema.userDirectory)
        .where(
          or(
            eq(schema.userDirectory.id, parseInt(id)),
            eq(schema.userDirectory.userId, id)
          )
        );
      
      if (!existingUser) {
        return res.status(404).json({ 
          error: `User with ID ${id} not found` 
        });
      }
      
      // In a real system, we would just mark the user as inactive
      // rather than physically deleting them
      const [updatedUser] = await this.db.update(schema.userDirectory)
        .set({ 
          active: false,
          updated: new Date()
        })
        .where(
          or(
            eq(schema.userDirectory.id, parseInt(id)),
            eq(schema.userDirectory.userId, id)
          )
        )
        .returning({
          id: schema.userDirectory.id,
          userId: schema.userDirectory.userId,
          active: schema.userDirectory.active,
          updated: schema.userDirectory.updated
        });
      
      return res.json({
        message: 'User deactivated successfully',
        user: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Search users
   */
  private async searchUsersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, role, active = true } = req.body;
      
      // Build search conditions
      const conditions = [];
      
      if (active !== undefined) {
        conditions.push(eq(schema.userDirectory.active, !!active));
      }
      
      if (role) {
        conditions.push(eq(schema.userDirectory.role, role));
      }
      
      if (query) {
        conditions.push(
          or(
            like(schema.userDirectory.username, `%${query}%`),
            like(schema.userDirectory.email, `%${query}%`),
            like(schema.userDirectory.name, `%${query}%`)
          )
        );
      }
      
      // Get pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      // Search users
      const users = await this.db.select({
        id: schema.userDirectory.id,
        userId: schema.userDirectory.userId,
        username: schema.userDirectory.username,
        email: schema.userDirectory.email,
        name: schema.userDirectory.name,
        role: schema.userDirectory.role,
        personId: schema.userDirectory.personId,
        preferredLanguage: schema.userDirectory.preferredLanguage,
        timezone: schema.userDirectory.timezone,
        mfaEnabled: schema.userDirectory.mfaEnabled,
        authMethod: schema.userDirectory.authMethod,
        lastLogin: schema.userDirectory.lastLogin,
        profileImageUrl: schema.userDirectory.profileImageUrl,
        active: schema.userDirectory.active,
        created: schema.userDirectory.created,
        updated: schema.userDirectory.updated
      })
      .from(schema.userDirectory)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);
      
      // Get total count for pagination
      const [{ count }] = await this.db.select({ 
        count: sql`count(*)` 
      })
      .from(schema.userDirectory)
      .where(and(...conditions));
      
      return res.json({
        data: users,
        pagination: {
          page,
          limit,
          total: Number(count),
          pages: Math.ceil(Number(count) / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Handle user login
   */
  private async loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate login data
      const loginData = LoginSchema.parse(req.body);
      
      // Find user by username
      const [user] = await this.db.select()
        .from(schema.userDirectory)
        .where(eq(schema.userDirectory.username, loginData.username))
        .limit(1);
      
      if (!user) {
        return res.status(401).json({ 
          error: 'Invalid username or password' 
        });
      }
      
      // Check if user is active
      if (!user.active) {
        return res.status(401).json({ 
          error: 'Account is inactive' 
        });
      }
      
      // Verify password
      const passwordValid = await comparePasswords(loginData.password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ 
          error: 'Invalid username or password' 
        });
      }
      
      // Check if MFA is required
      if (user.mfaEnabled) {
        return res.status(200).json({
          requiresMfa: true,
          userId: user.userId,
          message: 'MFA verification required'
        });
      }
      
      // Update last login time
      await this.db.update(schema.userDirectory)
        .set({ 
          lastLogin: new Date(),
          updated: new Date()
        })
        .where(eq(schema.userDirectory.id, user.id));
      
      // Return user data (excluding password)
      return res.json({
        id: user.id,
        userId: user.userId,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        personId: user.personId,
        preferredLanguage: user.preferredLanguage,
        timezone: user.timezone,
        mfaEnabled: user.mfaEnabled,
        authMethod: user.authMethod,
        lastLogin: new Date(),
        profileImageUrl: user.profileImageUrl
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Handle user logout
   */
  private async logoutHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // In a real application, we would invalidate the session or JWT token
      // For this demo, we'll just return a success message
      return res.json({ 
        message: 'Logged out successfully' 
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Verify MFA code
   */
  private async verifyMfaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate MFA data
      const mfaData = MfaVerifySchema.parse(req.body);
      
      // Find user
      const [user] = await this.db.select()
        .from(schema.userDirectory)
        .where(eq(schema.userDirectory.userId, mfaData.userId))
        .limit(1);
      
      if (!user || !user.active) {
        return res.status(401).json({ 
          error: 'Invalid user ID' 
        });
      }
      
      if (!user.mfaEnabled || !user.mfaSecret) {
        return res.status(400).json({ 
          error: 'MFA not enabled for this user' 
        });
      }
      
      // In a real application, we would verify the MFA token against the secret
      // For this demo, we'll just accept any 6-digit code
      const valid = mfaData.token.length === 6 && /^\d+$/.test(mfaData.token);
      
      if (!valid) {
        return res.status(401).json({ 
          error: 'Invalid MFA token' 
        });
      }
      
      // Update last login time
      await this.db.update(schema.userDirectory)
        .set({ 
          lastLogin: new Date(),
          updated: new Date()
        })
        .where(eq(schema.userDirectory.id, user.id));
      
      // Return user data (excluding password)
      return res.json({
        id: user.id,
        userId: user.userId,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        personId: user.personId,
        preferredLanguage: user.preferredLanguage,
        timezone: user.timezone,
        mfaEnabled: user.mfaEnabled,
        authMethod: user.authMethod,
        lastLogin: new Date(),
        profileImageUrl: user.profileImageUrl
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Handle password reset
   */
  private async resetPasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if this is a password reset request or a reset completion
      if (req.body.email) {
        // This is a reset request
        const resetRequestData = PasswordResetRequestSchema.parse(req.body);
        
        // Find user by email
        const [user] = await this.db.select()
          .from(schema.userDirectory)
          .where(eq(schema.userDirectory.email, resetRequestData.email))
          .limit(1);
        
        if (!user || !user.active) {
          // We still return success to avoid revealing which emails are valid
          return res.json({ 
            message: 'If your email is registered, you will receive a password reset link' 
          });
        }
        
        // In a real application, we would:
        // 1. Generate a secure token
        // 2. Store it in the database with an expiration time
        // 3. Send an email with a reset link containing the token
        
        // For this demo, we'll just return a mock token
        const resetToken = createHash('sha256')
          .update(`${user.userId}${Date.now()}`)
          .digest('hex');
        
        return res.json({
          message: 'If your email is registered, you will receive a password reset link',
          // Include this for testing purposes only
          _debug: {
            resetToken,
            userId: user.userId
          }
        });
      } else {
        // This is a reset completion
        const resetData = PasswordResetSchema.parse(req.body);
        
        // In a real application, we would:
        // 1. Validate the token against stored tokens
        // 2. Check if the token is expired
        // 3. Find the user associated with the token
        
        // For this demo, we'll assume the token contains the userId (mock implementation)
        const userId = 'user-1'; // Mock user ID extraction from token
        
        // Find user
        const [user] = await this.db.select()
          .from(schema.userDirectory)
          .where(eq(schema.userDirectory.userId, userId))
          .limit(1);
        
        if (!user || !user.active) {
          return res.status(400).json({ 
            error: 'Invalid or expired reset token' 
          });
        }
        
        // Hash the new password
        const hashedPassword = await hashPassword(resetData.newPassword);
        
        // Update user's password
        await this.db.update(schema.userDirectory)
          .set({ 
            password: hashedPassword,
            updated: new Date()
          })
          .where(eq(schema.userDirectory.id, user.id));
        
        return res.json({ 
          message: 'Password reset successful' 
        });
      }
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get user profile
   */
  private async getUserProfileHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // In a real application, we would get the user ID from the authentication token
      // For this demo, we'll use a mock user ID
      const userId = 'user-1'; // Mock user ID
      
      // Find user
      const [user] = await this.db.select({
        id: schema.userDirectory.id,
        userId: schema.userDirectory.userId,
        username: schema.userDirectory.username,
        email: schema.userDirectory.email,
        name: schema.userDirectory.name,
        role: schema.userDirectory.role,
        personId: schema.userDirectory.personId,
        preferredLanguage: schema.userDirectory.preferredLanguage,
        timezone: schema.userDirectory.timezone,
        mfaEnabled: schema.userDirectory.mfaEnabled,
        authMethod: schema.userDirectory.authMethod,
        lastLogin: schema.userDirectory.lastLogin,
        profileImageUrl: schema.userDirectory.profileImageUrl
      })
      .from(schema.userDirectory)
      .where(eq(schema.userDirectory.userId, userId))
      .limit(1);
      
      if (!user) {
        return res.status(404).json({ 
          error: 'User profile not found' 
        });
      }
      
      // If the user has a linked person, get person details
      let person = null;
      if (user.personId) {
        try {
          const personResponse = await this.serviceClient.get(`/person-directory/people/${user.personId}`);
          person = personResponse.data;
        } catch (error) {
          console.error(`Failed to fetch person details for ID ${user.personId}:`, error);
        }
      }
      
      return res.json({
        user,
        person
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get available roles
   */
  private async getRolesHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // In a real system, these would be fetched from the database
      const roles = [
        { id: 'admin', name: 'Administrator', description: 'Full system access' },
        { id: 'provider', name: 'Healthcare Provider', description: 'Clinical staff access' },
        { id: 'patient', name: 'Patient', description: 'Patient portal access' },
        { id: 'staff', name: 'Staff', description: 'Administrative staff access' }
      ];
      
      return res.json(roles);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get available permissions
   */
  private async getPermissionsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // In a real system, these would be fetched from the database
      const permissions = [
        { id: 'user:read', name: 'Read Users', description: 'View user accounts' },
        { id: 'user:write', name: 'Modify Users', description: 'Create/update user accounts' },
        { id: 'user:delete', name: 'Delete Users', description: 'Deactivate user accounts' },
        { id: 'person:read', name: 'Read Persons', description: 'View person records' },
        { id: 'person:write', name: 'Modify Persons', description: 'Create/update person records' },
        { id: 'person:delete', name: 'Delete Persons', description: 'Deactivate person records' },
        { id: 'patient:read', name: 'Read Patients', description: 'View patient records' },
        { id: 'patient:write', name: 'Modify Patients', description: 'Create/update patient records' },
        { id: 'patient:delete', name: 'Delete Patients', description: 'Deactivate patient records' },
        { id: 'clinical:read', name: 'Read Clinical', description: 'View clinical data' },
        { id: 'clinical:write', name: 'Modify Clinical', description: 'Create/update clinical data' },
        { id: 'billing:read', name: 'Read Billing', description: 'View billing data' },
        { id: 'billing:write', name: 'Modify Billing', description: 'Create/update billing data' },
        { id: 'admin:full', name: 'Full Admin', description: 'Full administrative access' }
      ];
      
      return res.json(permissions);
    } catch (error) {
      next(error);
    }
  }
}

// If this file is run directly, start the service
if (require.main === module) {
  const userDirectoryService = new UserDirectoryService();
  
  userDirectoryService.start().catch(err => {
    console.error('[UserDirectoryService] Failed to start service:', err);
    process.exit(1);
  });
  
  // Handle process termination
  const handleShutdown = async () => {
    console.log('[UserDirectoryService] Shutting down...');
    try {
      await userDirectoryService.stop();
      process.exit(0);
    } catch (err) {
      console.error('[UserDirectoryService] Error during shutdown:', err);
      process.exit(1);
    }
  };
  
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}

// Export for testing and programmatic usage
export default UserDirectoryService;