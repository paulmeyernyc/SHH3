/**
 * OpenAPI Documentation Generator
 * 
 * This module provides functionality to generate OpenAPI documentation
 * for Smart Health Hub services.
 */

import { Express } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';

/**
 * OpenAPI specification options
 */
export interface OpenApiOptions {
  serviceName: string;
  description: string;
  version: string;
  basePath: string;
  includeFiles: string[];
  outputJsonPath?: string;
  tags?: Array<{ name: string; description: string }>;
  components?: Record<string, any>;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

/**
 * Default OpenAPI options
 */
const defaultOpenApiOptions: Partial<OpenApiOptions> = {
  serviceName: 'API Service',
  description: 'API Documentation',
  version: '1.0.0',
  basePath: '/api',
  includeFiles: [],
  tags: [],
  components: {},
};

/**
 * Generate OpenAPI specifications
 */
export function generateOpenApiSpec(options: OpenApiOptions): object {
  const mergedOptions = { ...defaultOpenApiOptions, ...options };
  
  const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: mergedOptions.serviceName,
      version: mergedOptions.version,
      description: mergedOptions.description,
      contact: mergedOptions.contact,
      license: mergedOptions.license,
    },
    servers: [
      {
        url: mergedOptions.basePath,
        description: `${mergedOptions.serviceName} API`,
      },
    ],
    tags: mergedOptions.tags,
    components: {
      ...mergedOptions.components,
    },
    paths: {},
  };

  const swaggerOptions = {
    definition: swaggerDefinition,
    apis: mergedOptions.includeFiles,
  };

  return swaggerJSDoc(swaggerOptions);
}

/**
 * Write OpenAPI specifications to a JSON file
 */
export function writeApiDocsJson(specs: object, outputPath: string): void {
  try {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(specs, null, 2));
    console.log(`OpenAPI documentation written to ${outputPath}`);
  } catch (error) {
    console.error('Error writing OpenAPI documentation to file:', error);
  }
}

/**
 * Setup OpenAPI documentation for an Express application
 */
export function setupApiDocs(app: Express, options: OpenApiOptions): void {
  // Generate OpenAPI specifications
  const specs = generateOpenApiSpec(options);
  
  // Setup Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
  }));
  
  // Output specifications to JSON file if path is specified
  if (options.outputJsonPath) {
    writeApiDocsJson(specs, options.outputJsonPath);
  }
}

/**
 * Convert OpenAPI path parameter to Express path parameter
 * OpenAPI uses {paramName} while Express uses :paramName
 */
export function convertToExpressPath(openApiPath: string): string {
  return openApiPath.replace(/{([^}]+)}/g, ':$1');
}

/**
 * Convert Express path parameter to OpenAPI path parameter
 * Express uses :paramName while OpenAPI uses {paramName}
 */
export function convertToOpenApiPath(expressPath: string): string {
  return expressPath.replace(/:([^/]+)/g, '{$1}');
}

/**
 * Extract parameters from an Express path
 */
export function extractPathParameters(expressPath: string): string[] {
  const paramRegex = /:([^/]+)/g;
  const parameters: string[] = [];
  let match;
  
  while ((match = paramRegex.exec(expressPath)) !== null) {
    parameters.push(match[1]);
  }
  
  return parameters;
}

/**
 * Generate OpenAPI parameter objects from Express path parameters
 */
export function generatePathParameters(expressPath: string): Array<{
  name: string;
  in: string;
  required: boolean;
  schema: { type: string };
  description: string;
}> {
  const parameters = extractPathParameters(expressPath);
  
  return parameters.map(param => ({
    name: param,
    in: 'path',
    required: true,
    schema: { type: 'string' },
    description: `${param} parameter`,
  }));
}

/**
 * Generate basic OpenAPI response objects
 */
export function generateBasicResponses(successCode = '200', successDescription = 'Success'): Record<string, any> {
  return {
    [successCode]: {
      description: successDescription,
    },
    '400': {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Invalid request parameters',
              },
            },
          },
        },
      },
    },
    '401': {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Authentication required',
              },
            },
          },
        },
      },
    },
    '403': {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Insufficient permissions',
              },
            },
          },
        },
      },
    },
    '404': {
      description: 'Not Found',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Resource not found',
              },
            },
          },
        },
      },
    },
    '500': {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'An unexpected error occurred',
              },
            },
          },
        },
      },
    },
  };
}

/**
 * Generate OpenAPI security scheme for JWT authentication
 */
export function generateJwtSecurityScheme(): Record<string, any> {
  return {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT Bearer token',
      },
    },
  };
}

/**
 * Generate OpenAPI security scheme for API key authentication
 */
export function generateApiKeySecurityScheme(keyName = 'x-api-key'): Record<string, any> {
  return {
    securitySchemes: {
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: keyName,
        description: 'API key for authentication',
      },
    },
  };
}

/**
 * Generate OpenAPI security scheme for OAuth2 authentication
 */
export function generateOAuth2SecurityScheme(
  authorizationUrl: string,
  tokenUrl: string,
  scopes: Record<string, string> = {},
): Record<string, any> {
  return {
    securitySchemes: {
      oauth2: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl,
            tokenUrl,
            scopes,
          },
        },
      },
    },
  };
}

/**
 * Generate OpenAPI security requirements
 */
export function generateSecurityRequirements(securitySchemeNames: string[]): Array<Record<string, any[]>> {
  return securitySchemeNames.map(name => ({ [name]: [] }));
}

/**
 * Generate pagination parameters for OpenAPI
 */
export function generatePaginationParameters(): Array<{
  name: string;
  in: string;
  required: boolean;
  schema: Record<string, any>;
  description: string;
}> {
  return [
    {
      name: 'page',
      in: 'query',
      required: false,
      schema: {
        type: 'integer',
        minimum: 1,
        default: 1,
      },
      description: 'Page number',
    },
    {
      name: 'limit',
      in: 'query',
      required: false,
      schema: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
      },
      description: 'Number of items per page',
    },
    {
      name: 'sort',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'Sort field (prefix with - for descending order)',
    },
  ];
}