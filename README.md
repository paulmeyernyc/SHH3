# Audit Service

The Audit Service provides centralized audit logging capability for the Smart Health Hub platform, tracking all activities, data access, and changes for compliance and security purposes.

## Features

- Comprehensive audit event tracking with detailed information
- Data change tracking for monitoring modifications to entities
- Access tracking for patient data with purpose and consent information
- Configurable retention policies for managing audit data lifecycle
- Support for emergency access tracking
- Client library for easy integration with other services
- REST API for querying and analyzing audit data
- Support for batch operations
- Statistics and reporting

## API Endpoints

### Health Check
- `GET /health`: Check if the service is running

### Audit Events
- `POST /api/audit/events`: Create a new audit event
- `GET /api/audit/events`: List audit events with filtering and pagination
- `GET /api/audit/events/:id`: Get a single audit event with related data
- `POST /api/audit/events/bulk`: Bulk create audit events

### Audit Data Changes
- `POST /api/audit/data-changes`: Record a data change
- `GET /api/audit/data-changes`: List data changes with filtering and pagination

### Audit Access
- `POST /api/audit/access`: Record a data access event
- `GET /api/audit/access`: List access records with filtering and pagination

### Retention Policies
- `GET /api/audit/retention-policies`: List retention policies
- `GET /api/audit/retention-policies/:id`: Get a single retention policy
- `POST /api/audit/retention-policies`: Create a new retention policy
- `PUT /api/audit/retention-policies/:id`: Update a retention policy
- `DELETE /api/audit/retention-policies/:id`: Delete a retention policy
- `POST /api/audit/execute-retention`: Execute retention policies

### Statistics
- `GET /api/audit/statistics`: Get audit statistics

## Client Library

The Audit Service includes a client library for easy integration with other services. To use the client library:

```typescript
import { createAuditClient } from 'audit-service/client';

// Create a client instance
const auditClient = new AuditClient({
  baseUrl: 'http://audit-service:3002',
  serviceName: 'my-service',
  retry: true
});

// Log a basic event
await auditClient.auditEvent(
  'patient',
  '12345',
  'read',
  'success',
  'Patient record accessed',
  {
    userId: 1,
    username: 'dr.smith'
  }
);

// Use convenience methods
await auditClient.auditLogin(1, 'dr.smith', true, '192.168.1.100');

await auditClient.auditUpdate(
  1,
  'dr.smith',
  'patient',
  '12345',
  [
    { field: 'address', oldValue: '123 Main St', newValue: '456 Oak Ave' },
    { field: 'phoneNumber', oldValue: '555-123-4567', newValue: '555-987-6543' }
  ],
  'Updated patient contact information'
);

// Record data access
await auditClient.auditResourceAccess(
  1,
  'dr.smith',
  'patient',
  '12345',
  true,
  '12345',
  'treatment'
);
```

## Environment Variables

- `PORT`: Port number (default: 3002)
- `REDIS_URL`: Redis URL for caching (optional)
- `DATABASE_URL`: PostgreSQL connection string

## Development

### Prerequisites

- Node.js 18 or later
- PostgreSQL database

### Installation

```bash
cd microservices/audit-service
npm install
```

### Running in Development Mode

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

### Running in Production Mode

```bash
npm start
```

### Running Tests

```bash
npm test
```

## Database Schema

The service uses the following database tables:

1. `audit_events`: Main table for all audit events
2. `audit_data_changes`: Records specific field changes
3. `audit_access`: Tracks access to patient data
4. `audit_retention_policies`: Defines data retention policies

## Integration with Other Services

Other services can integrate with the Audit Service using the provided client library. This ensures consistent audit logging across the platform with minimal boilerplate code.

## Compliance

The Audit Service is designed to support compliance with healthcare regulations such as HIPAA, which require detailed audit logs for PHI access and changes.

## Security

All audit records include information about the user, service, IP address, and other relevant context to support forensic analysis if needed.

## Retention and Storage

Audit data can be managed with configurable retention policies based on resource type, action, and other criteria. Critical audit events can be marked for indefinite retention.