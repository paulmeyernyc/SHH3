import React, { useState } from 'react';
import { Layout } from '../components/layout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Copy, ChevronRight, Code, FileJson } from 'lucide-react';

const ApiDocumentationPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter APIs based on search query
  const filterApis = (apis, query) => {
    if (!query) return apis;
    
    return apis.filter(api => 
      api.name.toLowerCase().includes(query.toLowerCase()) ||
      api.description.toLowerCase().includes(query.toLowerCase()) ||
      api.category.toLowerCase().includes(query.toLowerCase())
    );
  };
  
  // Core Service APIs
  const coreApis = [
    {
      name: "PHR Service API",
      category: "Core",
      description: "Manages personal health records with FHIR R4 compatibility",
      endpoints: [
        {
          method: "GET",
          path: "/api/phr/patients/{id}",
          description: "Retrieve a patient's complete health record",
          params: [{ name: "id", type: "string", required: true, description: "Patient ID" }],
          responses: [
            { code: "200", description: "Patient record retrieved successfully" },
            { code: "404", description: "Patient not found" },
            { code: "403", description: "Access denied" }
          ]
        },
        {
          method: "GET",
          path: "/api/phr/patients/{id}/resources",
          description: "Retrieve all FHIR resources for a patient",
          params: [
            { name: "id", type: "string", required: true, description: "Patient ID" },
            { name: "resourceType", type: "string", required: false, description: "Filter by resource type (e.g., Observation, Condition)" },
            { name: "date", type: "string", required: false, description: "Filter by date range (ISO format)" }
          ],
          responses: [
            { code: "200", description: "Resources retrieved successfully" },
            { code: "404", description: "Patient not found" },
            { code: "403", description: "Access denied" }
          ]
        },
        {
          method: "POST",
          path: "/api/phr/patients/{id}/resources",
          description: "Add a new resource to patient record",
          params: [
            { name: "id", type: "string", required: true, description: "Patient ID" },
            { name: "resource", type: "object", required: true, description: "FHIR resource object" }
          ],
          responses: [
            { code: "201", description: "Resource created successfully" },
            { code: "400", description: "Invalid resource format" },
            { code: "404", description: "Patient not found" },
            { code: "403", description: "Access denied" }
          ]
        },
        {
          method: "PUT",
          path: "/api/phr/patients/{id}/resources/{resourceId}",
          description: "Update an existing resource",
          params: [
            { name: "id", type: "string", required: true, description: "Patient ID" },
            { name: "resourceId", type: "string", required: true, description: "Resource ID" },
            { name: "resource", type: "object", required: true, description: "Updated FHIR resource object" }
          ],
          responses: [
            { code: "200", description: "Resource updated successfully" },
            { code: "400", description: "Invalid resource format" },
            { code: "404", description: "Resource not found" },
            { code: "403", description: "Access denied" }
          ]
        },
        {
          method: "GET",
          path: "/api/phr/patients/{id}/summary",
          description: "Generate a patient summary record",
          params: [
            { name: "id", type: "string", required: true, description: "Patient ID" },
            { name: "format", type: "string", required: false, description: "Summary format (FHIR, CDA, etc.)" }
          ],
          responses: [
            { code: "200", description: "Summary generated successfully" },
            { code: "404", description: "Patient not found" },
            { code: "403", description: "Access denied" }
          ]
        }
      ]
    },
    {
      name: "Universal Consent Service API",
      category: "Core",
      description: "Manages consent policies and access decisions",
      endpoints: [
        {
          method: "GET",
          path: "/api/consent/patients/{id}/consents",
          description: "Retrieve all consents for a patient",
          params: [
            { name: "id", type: "string", required: true, description: "Patient ID" },
            { name: "status", type: "string", required: false, description: "Filter by consent status" }
          ],
          responses: [
            { code: "200", description: "Consents retrieved successfully" },
            { code: "404", description: "Patient not found" }
          ]
        },
        {
          method: "POST",
          path: "/api/consent/patients/{id}/consents",
          description: "Record a new consent for a patient",
          params: [
            { name: "id", type: "string", required: true, description: "Patient ID" },
            { name: "consent", type: "object", required: true, description: "Consent details" }
          ],
          responses: [
            { code: "201", description: "Consent recorded successfully" },
            { code: "400", description: "Invalid consent format" },
            { code: "404", description: "Patient not found" }
          ]
        },
        {
          method: "POST",
          path: "/api/consent/check",
          description: "Check if an action is allowed under existing consents",
          params: [
            { name: "patientId", type: "string", required: true, description: "Patient ID" },
            { name: "actor", type: "object", required: true, description: "Actor requesting access" },
            { name: "purpose", type: "string", required: true, description: "Purpose of use" },
            { name: "resource", type: "object", required: true, description: "Resource being accessed" }
          ],
          responses: [
            { code: "200", description: "Access decision returned" },
            { code: "400", description: "Invalid request format" },
            { code: "404", description: "Patient or policy not found" }
          ]
        },
        {
          method: "POST",
          path: "/api/consent/request",
          description: "Request consent for a specific purpose",
          params: [
            { name: "patientId", type: "string", required: true, description: "Patient ID" },
            { name: "requestor", type: "object", required: true, description: "Entity requesting consent" },
            { name: "purpose", type: "string", required: true, description: "Purpose of use" },
            { name: "resources", type: "array", required: true, description: "Resources needing consent" }
          ],
          responses: [
            { code: "202", description: "Consent request submitted" },
            { code: "400", description: "Invalid request format" },
            { code: "404", description: "Patient not found" }
          ]
        },
        {
          method: "PUT",
          path: "/api/consent/patients/{id}/consents/{consentId}",
          description: "Update consent status (e.g., revoke)",
          params: [
            { name: "id", type: "string", required: true, description: "Patient ID" },
            { name: "consentId", type: "string", required: true, description: "Consent ID" },
            { name: "status", type: "string", required: true, description: "New consent status" }
          ],
          responses: [
            { code: "200", description: "Consent updated successfully" },
            { code: "400", description: "Invalid status" },
            { code: "404", description: "Consent not found" }
          ]
        }
      ]
    },
    {
      name: "User Directory Service API",
      category: "Core",
      description: "Manages user accounts and authentication",
      endpoints: [
        {
          method: "POST",
          path: "/api/users/authenticate",
          description: "Authenticate a user and generate access token",
          params: [
            { name: "username", type: "string", required: true, description: "User's username" },
            { name: "password", type: "string", required: true, description: "User's password" }
          ],
          responses: [
            { code: "200", description: "Authentication successful, tokens returned" },
            { code: "401", description: "Authentication failed" },
            { code: "403", description: "Account locked or requires additional verification" }
          ]
        },
        {
          method: "POST",
          path: "/api/users/refresh",
          description: "Refresh an access token using a refresh token",
          params: [
            { name: "refreshToken", type: "string", required: true, description: "Valid refresh token" }
          ],
          responses: [
            { code: "200", description: "New access token generated" },
            { code: "401", description: "Invalid refresh token" }
          ]
        },
        {
          method: "GET",
          path: "/api/users/{id}",
          description: "Retrieve user profile information",
          params: [
            { name: "id", type: "string", required: true, description: "User ID" }
          ],
          responses: [
            { code: "200", description: "User profile retrieved" },
            { code: "404", description: "User not found" }
          ]
        },
        {
          method: "PUT",
          path: "/api/users/{id}",
          description: "Update user profile information",
          params: [
            { name: "id", type: "string", required: true, description: "User ID" },
            { name: "profile", type: "object", required: true, description: "Updated profile data" }
          ],
          responses: [
            { code: "200", description: "Profile updated successfully" },
            { code: "400", description: "Invalid profile data" },
            { code: "404", description: "User not found" }
          ]
        },
        {
          method: "POST",
          path: "/api/users/{id}/mfa/enroll",
          description: "Enroll in multi-factor authentication",
          params: [
            { name: "id", type: "string", required: true, description: "User ID" },
            { name: "mfaType", type: "string", required: true, description: "MFA method type" }
          ],
          responses: [
            { code: "200", description: "MFA enrollment successful" },
            { code: "400", description: "Invalid MFA type" },
            { code: "404", description: "User not found" }
          ]
        }
      ]
    },
    {
      name: "Master Person/Patient Index API",
      category: "Core",
      description: "Manages person identification and record linkage",
      endpoints: [
        {
          method: "GET",
          path: "/api/mpi/persons/{id}",
          description: "Retrieve a person record by ID",
          params: [
            { name: "id", type: "string", required: true, description: "Person ID" }
          ],
          responses: [
            { code: "200", description: "Person found" },
            { code: "404", description: "Person not found" }
          ]
        },
        {
          method: "POST",
          path: "/api/mpi/persons/search",
          description: "Search for persons by demographic data",
          params: [
            { name: "demographics", type: "object", required: true, description: "Demographic search criteria" }
          ],
          responses: [
            { code: "200", description: "Search results returned" },
            { code: "400", description: "Invalid search criteria" }
          ]
        },
        {
          method: "POST",
          path: "/api/mpi/persons",
          description: "Register a new person in the MPI",
          params: [
            { name: "person", type: "object", required: true, description: "Person demographic data" }
          ],
          responses: [
            { code: "201", description: "Person registered successfully" },
            { code: "400", description: "Invalid person data" },
            { code: "409", description: "Potential duplicate detected" }
          ]
        },
        {
          method: "GET",
          path: "/api/mpi/patients/{id}",
          description: "Retrieve a patient record by ID",
          params: [
            { name: "id", type: "string", required: true, description: "Patient ID" }
          ],
          responses: [
            { code: "200", description: "Patient found" },
            { code: "404", description: "Patient not found" }
          ]
        },
        {
          method: "POST",
          path: "/api/mpi/link",
          description: "Link two person records as same individual",
          params: [
            { name: "personId1", type: "string", required: true, description: "First person ID" },
            { name: "personId2", type: "string", required: true, description: "Second person ID" },
            { name: "linkReason", type: "string", required: true, description: "Reason for linking" }
          ],
          responses: [
            { code: "200", description: "Records linked successfully" },
            { code: "400", description: "Invalid link request" },
            { code: "404", description: "One or both persons not found" }
          ]
        }
      ]
    }
  ];
  
  // Claims Service APIs
  const claimsApis = [
    {
      name: "Claims Processing Service API",
      category: "Claims",
      description: "Handles claim submission, tracking, and processing",
      endpoints: [
        {
          method: "POST",
          path: "/api/claims",
          description: "Submit a new claim",
          params: [
            { name: "claim", type: "object", required: true, description: "Claim data in FHIR or X12 format" },
            { name: "submissionPath", type: "string", required: false, description: "'direct' or 'payer' path" }
          ],
          responses: [
            { code: "202", description: "Claim submitted successfully" },
            { code: "400", description: "Invalid claim format" },
            { code: "422", description: "Claim validation failed" }
          ]
        },
        {
          method: "GET",
          path: "/api/claims/{id}",
          description: "Retrieve a claim by ID",
          params: [
            { name: "id", type: "string", required: true, description: "Claim ID" }
          ],
          responses: [
            { code: "200", description: "Claim retrieved successfully" },
            { code: "404", description: "Claim not found" }
          ]
        },
        {
          method: "GET",
          path: "/api/claims/patient/{patientId}",
          description: "Retrieve all claims for a patient",
          params: [
            { name: "patientId", type: "string", required: true, description: "Patient ID" },
            { name: "status", type: "string", required: false, description: "Filter by claim status" },
            { name: "fromDate", type: "string", required: false, description: "Filter claims from date" },
            { name: "toDate", type: "string", required: false, description: "Filter claims to date" }
          ],
          responses: [
            { code: "200", description: "Claims retrieved successfully" },
            { code: "404", description: "Patient not found" }
          ]
        },
        {
          method: "GET",
          path: "/api/claims/{id}/status",
          description: "Check claim processing status",
          params: [
            { name: "id", type: "string", required: true, description: "Claim ID" }
          ],
          responses: [
            { code: "200", description: "Status retrieved successfully" },
            { code: "404", description: "Claim not found" }
          ]
        },
        {
          method: "PUT",
          path: "/api/claims/{id}/cancel",
          description: "Cancel a submitted claim",
          params: [
            { name: "id", type: "string", required: true, description: "Claim ID" },
            { name: "reason", type: "string", required: true, description: "Cancellation reason" }
          ],
          responses: [
            { code: "200", description: "Claim cancelled successfully" },
            { code: "400", description: "Invalid cancellation reason" },
            { code: "404", description: "Claim not found" },
            { code: "422", description: "Claim cannot be cancelled" }
          ]
        }
      ]
    },
    {
      name: "Prior Authorization Service API",
      category: "Claims",
      description: "Manages prior authorization requests and responses",
      endpoints: [
        {
          method: "POST",
          path: "/api/prior-auth",
          description: "Submit a prior authorization request",
          params: [
            { name: "authRequest", type: "object", required: true, description: "Authorization request details" },
            { name: "processingPath", type: "string", required: false, description: "'hub' or 'payer' path" }
          ],
          responses: [
            { code: "202", description: "Request submitted successfully" },
            { code: "400", description: "Invalid request format" },
            { code: "422", description: "Validation failed" }
          ]
        },
        {
          method: "GET",
          path: "/api/prior-auth/{id}",
          description: "Retrieve a prior authorization by ID",
          params: [
            { name: "id", type: "string", required: true, description: "Authorization ID" }
          ],
          responses: [
            { code: "200", description: "Authorization retrieved successfully" },
            { code: "404", description: "Authorization not found" }
          ]
        },
        {
          method: "GET",
          path: "/api/prior-auth/patient/{patientId}",
          description: "Retrieve all prior authorizations for a patient",
          params: [
            { name: "patientId", type: "string", required: true, description: "Patient ID" },
            { name: "status", type: "string", required: false, description: "Filter by status" }
          ],
          responses: [
            { code: "200", description: "Authorizations retrieved successfully" },
            { code: "404", description: "Patient not found" }
          ]
        },
        {
          method: "GET",
          path: "/api/prior-auth/{id}/status",
          description: "Check authorization status",
          params: [
            { name: "id", type: "string", required: true, description: "Authorization ID" }
          ],
          responses: [
            { code: "200", description: "Status retrieved successfully" },
            { code: "404", description: "Authorization not found" }
          ]
        },
        {
          method: "POST",
          path: "/api/prior-auth/{id}/documents",
          description: "Add supporting documents to an authorization",
          params: [
            { name: "id", type: "string", required: true, description: "Authorization ID" },
            { name: "documents", type: "array", required: true, description: "Document metadata and content" }
          ],
          responses: [
            { code: "201", description: "Documents added successfully" },
            { code: "400", description: "Invalid document format" },
            { code: "404", description: "Authorization not found" }
          ]
        }
      ]
    },
    {
      name: "Goldcarding Service API",
      category: "Claims",
      description: "Manages provider goldcarding for streamlined authorizations",
      endpoints: [
        {
          method: "GET",
          path: "/api/goldcarding/providers/{id}/status",
          description: "Check provider goldcarding status",
          params: [
            { name: "id", type: "string", required: true, description: "Provider ID" },
            { name: "serviceType", type: "string", required: false, description: "Specific service to check" }
          ],
          responses: [
            { code: "200", description: "Goldcarding status retrieved" },
            { code: "404", description: "Provider not found" }
          ]
        },
        {
          method: "GET",
          path: "/api/goldcarding/eligibility",
          description: "Check service eligibility for goldcarding",
          params: [
            { name: "providerId", type: "string", required: true, description: "Provider ID" },
            { name: "payerId", type: "string", required: true, description: "Payer ID" },
            { name: "serviceCode", type: "string", required: true, description: "Service code to check" }
          ],
          responses: [
            { code: "200", description: "Eligibility status retrieved" },
            { code: "404", description: "Provider or service not found" }
          ]
        },
        {
          method: "POST",
          path: "/api/goldcarding/providers/{id}/enroll",
          description: "Enroll provider in goldcarding program",
          params: [
            { name: "id", type: "string", required: true, description: "Provider ID" },
            { name: "serviceCodes", type: "array", required: true, description: "Service codes for goldcarding" },
            { name: "payerId", type: "string", required: true, description: "Payer ID" }
          ],
          responses: [
            { code: "201", description: "Provider enrolled successfully" },
            { code: "400", description: "Invalid enrollment data" },
            { code: "404", description: "Provider not found" },
            { code: "409", description: "Provider already enrolled" }
          ]
        },
        {
          method: "GET",
          path: "/api/goldcarding/rules",
          description: "Retrieve goldcarding rules for a payer",
          params: [
            { name: "payerId", type: "string", required: true, description: "Payer ID" }
          ],
          responses: [
            { code: "200", description: "Rules retrieved successfully" },
            { code: "404", description: "Payer not found" }
          ]
        },
        {
          method: "POST",
          path: "/api/goldcarding/verify",
          description: "Verify if a service is goldcarded",
          params: [
            { name: "providerId", type: "string", required: true, description: "Provider ID" },
            { name: "payerId", type: "string", required: true, description: "Payer ID" },
            { name: "patientId", type: "string", required: true, description: "Patient ID" },
            { name: "serviceCode", type: "string", required: true, description: "Service code" }
          ],
          responses: [
            { code: "200", description: "Verification result returned" },
            { code: "404", description: "Provider, payer, or service not found" }
          ]
        }
      ]
    },
    {
      name: "Eligibility & Benefits Service API",
      category: "Claims",
      description: "Provides real-time eligibility verification",
      endpoints: [
        {
          method: "POST",
          path: "/api/eligibility/verify",
          description: "Verify patient eligibility with a payer",
          params: [
            { name: "patientId", type: "string", required: true, description: "Patient ID" },
            { name: "providerId", type: "string", required: true, description: "Provider ID" },
            { name: "payerId", type: "string", required: true, description: "Payer ID" },
            { name: "serviceTypes", type: "array", required: false, description: "Service types to check" }
          ],
          responses: [
            { code: "200", description: "Eligibility verification completed" },
            { code: "400", description: "Invalid request format" },
            { code: "404", description: "Patient, provider, or payer not found" }
          ]
        },
        {
          method: "GET",
          path: "/api/eligibility/patients/{patientId}/coverages",
          description: "Retrieve all coverage information for a patient",
          params: [
            { name: "patientId", type: "string", required: true, description: "Patient ID" }
          ],
          responses: [
            { code: "200", description: "Coverage information retrieved" },
            { code: "404", description: "Patient not found" }
          ]
        },
        {
          method: "GET",
          path: "/api/eligibility/result/{transactionId}",
          description: "Retrieve results of a previous eligibility check",
          params: [
            { name: "transactionId", type: "string", required: true, description: "Transaction ID from verify call" }
          ],
          responses: [
            { code: "200", description: "Eligibility results retrieved" },
            { code: "404", description: "Transaction not found" }
          ]
        },
        {
          method: "POST",
          path: "/api/eligibility/benefits/estimate",
          description: "Estimate patient financial responsibility",
          params: [
            { name: "patientId", type: "string", required: true, description: "Patient ID" },
            { name: "providerId", type: "string", required: true, description: "Provider ID" },
            { name: "services", type: "array", required: true, description: "Planned services" }
          ],
          responses: [
            { code: "200", description: "Benefit estimate calculated" },
            { code: "400", description: "Invalid request format" },
            { code: "404", description: "Patient or provider not found" }
          ]
        }
      ]
    }
  ];
  
  // Integration and Infrastructure APIs
  const integrationApis = [
    {
      name: "Integration Gateway API",
      category: "Integration",
      description: "Provides connectivity to external healthcare systems",
      endpoints: [
        {
          method: "GET",
          path: "/api/integration/connections",
          description: "List all configured external connections",
          params: [
            { name: "type", type: "string", required: false, description: "Filter by connection type" },
            { name: "status", type: "string", required: false, description: "Filter by connection status" }
          ],
          responses: [
            { code: "200", description: "Connections retrieved successfully" }
          ]
        },
        {
          method: "POST",
          path: "/api/integration/connections",
          description: "Configure a new external connection",
          params: [
            { name: "connection", type: "object", required: true, description: "Connection configuration details" }
          ],
          responses: [
            { code: "201", description: "Connection created successfully" },
            { code: "400", description: "Invalid connection configuration" },
            { code: "409", description: "Connection already exists" }
          ]
        },
        {
          method: "GET",
          path: "/api/integration/connections/{id}/status",
          description: "Check connection health status",
          params: [
            { name: "id", type: "string", required: true, description: "Connection ID" }
          ],
          responses: [
            { code: "200", description: "Status retrieved successfully" },
            { code: "404", description: "Connection not found" }
          ]
        },
        {
          method: "POST",
          path: "/api/integration/connections/{id}/test",
          description: "Test a connection with sample messages",
          params: [
            { name: "id", type: "string", required: true, description: "Connection ID" },
            { name: "testMessage", type: "object", required: true, description: "Sample message to send" }
          ],
          responses: [
            { code: "200", description: "Test completed successfully" },
            { code: "404", description: "Connection not found" },
            { code: "502", description: "Connection test failed" }
          ]
        },
        {
          method: "GET",
          path: "/api/integration/connections/{id}/metrics",
          description: "Retrieve connection usage metrics",
          params: [
            { name: "id", type: "string", required: true, description: "Connection ID" },
            { name: "period", type: "string", required: false, description: "Time period for metrics" }
          ],
          responses: [
            { code: "200", description: "Metrics retrieved successfully" },
            { code: "404", description: "Connection not found" }
          ]
        }
      ]
    },
    {
      name: "Audit Service API",
      category: "Infrastructure",
      description: "Captures comprehensive audit trails",
      endpoints: [
        {
          method: "GET",
          path: "/api/audit/events",
          description: "Search for audit events",
          params: [
            { name: "userId", type: "string", required: false, description: "Filter by user ID" },
            { name: "action", type: "string", required: false, description: "Filter by action type" },
            { name: "resource", type: "string", required: false, description: "Filter by resource type" },
            { name: "fromDate", type: "string", required: false, description: "Start date for search" },
            { name: "toDate", type: "string", required: false, description: "End date for search" }
          ],
          responses: [
            { code: "200", description: "Audit events retrieved successfully" }
          ]
        },
        {
          method: "GET",
          path: "/api/audit/patients/{id}/access",
          description: "Get all access events for a patient's data",
          params: [
            { name: "id", type: "string", required: true, description: "Patient ID" },
            { name: "fromDate", type: "string", required: false, description: "Start date for search" },
            { name: "toDate", type: "string", required: false, description: "End date for search" }
          ],
          responses: [
            { code: "200", description: "Access events retrieved successfully" },
            { code: "404", description: "Patient not found" }
          ]
        },
        {
          method: "GET",
          path: "/api/audit/compliance/reports",
          description: "Generate compliance reports from audit data",
          params: [
            { name: "reportType", type: "string", required: true, description: "Type of compliance report" },
            { name: "period", type: "string", required: true, description: "Reporting period" },
            { name: "format", type: "string", required: false, description: "Report format (PDF, CSV, JSON)" }
          ],
          responses: [
            { code: "200", description: "Report generated successfully" },
            { code: "400", description: "Invalid report parameters" }
          ]
        },
        {
          method: "POST",
          path: "/api/audit/events",
          description: "Record a custom audit event",
          params: [
            { name: "event", type: "object", required: true, description: "Audit event details" }
          ],
          responses: [
            { code: "201", description: "Event recorded successfully" },
            { code: "400", description: "Invalid event format" }
          ]
        }
      ]
    },
    {
      name: "Notification Service API",
      category: "Infrastructure",
      description: "Handles delivery of notifications across multiple channels",
      endpoints: [
        {
          method: "POST",
          path: "/api/notifications/send",
          description: "Send a notification to recipients",
          params: [
            { name: "notification", type: "object", required: true, description: "Notification content and recipients" },
            { name: "channels", type: "array", required: false, description: "Delivery channels (email, SMS, push, etc.)" }
          ],
          responses: [
            { code: "202", description: "Notification accepted for delivery" },
            { code: "400", description: "Invalid notification format" }
          ]
        },
        {
          method: "GET",
          path: "/api/notifications/users/{id}",
          description: "Retrieve notifications for a user",
          params: [
            { name: "id", type: "string", required: true, description: "User ID" },
            { name: "status", type: "string", required: false, description: "Filter by read/unread status" },
            { name: "limit", type: "number", required: false, description: "Maximum notifications to return" }
          ],
          responses: [
            { code: "200", description: "Notifications retrieved successfully" },
            { code: "404", description: "User not found" }
          ]
        },
        {
          method: "PUT",
          path: "/api/notifications/{id}/read",
          description: "Mark a notification as read",
          params: [
            { name: "id", type: "string", required: true, description: "Notification ID" }
          ],
          responses: [
            { code: "200", description: "Notification marked as read" },
            { code: "404", description: "Notification not found" }
          ]
        },
        {
          method: "GET",
          path: "/api/notifications/{id}/status",
          description: "Check delivery status of a notification",
          params: [
            { name: "id", type: "string", required: true, description: "Notification ID" }
          ],
          responses: [
            { code: "200", description: "Status retrieved successfully" },
            { code: "404", description: "Notification not found" }
          ]
        },
        {
          method: "PUT",
          path: "/api/notifications/users/{id}/preferences",
          description: "Update user notification preferences",
          params: [
            { name: "id", type: "string", required: true, description: "User ID" },
            { name: "preferences", type: "object", required: true, description: "Notification preferences" }
          ],
          responses: [
            { code: "200", description: "Preferences updated successfully" },
            { code: "400", description: "Invalid preferences format" },
            { code: "404", description: "User not found" }
          ]
        }
      ]
    },
    {
      name: "Observability Service API",
      category: "Infrastructure",
      description: "Collects and visualizes system metrics, logs, and traces",
      endpoints: [
        {
          method: "GET",
          path: "/api/observability/metrics",
          description: "Retrieve system metrics",
          params: [
            { name: "component", type: "string", required: false, description: "Filter by component" },
            { name: "metricName", type: "string", required: false, description: "Filter by metric name" },
            { name: "fromTime", type: "string", required: false, description: "Start time for metrics" },
            { name: "toTime", type: "string", required: false, description: "End time for metrics" },
            { name: "resolution", type: "string", required: false, description: "Data resolution" }
          ],
          responses: [
            { code: "200", description: "Metrics retrieved successfully" }
          ]
        },
        {
          method: "GET",
          path: "/api/observability/traces/{traceId}",
          description: "Retrieve a distributed trace by ID",
          params: [
            { name: "traceId", type: "string", required: true, description: "Trace ID" }
          ],
          responses: [
            { code: "200", description: "Trace retrieved successfully" },
            { code: "404", description: "Trace not found" }
          ]
        },
        {
          method: "GET",
          path: "/api/observability/logs",
          description: "Search system logs",
          params: [
            { name: "service", type: "string", required: false, description: "Filter by service name" },
            { name: "level", type: "string", required: false, description: "Filter by log level" },
            { name: "query", type: "string", required: false, description: "Search query" },
            { name: "fromTime", type: "string", required: false, description: "Start time for logs" },
            { name: "toTime", type: "string", required: false, description: "End time for logs" }
          ],
          responses: [
            { code: "200", description: "Logs retrieved successfully" }
          ]
        },
        {
          method: "GET",
          path: "/api/observability/alerts",
          description: "Retrieve active and recent alerts",
          params: [
            { name: "status", type: "string", required: false, description: "Filter by alert status" },
            { name: "severity", type: "string", required: false, description: "Filter by alert severity" }
          ],
          responses: [
            { code: "200", description: "Alerts retrieved successfully" }
          ]
        },
        {
          method: "GET",
          path: "/api/observability/health",
          description: "Get system health status",
          params: [
            { name: "component", type: "string", required: false, description: "Filter by component" }
          ],
          responses: [
            { code: "200", description: "Health status retrieved successfully" }
          ]
        }
      ]
    }
  ];
  
  // External service integrations
  const externalApis = [
    {
      name: "FHIR API Gateway",
      category: "External Integration",
      description: "FHIR R4-compliant API for external system integration",
      endpoints: [
        {
          method: "GET",
          path: "/api/fhir/[resourceType]",
          description: "Search for resources of a specific type (FHIR search API)",
          params: [
            { name: "resourceType", type: "string", required: true, description: "FHIR resource type (e.g., Patient, Observation)" },
            { name: "_id", type: "string", required: false, description: "Resource identifier" },
            { name: "patient", type: "string", required: false, description: "Patient reference" },
            { name: "*", type: "mixed", required: false, description: "Any valid FHIR search parameter" }
          ],
          responses: [
            { code: "200", description: "Search results returned successfully" },
            { code: "400", description: "Invalid search parameters" },
            { code: "403", description: "Access denied" }
          ]
        },
        {
          method: "GET",
          path: "/api/fhir/[resourceType]/[id]",
          description: "Retrieve a specific resource by ID",
          params: [
            { name: "resourceType", type: "string", required: true, description: "FHIR resource type" },
            { name: "id", type: "string", required: true, description: "Resource ID" }
          ],
          responses: [
            { code: "200", description: "Resource retrieved successfully" },
            { code: "404", description: "Resource not found" },
            { code: "403", description: "Access denied" }
          ]
        },
        {
          method: "POST",
          path: "/api/fhir/[resourceType]",
          description: "Create a new resource",
          params: [
            { name: "resourceType", type: "string", required: true, description: "FHIR resource type" },
            { name: "resource", type: "object", required: true, description: "FHIR resource object" }
          ],
          responses: [
            { code: "201", description: "Resource created successfully" },
            { code: "400", description: "Invalid resource format" },
            { code: "422", description: "Business rule validation failed" }
          ]
        },
        {
          method: "PUT",
          path: "/api/fhir/[resourceType]/[id]",
          description: "Update an existing resource",
          params: [
            { name: "resourceType", type: "string", required: true, description: "FHIR resource type" },
            { name: "id", type: "string", required: true, description: "Resource ID" },
            { name: "resource", type: "object", required: true, description: "Updated FHIR resource object" }
          ],
          responses: [
            { code: "200", description: "Resource updated successfully" },
            { code: "400", description: "Invalid resource format" },
            { code: "404", description: "Resource not found" },
            { code: "422", description: "Business rule validation failed" }
          ]
        },
        {
          method: "GET",
          path: "/api/fhir/metadata",
          description: "Retrieve FHIR server capability statement",
          params: [],
          responses: [
            { code: "200", description: "Capability statement retrieved successfully" }
          ]
        }
      ]
    },
    {
      name: "HL7v2 Integration Service",
      category: "External Integration",
      description: "HL7v2 messaging gateway for legacy system integration",
      endpoints: [
        {
          method: "POST",
          path: "/api/hl7/message",
          description: "Submit an HL7v2 message for processing",
          params: [
            { name: "message", type: "string", required: true, description: "Raw HL7v2 message content" },
            { name: "source", type: "string", required: true, description: "Source system identifier" },
            { name: "messageType", type: "string", required: false, description: "HL7 message type (e.g., ADT, ORU)" }
          ],
          responses: [
            { code: "200", description: "Message processed successfully" },
            { code: "400", description: "Invalid message format" },
            { code: "422", description: "Message processing failed" }
          ]
        },
        {
          method: "GET",
          path: "/api/hl7/connections",
          description: "List configured HL7 connections",
          params: [
            { name: "status", type: "string", required: false, description: "Filter by connection status" }
          ],
          responses: [
            { code: "200", description: "Connections retrieved successfully" }
          ]
        },
        {
          method: "POST",
          path: "/api/hl7/connections",
          description: "Configure a new HL7 connection",
          params: [
            { name: "connection", type: "object", required: true, description: "Connection configuration details" }
          ],
          responses: [
            { code: "201", description: "Connection created successfully" },
            { code: "400", description: "Invalid connection configuration" }
          ]
        },
        {
          method: "GET",
          path: "/api/hl7/translate",
          description: "Translate between HL7v2 and FHIR formats",
          params: [
            { name: "sourceFormat", type: "string", required: true, description: "Source format (HL7v2 or FHIR)" },
            { name: "targetFormat", type: "string", required: true, description: "Target format (HL7v2 or FHIR)" },
            { name: "content", type: "string", required: true, description: "Content to translate" }
          ],
          responses: [
            { code: "200", description: "Translation successful" },
            { code: "400", description: "Invalid input format" },
            { code: "422", description: "Translation failed" }
          ]
        }
      ]
    },
    {
      name: "X12 EDI Gateway",
      category: "External Integration",
      description: "X12 EDI transaction processing for claims and benefits",
      endpoints: [
        {
          method: "POST",
          path: "/api/x12/parse",
          description: "Parse X12 EDI content into structured format",
          params: [
            { name: "content", type: "string", required: true, description: "Raw X12 content" },
            { name: "transactionType", type: "string", required: false, description: "X12 transaction type (e.g., 837, 835)" }
          ],
          responses: [
            { code: "200", description: "Parsing successful" },
            { code: "400", description: "Invalid X12 format" }
          ]
        },
        {
          method: "POST",
          path: "/api/x12/generate",
          description: "Generate X12 EDI content from structured data",
          params: [
            { name: "data", type: "object", required: true, description: "Structured transaction data" },
            { name: "transactionType", type: "string", required: true, description: "X12 transaction type to generate" }
          ],
          responses: [
            { code: "200", description: "Generation successful" },
            { code: "400", description: "Invalid input data" }
          ]
        },
        {
          method: "POST",
          path: "/api/x12/validate",
          description: "Validate X12 EDI content against transaction specifications",
          params: [
            { name: "content", type: "string", required: true, description: "X12 content to validate" },
            { name: "transactionType", type: "string", required: true, description: "X12 transaction type" }
          ],
          responses: [
            { code: "200", description: "Validation results returned" },
            { code: "400", description: "Invalid X12 format" }
          ]
        },
        {
          method: "POST",
          path: "/api/x12/translate/fhir",
          description: "Translate between X12 and FHIR formats",
          params: [
            { name: "sourceFormat", type: "string", required: true, description: "Source format (X12 or FHIR)" },
            { name: "content", type: "string", required: true, description: "Content to translate" },
            { name: "transactionType", type: "string", required: true, description: "Transaction type (e.g., 837/Claim)" }
          ],
          responses: [
            { code: "200", description: "Translation successful" },
            { code: "400", description: "Invalid input format" },
            { code: "422", description: "Translation failed" }
          ]
        }
      ]
    },
    {
      name: "SMART on FHIR Service",
      category: "External Integration",
      description: "SMART on FHIR app integration framework",
      endpoints: [
        {
          method: "GET",
          path: "/api/smart/apps",
          description: "Retrieve registered SMART apps",
          params: [
            { name: "status", type: "string", required: false, description: "Filter by app status" }
          ],
          responses: [
            { code: "200", description: "Apps retrieved successfully" }
          ]
        },
        {
          method: "POST",
          path: "/api/smart/apps",
          description: "Register a new SMART app",
          params: [
            { name: "app", type: "object", required: true, description: "SMART app registration details" }
          ],
          responses: [
            { code: "201", description: "App registered successfully" },
            { code: "400", description: "Invalid app registration data" },
            { code: "409", description: "App already registered" }
          ]
        },
        {
          method: "GET",
          path: "/api/smart/apps/{id}",
          description: "Retrieve a specific SMART app",
          params: [
            { name: "id", type: "string", required: true, description: "App ID" }
          ],
          responses: [
            { code: "200", description: "App retrieved successfully" },
            { code: "404", description: "App not found" }
          ]
        },
        {
          method: "POST",
          path: "/api/smart/launch",
          description: "Launch a SMART app within a context",
          params: [
            { name: "appId", type: "string", required: true, description: "App ID" },
            { name: "context", type: "object", required: true, description: "Launch context (patient, user, etc.)" }
          ],
          responses: [
            { code: "200", description: "Launch successful, auth URL returned" },
            { code: "400", description: "Invalid launch parameters" },
            { code: "404", description: "App not found" }
          ]
        },
        {
          method: "GET",
          path: "/api/smart/.well-known/smart-configuration",
          description: "SMART Discovery endpoint",
          params: [],
          responses: [
            { code: "200", description: "SMART configuration retrieved" }
          ]
        }
      ]
    }
  ];
  
  // Combined list of all APIs
  const allApis = [...coreApis, ...claimsApis, ...integrationApis, ...externalApis];
  
  // Filter APIs based on search
  const filteredApis = filterApis(allApis, searchQuery);
  
  // Helper function to copy code to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => alert("Code copied to clipboard!"))
      .catch((err) => console.error("Failed to copy: ", err));
  };

  const codeSamplesByLanguage = {
    javascript: {
      title: "JavaScript",
      code: `// JavaScript example: Fetch a patient's health record
fetch('/api/phr/patients/123', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Patient record:', data);
})
.catch(error => {
  console.error('Error fetching patient record:', error);
});`
    },
    python: {
      title: "Python",
      code: `# Python example: Fetch a patient's health record
import requests

def get_patient_record(patient_id, access_token):
    url = f"https://api.smarthealthhub.com/api/phr/patients/{patient_id}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()  # Raise exception for 4XX/5XX responses
    
    return response.json()

# Example usage
try:
    patient_data = get_patient_record("123", "YOUR_ACCESS_TOKEN")
    print("Patient record:", patient_data)
except requests.exceptions.RequestException as e:
    print("Error fetching patient record:", e)`
    },
    java: {
      title: "Java",
      code: `// Java example: Fetch a patient's health record
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class PatientRecordExample {
    public static void main(String[] args) {
        try {
            String patientId = "123";
            String accessToken = "YOUR_ACCESS_TOKEN";
            
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.smarthealthhub.com/api/phr/patients/" + patientId))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .GET()
                .build();
                
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                System.out.println("Patient record: " + response.body());
            } else {
                System.out.println("Error: " + response.statusCode() + " - " + response.body());
            }
        } catch (Exception e) {
            System.out.println("Exception: " + e.getMessage());
        }
    }
}`
    },
    csharp: {
      title: "C#",
      code: `// C# example: Fetch a patient's health record
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        try
        {
            string patientId = "123";
            string accessToken = "YOUR_ACCESS_TOKEN";
            
            using (var client = new HttpClient())
            {
                client.DefaultRequestHeaders.Authorization = 
                    new AuthenticationHeaderValue("Bearer", accessToken);
                
                var response = await client.GetAsync($"https://api.smarthealthhub.com/api/phr/patients/{patientId}");
                response.EnsureSuccessStatusCode();
                
                string responseBody = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Patient record: {responseBody}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching patient record: {ex.Message}");
        }
    }
}`
    }
  };
  
  // Current Code Sample State
  const [currentLanguage, setCurrentLanguage] = useState("javascript");
  
  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground">
            Comprehensive reference for all Smart Health Hub APIs and external integrations
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              The Smart Health Hub API provides a comprehensive set of endpoints for healthcare 
              interoperability, patient record management, claims processing, and system integration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Authentication</h3>
              <p className="text-sm text-muted-foreground mb-4">
                All API requests require authentication via JWT bearer tokens. To obtain a token, use the 
                User Directory Service authentication endpoints.
              </p>
              
              <div className="bg-muted p-4 rounded-md text-sm font-mono">
                <p>Example request with authentication:</p>
                <pre className="text-xs mt-2">
                  {`GET /api/phr/patients/123 HTTP/1.1
Host: api.smarthealthhub.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json`}
                </pre>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">API Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge className="h-2 w-2 rounded-full p-0 bg-blue-500" />
                      Core Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-sm text-muted-foreground">
                      PHR, Consent, User Directory, Master Person/Patient Index
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge className="h-2 w-2 rounded-full p-0 bg-green-500" />
                      Claims Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-sm text-muted-foreground">
                      Claims Processing, Prior Authorization, Goldcarding, Eligibility
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge className="h-2 w-2 rounded-full p-0 bg-purple-500" />
                      Infrastructure Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-sm text-muted-foreground">
                      Audit, Notifications, Observability, Integration Gateway
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge className="h-2 w-2 rounded-full p-0 bg-amber-500" />
                      External Integrations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-sm text-muted-foreground">
                      FHIR API, HL7v2, X12 EDI, SMART on FHIR
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">Code Examples</h3>
              
              <div className="bg-muted rounded-md overflow-hidden">
                <div className="flex border-b">
                  <div className="flex">
                    {Object.entries(codeSamplesByLanguage).map(([key, value]) => (
                      <button
                        key={key}
                        className={`px-4 py-2 text-sm font-medium ${currentLanguage === key ? 'bg-background text-foreground' : 'text-muted-foreground'}`}
                        onClick={() => setCurrentLanguage(key)}
                      >
                        {value.title}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto">
                    <button 
                      className="p-2 text-muted-foreground hover:text-foreground"
                      onClick={() => copyToClipboard(codeSamplesByLanguage[currentLanguage].code)}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <pre className="p-4 text-xs overflow-auto whitespace-pre">
                  <code>{codeSamplesByLanguage[currentLanguage].code}</code>
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search APIs by name, description, or category..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="core" className="space-y-4">
            <TabsList>
              <TabsTrigger value="core">Core APIs</TabsTrigger>
              <TabsTrigger value="claims">Claims APIs</TabsTrigger>
              <TabsTrigger value="infrastructure">Infrastructure APIs</TabsTrigger>
              <TabsTrigger value="external">External Integrations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="core" className="space-y-4">
              {filterApis(coreApis, searchQuery).map((api) => (
                <ApiCard key={api.name} api={api} />
              ))}
              
              {filterApis(coreApis, searchQuery).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No API endpoints match your search criteria.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="claims" className="space-y-4">
              {filterApis(claimsApis, searchQuery).map((api) => (
                <ApiCard key={api.name} api={api} />
              ))}
              
              {filterApis(claimsApis, searchQuery).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No API endpoints match your search criteria.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="infrastructure" className="space-y-4">
              {filterApis(integrationApis, searchQuery).map((api) => (
                <ApiCard key={api.name} api={api} />
              ))}
              
              {filterApis(integrationApis, searchQuery).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No API endpoints match your search criteria.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="external" className="space-y-4">
              {filterApis(externalApis, searchQuery).map((api) => (
                <ApiCard key={api.name} api={api} />
              ))}
              
              {filterApis(externalApis, searchQuery).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No API endpoints match your search criteria.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

// API Card Component
const ApiCard = ({ api }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Getting category badge color
  const getCategoryBadgeColor = (category) => {
    switch (category) {
      case 'Core':
        return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      case 'Claims':
        return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
      case 'Infrastructure':
        return 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20';
      case 'Integration':
        return 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20';
      case 'External Integration':
        return 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
    }
  };
  
  // Getting method badge color
  const getMethodBadgeColor = (method) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'POST':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'PUT':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'DELETE':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <CardTitle>{api.name}</CardTitle>
          <Badge className={`${getCategoryBadgeColor(api.category)}`}>
            {api.category}
          </Badge>
        </div>
        <CardDescription>{api.description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <Accordion type="single" collapsible className="w-full">
          {api.endpoints.map((endpoint, index) => (
            <AccordionItem value={`${endpoint.method}-${endpoint.path}-${index}`} key={`${endpoint.method}-${endpoint.path}-${index}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center text-left">
                  <Badge className={`${getMethodBadgeColor(endpoint.method)} mr-2 min-w-16 justify-center border`}>{endpoint.method}</Badge>
                  <span className="text-sm font-mono truncate">{endpoint.path}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 pb-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Parameters</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Name</TableHead>
                          <TableHead className="w-[100px]">Type</TableHead>
                          <TableHead className="w-[100px]">Required</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {endpoint.params.length > 0 ? (
                          endpoint.params.map((param, pIdx) => (
                            <TableRow key={`${param.name}-${pIdx}`}>
                              <TableCell className="font-mono text-xs">{param.name}</TableCell>
                              <TableCell className="text-xs">{param.type}</TableCell>
                              <TableCell>
                                {param.required ? (
                                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                                    Required
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                                    Optional
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{param.description}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-xs text-muted-foreground">
                              No parameters required
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Responses</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Status Code</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {endpoint.responses.map((response, rIdx) => (
                          <TableRow key={`${response.code}-${rIdx}`}>
                            <TableCell className="font-mono text-xs">{response.code}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{response.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex items-center text-sm">
                      <FileJson className="h-4 w-4 mr-2" />
                      <span className="font-medium">Request Example</span>
                    </div>
                    <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto">
                      {`// Example request
fetch('${endpoint.path.replace(/\{([^}]+)\}/g, '123')}', {
  method: '${endpoint.method}',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
  }${endpoint.method !== 'GET' ? `,
  body: JSON.stringify({
    // Request payload
  })` : ''}
})`}
                    </pre>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? "Show Less" : `Show All Endpoints (${api.endpoints.length})`}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ApiDocumentationPage;