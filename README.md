# Canonical Dataset Service

## Overview

The Canonical Dataset Service provides a centralized, license-aware repository for standardized healthcare terminologies, value sets, mappings, fee schedules, and clinical rules. It serves as the "source of truth" for all canonical data used across the Smart Health Hub platform.

## Features

- **FHIR R4 Compatibility**: Full implementation of the FHIR Terminology Service API
- **License-Aware Access Control**: Manages access to proprietary terminologies based on tenant licensing
- **Multi-Tenant Design**: Supports multiple organizations with appropriate data isolation
- **Comprehensive Dataset Support**:
  - Code Systems (SNOMED CT, LOINC, RxNorm, ICD-10, CPT, etc.)
  - Value Sets (collections of codes for specific use cases)
  - Concept Maps (mappings between different code systems)
  - Fee Schedules (pricing data for procedures/services)
  - Clinical Rules (decision support logic)
- **Flexible Query Capabilities**:
  - Code lookups and validation
  - Value set expansion
  - Code translation
  - Hierarchical relationships
  - Multilingual support

## Architecture

The service follows a RESTful API design with both standard API endpoints and FHIR-compatible endpoints. It's built on the core Smart Health Hub microservice architecture, leveraging PostgreSQL for data storage.

### Key Components

1. **Code System Management**: Handles terminology systems and their concepts (codes)
2. **Value Set Management**: Manages sets of codes for specific use cases
3. **Concept Map Management**: Provides mapping between different code systems
4. **Fee Schedule Management**: Manages pricing data for procedures and services
5. **License Management**: Controls access to proprietary content based on tenant licensing
6. **FHIR Terminology Service**: Provides FHIR-compatible API endpoints

## API Endpoints

### Code Systems

- `GET /code-systems`: List all code systems
- `GET /code-systems/:id`: Get a specific code system
- `POST /code-systems`: Create a new code system (admin only)
- `PUT /code-systems/:id`: Update a code system (admin only)
- `GET /code-systems/:id/concepts`: List concepts in a code system
- `GET /code-systems/:id/concepts/:code`: Get a specific concept
- `POST /code-systems/:id/concepts`: Add a concept to a code system (admin only)
- `POST /code-systems/:id/concepts/:code/designations`: Add a designation to a concept (admin only)

### Value Sets

- `GET /value-sets`: List all value sets
- `GET /value-sets/:id`: Get a specific value set
- `POST /value-sets`: Create a new value set (admin only)
- `GET /value-sets/:id/expansion`: Expand a value set
- `POST /value-sets/:id/includes`: Add an include criteria to a value set (admin only)
- `POST /value-sets/:id/excludes`: Add an exclude criteria to a value set (admin only)

### Concept Maps

- `GET /concept-maps`: List all concept maps
- `GET /concept-maps/:id`: Get a specific concept map
- `POST /concept-maps`: Create a new concept map (admin only)
- `GET /concept-maps/:id/translate`: Translate a code using a concept map
- `POST /concept-maps/:id/elements`: Add a mapping element to a concept map (admin only)

### Fee Schedules

- `GET /fee-schedules`: List all fee schedules
- `GET /fee-schedules/:id`: Get a specific fee schedule
- `POST /fee-schedules`: Create a new fee schedule (admin only)
- `GET /fee-schedules/:id/items`: List items in a fee schedule
- `GET /fee-schedules/:id/items/:code`: Get a specific fee schedule item
- `POST /fee-schedules/:id/items`: Add an item to a fee schedule (admin only)

### Clinical Rules

- `GET /clinical-rules`: List all clinical rules
- `GET /clinical-rules/:ruleSetId/:ruleId`: Get a specific clinical rule
- `POST /clinical-rules`: Create a new clinical rule (admin only)
- `POST /clinical-rules/:ruleSetId/:ruleId/elements`: Add an element to a clinical rule (admin only)

### Licenses

- `GET /licenses`: List all licenses for a tenant
- `GET /licenses/check`: Check if a tenant has a specific license
- `POST /licenses`: Create a new license (admin only)
- `PUT /licenses/:tenantId/:licenseType`: Update a license (admin only)
- `GET /licenses/:tenantId/:licenseType/usage`: Get license usage statistics (admin only)

### FHIR Terminology Service

- `GET /fhir/CodeSystem`: Search for code systems
- `GET /fhir/CodeSystem/:id`: Get a specific code system
- `GET /fhir/CodeSystem/$lookup`: Look up a code
- `GET /fhir/CodeSystem/$validate-code`: Validate a code
- `GET /fhir/ValueSet`: Search for value sets
- `GET /fhir/ValueSet/:id`: Get a specific value set
- `GET /fhir/ValueSet/$expand`: Expand a value set

## License Management

The service implements a sophisticated license management system for handling proprietary terminology content:

1. **License Registration**: Administrators register licenses for tenants
2. **License Verification**: API endpoints verify license validity before providing access
3. **License Usage Tracking**: The system tracks and logs usage for audit and compliance
4. **License Expiration**: Access is automatically restricted once licenses expire

## Usage Examples

See the following files for implementation examples:

- `src/client-example.ts`: How to use the service API from other services
- `src/import-sample.ts`: How to import terminology data into the service

## Data Model

The service uses a structured data model aligned with FHIR R4 specifications:

1. **Code Systems**: Metadata about terminology systems like SNOMED CT, LOINC
2. **Code System Concepts**: The actual codes and their details
3. **Value Sets**: Collections of codes for specific use cases
4. **Concept Maps**: Mappings between codes in different systems
5. **Fee Schedules**: Pricing information for procedures/services
6. **Clinical Rules**: Decision support rules
7. **Licenses**: License information for terminologies

## Deployment Considerations

- **Database Sizing**: Terminology datasets can be very large (e.g., SNOMED CT has over 350,000 concepts)
- **Caching Strategy**: Implement caching for frequently used codes and value sets
- **Data Loading**: Prepare for significant initial load times when importing full terminologies
- **Update Process**: Plan for regular updates as terminologies are released (typically biannually)
- **License Management**: Ensure license expiration alerts are configured

## Future Enhancements

- Advanced subsumption testing for hierarchical terminologies
- Specialized indexes for specific terminology use cases
- Bulk export functionality
- Value set composition tools
- Rule-based concept mapping