# Smart Health Hub API Gateway

The API Gateway serves as the entry point for all requests to the Smart Health Hub platform. It routes requests to the appropriate microservices based on the request path.

## Overview

The API Gateway provides the following functionality:
- Request routing to appropriate microservices
- Basic security with Helmet
- CORS support
- Rate limiting
- Request ID generation
- Error handling
- WebSocket proxying (for real-time services)

## Architecture

The gateway is a lightweight Express server that uses http-proxy-middleware to route requests to the appropriate microservices.

## Services

The gateway routes requests to the following microservices:

| Path | Service | Port |
| ---- | ------- | ---- |
| `/api/auth`, `/api/login`, `/api/logout`, `/api/register`, `/api/user` | Auth Service | 3001 |
| `/api/fhir` | FHIR Service | 3002 |
| `/api/mcp` | MCP Service | 3003 |
| `/api/services` | Service Management | 3004 |
| `/api/person` | Person Connect | 3007 |
| `/api/messages`, `/ws/messages` | Messaging Service | 3008 |
| `/api/workflows` | Workflow Engine | 3009 |
| `/api/notifications` | Notification Service | 3010 |
| `/api/audit` | Audit Service | 3011 |
| `/api/config` | Configuration Service | 3012 |

## Configuration

The gateway can be configured using the following environment variables:

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `PORT` | 3000 | The port the gateway listens on |
| `NODE_ENV` | development | The environment the gateway runs in |
| `RATE_LIMIT_ENABLED` | false | Whether rate limiting is enabled |
| `RATE_LIMIT_WINDOW_MS` | 60000 | The time window for rate limiting in milliseconds |
| `RATE_LIMIT_MAX` | 100 | The maximum number of requests per window |

## Deployment

The gateway can be deployed as a standalone Docker container or as part of the Smart Health Hub platform using Docker Compose.

## Development

To run the gateway in development mode:

```bash
npm run dev
```

This will start the gateway on port 3000 in development mode.