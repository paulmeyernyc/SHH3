/**
 * Route Registry
 * 
 * Manages and stores API gateway routes.
 */

import { nanoid } from 'nanoid';
import { RouteConfig, RouteConfigInput, RouteConfigSchema } from './model';

/**
 * Interface for route registry storage
 */
export interface RouteRegistry {
  addRoute(route: RouteConfigInput): Promise<RouteConfig>;
  updateRoute(id: string, route: Partial<RouteConfigInput>): Promise<RouteConfig | null>;
  deleteRoute(id: string): Promise<boolean>;
  getRoute(id: string): Promise<RouteConfig | null>;
  getAllRoutes(): Promise<RouteConfig[]>;
  getActiveRoutes(): Promise<RouteConfig[]>;
  findRouteByPath(path: string, method: string): Promise<RouteConfig | null>;
}

/**
 * In-memory implementation of route registry
 */
export class InMemoryRouteRegistry implements RouteRegistry {
  private routes: Map<string, RouteConfig> = new Map();
  private pathRegexCache: Map<string, RegExp> = new Map();

  /**
   * Add a new route
   */
  async addRoute(routeInput: RouteConfigInput): Promise<RouteConfig> {
    // Validate route
    const validationResult = RouteConfigSchema.safeParse(routeInput);
    if (!validationResult.success) {
      throw new Error(`Invalid route config: ${validationResult.error.message}`);
    }

    const route = validationResult.data;
    const id = route.id || nanoid();

    const newRoute: RouteConfig = {
      ...route,
      id
    };

    // Cache the regex if provided
    if (newRoute.pathRegex) {
      try {
        this.pathRegexCache.set(id, new RegExp(newRoute.pathRegex));
      } catch (error) {
        throw new Error(`Invalid path regex: ${newRoute.pathRegex}`);
      }
    }

    this.routes.set(id, newRoute);
    return newRoute;
  }

  /**
   * Update an existing route
   */
  async updateRoute(id: string, route: Partial<RouteConfigInput>): Promise<RouteConfig | null> {
    const existingRoute = this.routes.get(id);
    if (!existingRoute) {
      return null;
    }

    // Merge route data
    const updatedRoute: RouteConfig = {
      ...existingRoute,
      ...route,
      id // Ensure ID doesn't change
    };

    // Update regex cache if pathRegex changed
    if (route.pathRegex !== undefined && route.pathRegex !== existingRoute.pathRegex) {
      if (route.pathRegex) {
        try {
          this.pathRegexCache.set(id, new RegExp(route.pathRegex));
        } catch (error) {
          throw new Error(`Invalid path regex: ${route.pathRegex}`);
        }
      } else {
        this.pathRegexCache.delete(id);
      }
    }

    this.routes.set(id, updatedRoute);
    return updatedRoute;
  }

  /**
   * Delete a route
   */
  async deleteRoute(id: string): Promise<boolean> {
    const deleted = this.routes.delete(id);
    if (deleted) {
      this.pathRegexCache.delete(id);
    }
    return deleted;
  }

  /**
   * Get a route by ID
   */
  async getRoute(id: string): Promise<RouteConfig | null> {
    return this.routes.get(id) || null;
  }

  /**
   * Get all routes
   */
  async getAllRoutes(): Promise<RouteConfig[]> {
    return Array.from(this.routes.values());
  }

  /**
   * Get active routes
   */
  async getActiveRoutes(): Promise<RouteConfig[]> {
    return Array.from(this.routes.values())
      .filter(route => route.active)
      .sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)
  }

  /**
   * Find a route by path and method
   */
  async findRouteByPath(path: string, method: string): Promise<RouteConfig | null> {
    const activeRoutes = await this.getActiveRoutes();
    const normalizedMethod = method.toUpperCase();

    // First try direct path matches, which are faster
    const exactMatch = activeRoutes.find(route =>
      route.path === path && 
      route.methods.includes(normalizedMethod)
    );

    if (exactMatch) {
      return exactMatch;
    }

    // Then try regex matches
    for (const route of activeRoutes) {
      if (!route.methods.includes(normalizedMethod)) {
        continue;
      }

      // Check if route has an exact path or regex pattern
      if (route.path === path) {
        return route;
      }

      // Check regex pattern if available
      if (route.pathRegex) {
        let regex = this.pathRegexCache.get(route.id);
        
        // Create regex if not cached
        if (!regex) {
          try {
            regex = new RegExp(route.pathRegex);
            this.pathRegexCache.set(route.id, regex);
          } catch (error) {
            console.error(`Invalid regex pattern for route ${route.id}: ${route.pathRegex}`);
            continue;
          }
        }

        if (regex.test(path)) {
          return route;
        }
      }
    }

    return null;
  }
}

// Export a singleton instance
export const routeRegistry = new InMemoryRouteRegistry();