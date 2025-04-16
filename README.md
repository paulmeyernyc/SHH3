# Smart Health Hub - Data Validation Framework

## Overview

The Data Validation Framework provides a comprehensive, consistent approach to data validation across all microservices and components in the Smart Health Hub platform. It ensures data integrity, security, and compliance with healthcare standards.

## Key Features

- **Type-safety**: Built on top of Zod for strong type checking
- **Healthcare-specific validation**: Rules for ICD-10, CPT, NPI, and other healthcare codes
- **Context-aware validation**: Adapt validation based on context (user, organization, etc.)
- **Business rule integration**: Apply business rules to validation
- **Express middleware**: Easy integration with Express routes
- **Error handling**: Integration with the AppError framework
- **Test utilities**: Tools for testing validation schemas

## Directory Structure

```
shared/validation/
├── common/                   # Core validation components
│   ├── types.ts              # Validation types
│   ├── validators.ts         # Base validators (string, number, etc.)
│   └── utils.ts              # Validation utilities
├── middleware/               # Express middleware
│   └── validation-middleware.ts  # Request validation middleware
├── schemas/                  # Pre-defined validation schemas
│   ├── index.ts              # Schema exports
│   └── healthcare-schemas.ts # Healthcare-specific schemas
├── rules/                    # Validation rules
│   └── index.ts              # Healthcare-specific rules
├── examples/                 # Usage examples
│   ├── route-validation-example.ts
│   ├── service-validation-example.ts
│   ├── fhir-validation-example.ts
│   └── drizzle-schema-example.ts
├── testing/                  # Testing utilities
│   ├── schema-test-utility.ts # Test utilities
│   └── schema-test-example.ts # Test examples
└── docs/                     # Documentation
    └── integration-guide.md   # Integration guide
```

## Getting Started

See the [Integration Guide](./docs/integration-guide.md) for detailed instructions on using the framework.

### Basic Usage

```typescript
import { 
  createSchema, 
  string, 
  number, 
  object,
  validateBody,
  validateParams,
  validateQuery
} from '@shared/validation';

// Create a validation schema
const userSchema = object(
  {
    username: string({ minLength: 3, maxLength: 50 }).zodSchema,
    email: string({ format: 'email' }).zodSchema,
    age: number({ min: 18 }).zodSchema
  },
  {
    id: 'user',
    name: 'User',
    description: 'User validation schema'
  }
);

// Use in an Express route
router.post(
  '/users',
  validateBody(userSchema),
  async (req, res, next) => {
    // The body has already been validated
    const userData = req.body;
    // Process the data...
  }
);
```

## Healthcare Validation

The framework includes specialized validation for healthcare data:

```typescript
import { diagnosisSchema, medicationSchema } from '@shared/validation/schemas';
import { validateNPI, validateICD10, validateCPT } from '@shared/validation/rules';

// Validate a diagnosis
const diagnosis = {
  code: 'I25.10', // ICD-10 code
  description: 'Atherosclerotic heart disease',
  diagnosisDate: '2023-05-15',
  diagnosedBy: '1234567893' // NPI
};

const isValid = diagnosisSchema.validate(diagnosis).success;
```

## Testing

Use the testing utilities to verify your validation schemas:

```typescript
import { testSchema, printTestResults } from '@shared/validation/testing';

const testCases = [
  {
    description: 'Valid data should pass',
    input: { /* valid data */ },
    shouldPass: true
  },
  {
    description: 'Invalid data should fail',
    input: { /* invalid data */ },
    shouldPass: false,
    expectedErrors: ['specific error message']
  }
];

const results = testSchema(mySchema, testCases);
printTestResults('My Schema', results);
```

## Extend the Framework

Add new validation rules:

```typescript
import { createRule, ValidationErrorCode } from '@shared/validation';

export const validateCustomCode = createRule({
  id: 'custom-code',
  name: 'Custom Code Validation',
  description: 'Validates a custom code format',
  validate: (value) => /^[A-Z]{2}-\d{4}$/.test(value),
  errorMessage: 'Invalid custom code format',
  errorCode: ValidationErrorCode.CUSTOM
});
```

## Examples

See the `examples/` directory for comprehensive examples:

- **Route Validation**: Using validation in Express routes
- **Service Validation**: Using validation in service layers
- **FHIR Validation**: Validating FHIR resources
- **Drizzle Schema**: Using validation with Drizzle ORM

## License

Proprietary - Smart Health Hub