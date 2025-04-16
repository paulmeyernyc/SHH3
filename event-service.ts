/**
 * Authentication Event Service
 * 
 * Handles security and audit events for authentication activities.
 */

import { AuditLog } from '../model';
import { IAuthStorage } from '../storage';
import { nanoid } from 'nanoid';

/**
 * User created event
 */
export interface UserCreatedEvent {
  userId: string;
  username: string;
  email: string;
  timestamp: string;
}

/**
 * User login event
 */
export interface UserLoginEvent {
  userId: string;
  username: string;
  provider?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

/**
 * User logout event
 */
export interface UserLogoutEvent {
  userId: string;
  timestamp: string;
}

/**
 * Login failed event
 */
export interface LoginFailedEvent {
  userId: string;
  username: string;
  attempts: number;
  accountLocked: boolean;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

/**
 * API key event
 */
export interface ApiKeyEvent {
  apiKeyId: string;
  userId: string;
  resource?: string;
  action?: string;
  timestamp: string;
}

/**
 * Role event
 */
export interface RoleEvent {
  userId: string;
  roleId: string;
  roleName: string;
  timestamp: string;
}

/**
 * Event log level
 */
export enum EventLogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Event handler interface
 */
export interface EventHandler {
  handleEvent(
    eventType: string, 
    eventData: any, 
    level: EventLogLevel
  ): Promise<void>;
}

/**
 * Event service configuration
 */
export interface EventServiceConfig {
  logToConsole?: boolean;
  logToStorage?: boolean;
  complianceMode?: boolean;  // Enable extra logging for HIPAA/GDPR
}

/**
 * Authentication event service
 */
export class AuthEventService {
  private storage: IAuthStorage;
  private config: EventServiceConfig;
  private handlers: EventHandler[] = [];

  constructor(storage: IAuthStorage, config: EventServiceConfig = {}) {
    this.storage = storage;
    this.config = {
      logToConsole: true,
      logToStorage: true,
      complianceMode: true,
      ...config
    };
  }

  /**
   * Add event handler
   */
  addHandler(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Emit user created event
   */
  async emitUserCreated(event: UserCreatedEvent): Promise<void> {
    await this.emitEvent('USER_CREATED', event, EventLogLevel.INFO);
    
    if (this.config.logToStorage) {
      await this.createAuditLog({
        id: nanoid(),
        userId: event.userId,
        action: 'CREATE',
        resource: 'USER',
        resourceId: event.userId,
        outcome: 'SUCCESS',
        details: {
          username: event.username,
          email: event.email
        },
        timestamp: event.timestamp
      });
    }
  }

  /**
   * Emit user logged in event
   */
  async emitUserLoggedIn(event: UserLoginEvent): Promise<void> {
    await this.emitEvent('USER_LOGGED_IN', event, EventLogLevel.INFO);
    
    if (this.config.logToStorage) {
      await this.createAuditLog({
        id: nanoid(),
        userId: event.userId,
        action: 'LOGIN',
        resource: 'USER',
        resourceId: event.userId,
        outcome: 'SUCCESS',
        details: {
          username: event.username,
          provider: event.provider,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent
        },
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        timestamp: event.timestamp
      });
    }
  }

  /**
   * Emit user logged out event
   */
  async emitUserLoggedOut(event: UserLogoutEvent): Promise<void> {
    await this.emitEvent('USER_LOGGED_OUT', event, EventLogLevel.INFO);
    
    if (this.config.logToStorage) {
      await this.createAuditLog({
        id: nanoid(),
        userId: event.userId,
        action: 'LOGOUT',
        resource: 'USER',
        resourceId: event.userId,
        outcome: 'SUCCESS',
        timestamp: event.timestamp
      });
    }
  }

  /**
   * Emit login failed event
   */
  async emitLoginFailed(event: LoginFailedEvent): Promise<void> {
    await this.emitEvent('LOGIN_FAILED', event, EventLogLevel.WARN);
    
    if (this.config.logToStorage) {
      await this.createAuditLog({
        id: nanoid(),
        userId: event.userId,
        action: 'LOGIN',
        resource: 'USER',
        resourceId: event.userId,
        outcome: 'FAILURE',
        details: {
          username: event.username,
          attempts: event.attempts,
          accountLocked: event.accountLocked,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent
        },
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        timestamp: event.timestamp
      });
    }
  }

  /**
   * Emit API key created event
   */
  async emitApiKeyCreated(event: ApiKeyEvent): Promise<void> {
    await this.emitEvent('API_KEY_CREATED', event, EventLogLevel.INFO);
    
    if (this.config.logToStorage) {
      await this.createAuditLog({
        id: nanoid(),
        userId: event.userId,
        action: 'CREATE',
        resource: 'API_KEY',
        resourceId: event.apiKeyId,
        outcome: 'SUCCESS',
        timestamp: event.timestamp
      });
    }
  }

  /**
   * Emit API key used event
   */
  async emitApiKeyUsed(event: ApiKeyEvent): Promise<void> {
    await this.emitEvent('API_KEY_USED', event, EventLogLevel.INFO);
    
    if (this.config.logToStorage) {
      await this.createAuditLog({
        id: nanoid(),
        userId: event.userId,
        action: event.action?.toUpperCase() || 'ACCESS',
        resource: event.resource || 'API',
        resourceId: event.apiKeyId,
        outcome: 'SUCCESS',
        details: {
          apiKeyId: event.apiKeyId,
          resource: event.resource,
          action: event.action
        },
        timestamp: event.timestamp
      });
    }
  }

  /**
   * Emit role assigned event
   */
  async emitRoleAssigned(event: RoleEvent): Promise<void> {
    await this.emitEvent('ROLE_ASSIGNED', event, EventLogLevel.INFO);
    
    if (this.config.logToStorage) {
      await this.createAuditLog({
        id: nanoid(),
        userId: event.userId,
        action: 'ASSIGN',
        resource: 'ROLE',
        resourceId: event.roleId,
        outcome: 'SUCCESS',
        details: {
          roleId: event.roleId,
          roleName: event.roleName
        },
        timestamp: event.timestamp
      });
    }
  }

  /**
   * Emit general event
   */
  private async emitEvent(eventType: string, eventData: any, level: EventLogLevel): Promise<void> {
    // Process event with all handlers
    for (const handler of this.handlers) {
      try {
        await handler.handleEvent(eventType, eventData, level);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }
    }
    
    // Log to console if enabled
    if (this.config.logToConsole) {
      this.logToConsole(eventType, eventData, level);
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(log: AuditLog): Promise<void> {
    try {
      await this.storage.createAuditLog(log);
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  /**
   * Log event to console
   */
  private logToConsole(eventType: string, eventData: any, level: EventLogLevel): void {
    const timestamp = new Date().toISOString();
    const logData = { timestamp, type: eventType, level, ...eventData };
    
    switch (level) {
      case EventLogLevel.INFO:
        console.info(`[AUTH] ${eventType}:`, logData);
        break;
      case EventLogLevel.WARN:
        console.warn(`[AUTH] ${eventType}:`, logData);
        break;
      case EventLogLevel.ERROR:
        console.error(`[AUTH] ${eventType}:`, logData);
        break;
    }
  }
}