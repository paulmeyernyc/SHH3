/**
 * API Gateway Model
 * 
 * Defines models used by the API Gateway.
 */

import { z } from 'zod';

/**
 * Route types supported by the gateway
 */
export enum RouteType {
  HTTP = 'HTTP',
  GRAPHQL = 'GRAPHQL',
  WEBSOCKET = 'WEBSOCKET',
  STATIC = 'STATIC'
}

/**
 * Authentication types supported by the gateway
 */
export enum AuthType {
  NONE = 'NONE',
  JWT = 'JWT',
  API_KEY = 'API_KEY',
  BASIC = 'BASIC',
  OAUTH2 = 'OAUTH2'
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  limit: number;
  window: number;  // in seconds
  type: 'user' | 'ip' | 'api-key' | 'service';
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number;  // in seconds
  maxSize?: number;  // in items
  private?: boolean;  // cache per user
  varyByHeaders?: string[];
  varyByQueryParams?: string[];
}

/**
 * Endpoint or route configuration
 */
export interface RouteConfig {
  id: string;
  path: string;
  pathRegex?: string;
  type: RouteType;
  methods: string[];
  service: string;  // Service name
  serviceVersion?: string;  // Service version constraint
  target: string;  // Target path on the service
  strip?: boolean;  // Strip the route path before forwarding
  auth: AuthType;
  scopes?: string[];  // Required scopes/permissions
  rateLimit?: RateLimitConfig;
  cache?: CacheConfig;
  timeout?: number;  // in milliseconds
  retries?: number;
  circuitBreaker?: boolean;
  cors?: boolean;
  tags?: string[];
  documentation?: RouteDocumentation;
  active: boolean;
  priority: number;  // Higher number = higher priority
}

/**
 * Route documentation
 */
export interface RouteDocumentation {
  summary?: string;
  description?: string;
  requestBody?: any;
  responses?: Record<string, any>;
  parameters?: any[];
  tags?: string[];
  deprecated?: boolean;
}

/**
 * Service information
 */
export interface ServiceInfo {
  id: string;
  name: string;
  version: string;
  url: string;
  healthUrl?: string;
  active: boolean;
  weight: number;
}

/**
 * Request context for gateway handlers
 */
export interface GatewayContext {
  route: RouteConfig;
  service: ServiceInfo;
  authInfo?: {
    type: AuthType;
    user?: any;
    scopes?: string[];
  };
  startTime: number;
  requestId: string;
  originalUrl: string;
}

/**
 * Route configuration schema for validation
 */
export const RouteConfigSchema = z.object({
  id: z.string().optional(),
  path: z.string().min(1),
  pathRegex: z.string().optional(),
  type: z.nativeEnum(RouteType),
  methods: z.array(z.string().min(1)),
  service: z.string().min(1),
  serviceVersion: z.string().optional(),
  target: z.string().optional(),
  strip: z.boolean().optional().default(false),
  auth: z.nativeEnum(AuthType).default(AuthType.NONE),
  scopes: z.array(z.string()).optional(),
  rateLimit: z.object({
    limit: z.number().int().positive(),
    window: z.number().int().positive(),
    type: z.enum(['user', 'ip', 'api-key', 'service'])
  }).optional(),
  cache: z.object({
    enabled: z.boolean().default(false),
    ttl: z.number().int().positive(),
    maxSize: z.number().int().positive().optional(),
    private: z.boolean().optional().default(false),
    varyByHeaders: z.array(z.string()).optional(),
    varyByQueryParams: z.array(z.string()).optional()
  }).optional(),
  timeout: z.number().int().positive().optional(),
  retries: z.number().int().min(0).optional(),
  circuitBreaker: z.boolean().optional().default(true),
  cors: z.boolean().optional().default(true),
  tags: z.array(z.string()).optional(),
  documentation: z.object({
    summary: z.string().optional(),
    description: z.string().optional(),
    requestBody: z.any().optional(),
    responses: z.record(z.any()).optional(),
    parameters: z.array(z.any()).optional(),
    tags: z.array(z.string()).optional(),
    deprecated: z.boolean().optional()
  }).optional(),
  active: z.boolean().optional().default(true),
  priority: z.number().int().optional().default(1)
});

export type RouteConfigInput = z.infer<typeof RouteConfigSchema>;