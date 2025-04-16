# Data Validation Framework Integration Guide

This guide provides instructions for integrating the Data Validation Framework into your microservices and components within the Smart Health Hub platform.

## Introduction

The Data Validation Framework provides a consistent approach to data validation across the platform, ensuring data integrity, security, and compliance with healthcare standards.

## Key Components

The framework consists of several components:

1. **Core Validation Types**: Defined in `shared/validation/common/types.ts`
2. **Validation Schemas**: Predefined schemas for common data types in `shared/validation/schemas/`
3. **Validation Rules**: Reusable validation rules in `shared/validation/rules/`
4. **Validation Utilities**: Helper functions in `shared/validation/common/utils.ts`
5. **Express Middleware**: For request validation in `shared/validation/middleware/validation-middleware.ts`
6. **Error Integration**: Integration with the AppError framework

## Basic Usage

### Importing the Framework

```typescript
// Import validation components
import { 
  createSchema, 
  string, 
  number, 
  object,
  validateBody,
  validateParams,
  validateQuery
} from '@shared/validation';

// Import predefined schemas (if needed)
import { patientRecordSchema } from '@shared/validation/schemas';
```

### Creating Validation Schemas

```typescript
// Create a simple schema
const userSchema = object(
  {
    username: string({ minLength: 3, maxLength: 50 }).zodSchema,
    email: string({ format: 'email' }).zodSchema,
    age: number({ min: 18 }).zodSchema,
    role: z.enum(['user', 'admin', 'provider'])
  },
  {
    id: 'user',
    name: 'User',
    description: 'User validation schema'
  }
);
```

### Using Validation in Express Routes

```typescript
// Create a route with validation
router.post(
  '/users',
  validateBody(userSchema),
  async (req, res, next) => {
    try {
      // The body has already been validated and transformed
      const userData = req.body;
      
      // Process the validated data
      const user = await userService.createUser(userData);
      
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }
);
```

## Advanced Usage

### Context-Aware Validation

The framework supports context-aware validation, which allows you to apply different validation rules based on the context:

```typescript
// Create a context factory
const authContextFactory = createAuthContextFactory();

// Use validation with context
router.post(
  '/patients',
  validateBody(patientRecordSchema, { contextFactory: authContextFactory }),
  async (req, res, next) => {
    // The request body is validated in the context of the authenticated user
    // ...
  }
);
```

### Business Rule Validation

You can enhance validation schemas with business rules:

```typescript
// Enhance a schema with business rules
const enhancedSchema = enhanceSchemaWithBusinessRules(
  medicationSchema,
  [
    {
      validate: (medication, context) => {
        // Check for allergies
        const allergies = context?.patient?.allergies || [];
        return !allergies.some(a => 
          medication.name.toLowerCase().includes(a.substance.toLowerCase())
        );
      },
      message: 'Medication conflicts with patient allergies',
      code: ValidationErrorCode.BUSINESS_RULE_VIOLATION
    }
  ]
);
```

### Creating Partial Schemas for PATCH Operations

```typescript
// Create a partial schema for updates
const patientUpdateSchema = createPartialSchema(
  patientRecordSchema,
  {
    id: 'patient-update',
    name: 'Patient Update',
    description: 'Schema for patient updates'
  }
);

// Use in a PATCH route
router.patch(
  '/patients/:id',
  validateParams(idParamSchema),
  validateBody(patientUpdateSchema),
  async (req, res, next) => {
    // Handle partial updates
    // ...
  }
);
```

## Integration with Error Handling

The framework integrates with the AppError framework for consistent error handling:

```typescript
// In a service method
const validationResult = schema.validate(data, context);

if (!validationResult.success) {
  throw AppError.validation(
    validationResult.errors?.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      value: err.value
    })) || [],
    'Validation failed'
  );
}
```

## Example Use Cases

See the example files for detailed use cases:

1. **Route Validation**: `shared/validation/examples/route-validation-example.ts`
2. **Service Validation**: `shared/validation/examples/service-validation-example.ts`
3. **FHIR Validation**: `shared/validation/examples/fhir-validation-example.ts`

## Best Practices

1. **Define Business Rules Clearly**: Create explicit business rules as separate functions that can be composed.
2. **Context-Aware Validation**: Use validation contexts to make your validation rules context-aware.
3. **Schema Reuse**: Reuse validation schemas across microservices to ensure consistency.
4. **Error Messages**: Provide clear, actionable error messages that help users understand what went wrong.
5. **Test Validation Rules**: Write tests for your validation rules, especially complex business rules.
6. **Security**: Never expose raw validation errors to clients; always sanitize error messages.
7. **Performance**: For performance-critical paths, consider using simpler validation or caching validation results.

## Healthcare-Specific Validation

The framework includes healthcare-specific validation rules and schemas:

- **ICD-10 Codes**: Use the `validateICD10` rule for diagnosis codes
- **CPT Codes**: Use the `validateCPT` rule for procedure codes
- **NPI Validation**: Use the `validateNPI` rule for National Provider Identifiers
- **FHIR Resources**: Use the FHIR schemas for FHIR resource validation

## Extension Points

The framework is designed to be extensible:

1. **Custom Validators**: Create custom validators for domain-specific validation
2. **Custom Rules**: Create custom validation rules for business requirements
3. **Custom Schemas**: Create custom schemas for specific data models
4. **Custom Context Factories**: Create context factories for specific authentication mechanisms

## Further Resources

- [Zod Documentation](https://github.com/colinhacks/zod)
- [Express Middleware Documentation](https://expressjs.com/en/guide/using-middleware.html)
- [FHIR Validation Documentation](https://www.hl7.org/fhir/validation.html)