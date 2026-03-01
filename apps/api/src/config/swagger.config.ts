/**
 * Swagger/OpenAPI Configuration
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../lib/env';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Lido API',
    version: '1.0.0',
    description: 'Lido SaaS Automation Platform API - Deploy and manage bots that integrate with external services',
    contact: {
      name: 'Lido Support',
      email: 'support@lido.app',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: env.NODE_ENV === 'production' ? 'https://api.lido.app' : `http://localhost:${env.PORT}`,
      description: env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'UNAUTHORIZED' },
                    message: { type: 'string', example: 'Authentication required' },
                  },
                },
              },
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'VALIDATION_ERROR' },
                    message: { type: 'string', example: 'Validation failed' },
                    details: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
      RateLimitError: {
        description: 'Too many requests',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'RATE_LIMITED' },
                    message: { type: 'string', example: 'Too many requests' },
                  },
                },
              },
            },
          },
        },
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      Bot: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
          userId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Dropbox Sync Bot' },
          integration: { type: 'string', example: 'dropbox' },
          config: { type: 'object', additionalProperties: true },
          cronExpression: { type: 'string', example: '0 */6 * * *', nullable: true },
          status: { type: 'string', enum: ['active', 'paused', 'error'], example: 'active' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Service: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'dropbox' },
          name: { type: 'string', example: 'Dropbox' },
          connected: { type: 'boolean', example: false },
        },
      },
      HealthCheck: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          uptime: { type: 'number', example: 12345.67 },
          timestamp: { type: 'string', format: 'date-time' },
          cache: {
            type: 'object',
            properties: {
              adapter: { type: 'string', enum: ['redis', 'memory'], example: 'redis' },
              redis: {
                type: 'object',
                nullable: true,
                properties: {
                  connected: { type: 'boolean' },
                  healthy: { type: 'boolean' },
                },
              },
            },
          },
          database: {
            type: 'object',
            properties: {
              mysql: {
                type: 'object',
                properties: {
                  connected: { type: 'boolean', example: true },
                  healthy: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Health',
      description: 'Health check endpoints',
    },
    {
      name: 'Auth',
      description: 'Authentication endpoints',
    },
    {
      name: 'Bots',
      description: 'Bot management endpoints',
    },
    {
      name: 'Services',
      description: 'Service integration endpoints',
    },
  ],
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/app.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
