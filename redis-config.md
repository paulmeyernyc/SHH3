# Redis Configuration for Smart Health Hub

This guide explains how to configure Redis for use with Smart Health Hub's distributed caching system.

## Environment Variables

To enable Redis support, you need to set at least one of the following environment variables:

### Option 1: Direct URL (Recommended)

```
REDIS_URL=redis://username:password@host:port/db
```

Examples:
- `REDIS_URL=redis://localhost:6379/0` (local Redis, no auth)
- `REDIS_URL=redis://:password@redis.example.com:6379/0` (Redis with password only)
- `REDIS_URL=redis://default:password@redis.example.com:6379/0` (Redis with username and password)

### Option 2: Individual Components

```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_USERNAME=your_username  # Optional
REDIS_DATABASE=0              # Optional, defaults to 0
```

## Additional Configuration (Optional)

For fine-tuning Redis connection behavior:

```
REDIS_CONNECT_TIMEOUT=10000   # Connection timeout in ms (default: 10000)
REDIS_COMMAND_TIMEOUT=5000    # Command timeout in ms (default: 5000)
```

## Testing Redis Connection

Once configured, test your Redis connection by visiting:

```
/api/test/redis-cache
```

This endpoint will test core Redis operations and display connection status.

## Managed Redis Services

For production environments, consider using a managed Redis service:

- **Redis Cloud** (Redis Labs)
- **Amazon ElastiCache for Redis**
- **Azure Cache for Redis**
- **Google Cloud Memorystore for Redis**
- **Upstash** (Serverless Redis)

These services provide reliable, scalable Redis instances with automatic failover.