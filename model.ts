/**
 * Service Registry Model
 * 
 * Defines models used by the service registry.
 */

import { z } from 'zod';

/**
 * Service type enum
 */
export enum ServiceType {
  REST = 'REST',
  GRAPHQL = 'GRAPHQL',
  GRPC = 'GRPC',
  WEBSOCKET = 'WEBSOCKET',
  BATCH = 'BATCH',
  WORKER = 'WORKER'
}

/**
 * Service status enum
 */
export enum ServiceStatus {
  STARTING = 'STARTING',
  UP = 'UP',
  DOWN = 'DOWN',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Service endpoint
 */
export interface ServiceEndpoint {
  path: string;
  method?: string;
  secured: boolean;
  description?: string;
  rateLimit?: {
    type: 'user' | 'ip' | 'api-key' | 'service';
    limit: number;
    window: number; // in seconds
  };
  tags?: string[];
  deprecated?: boolean;
}

/**
 * Service registration request
 */
export interface ServiceRegistration {
  name: string;
  version: string;
  type: ServiceType;
  description?: string;
  host: string;
  port: number;
  securePort?: number;
  endpoints: ServiceEndpoint[];
  health?: {
    path: string;
    interval?: number; // in milliseconds
  };
  tags?: string[];
  weight?: number; // for load balancing, default 1
  metadata?: Record<string, any>;
}

/**
 * Service instance in registry
 */
export interface ServiceInstance extends ServiceRegistration {
  id: string;
  status: ServiceStatus;
  lastUpdated: string;
  registered: string;
  weight: number;
}

/**
 * Heartbeat update
 */
export interface Heartbeat {
  status: ServiceStatus;
  details?: Record<string, any>;
}

/**
 * Service query parameters
 */
export interface ServiceQuery {
  name?: string;
  version?: string;
  type?: ServiceType;
  status?: ServiceStatus;
  path?: string;
  tags?: string[];
  active?: boolean;
}

/**
 * Service registration schema
 */
export const ServiceRegistrationSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().min(1).max(50),
  type: z.nativeEnum(ServiceType),
  description: z.string().max(500).optional(),
  host: z.string().min(1).max(255),
  port: z.number().int().positive(),
  securePort: z.number().int().positive().optional(),
  endpoints: z.array(z.object({
    path: z.string().min(1),
    method: z.string().optional(),
    secured: z.boolean(),
    description: z.string().optional(),
    rateLimit: z.object({
      type: z.enum(['user', 'ip', 'api-key', 'service']),
      limit: z.number().int().positive(),
      window: z.number().int().positive()
    }).optional(),
    tags: z.array(z.string()).optional(),
    deprecated: z.boolean().optional()
  })),
  health: z.object({
    path: z.string().min(1),
    interval: z.number().int().positive().optional()
  }).optional(),
  tags: z.array(z.string()).optional(),
  weight: z.number().int().positive().optional().default(1),
  metadata: z.record(z.any()).optional()
});