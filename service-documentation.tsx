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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, ChevronRight, Server, Database, Shield, Zap, ExternalLink } from 'lucide-react';

const ServiceDocumentationPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter services based on search query
  const filterServices = (services, query) => {
    if (!query) return services;
    
    return services.filter(service => 
      service.name.toLowerCase().includes(query.toLowerCase()) ||
      service.description.toLowerCase().includes(query.toLowerCase()) ||
      service.category.toLowerCase().includes(query.toLowerCase())
    );
  };

  // Core Services
  const coreServices = [
    {
      id: "phr-service",
      name: "Personal Health Record (PHR) Service",
      category: "Core",
      description: "Manages personal health records with full FHIR R4 compatibility",
      architecture: {
        components: [
          {
            name: "FHIR Resource Manager",
            description: "Handles CRUD operations for all FHIR resources with versioning support"
          },
          {
            name: "Search Engine",
            description: "Implements FHIR search specification with comprehensive query capabilities"
          },
          {
            name: "Document Handler",
            description: "Processes and stores structured and unstructured clinical documents"
          },
          {
            name: "Validation Engine",
            description: "Validates resources against profiles and implementation guides"
          },
          {
            name: "Subscription Service",
            description: "Manages FHIR subscriptions for real-time notifications"
          }
        ],
        dataModel: [
          {
            entity: "FHIR Resources",
            description: "All standard FHIR R4 resources (Patient, Observation, Condition, etc.)",
            attributes: ["resource_type", "id", "version", "last_updated", "resource_content (JSONB)"]
          },
          {
            entity: "Resource History",
            description: "Historical versions of FHIR resources",
            attributes: ["resource_id", "version", "content", "changed_by", "changed_at"]
          },
          {
            entity: "Resource References",
            description: "Normalized references between resources for efficient querying",
            attributes: ["source_resource_id", "target_resource_id", "reference_type"]
          },
          {
            entity: "Search Parameters",
            description: "Indexed search parameters for efficient querying",
            attributes: ["resource_type", "parameter_name", "parameter_value", "resource_id"]
          }
        ],
        patterns: [
          {
            name: "Clean Domain Model",
            description: "Uses domain-driven design principles with clear entity boundaries"
          },
          {
            name: "Repository Pattern",
            description: "Abstracts data access through repository interfaces"
          },
          {
            name: "Command Query Responsibility Segregation (CQRS)",
            description: "Separates read and write operations for optimized performance"
          },
          {
            name: "Event Sourcing",
            description: "Records all state changes as a sequence of events for accurate history tracking"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "Consent Service",
            description: "Verifies access permissions for PHR data"
          },
          {
            name: "Audit Service",
            description: "Records all data access and modifications"
          },
          {
            name: "Master Patient Index",
            description: "Resolves patient identities across systems"
          }
        ],
        external: [
          {
            name: "FHIR REST API",
            description: "Standard FHIR RESTful API for external systems"
          },
          {
            name: "Bulk Data API",
            description: "FHIR Bulk Data Access for population-level operations"
          }
        ]
      },
      configuration: [
        {
          parameter: "FHIR_VERSION",
          description: "FHIR version (default: R4)",
          defaultValue: "R4"
        },
        {
          parameter: "VALIDATION_LEVEL",
          description: "Resource validation level (none, basic, profile)",
          defaultValue: "basic"
        },
        {
          parameter: "MAX_PAGE_SIZE",
          description: "Maximum page size for search results",
          defaultValue: "100"
        },
        {
          parameter: "HISTORY_RETENTION_DAYS",
          description: "Days to retain resource history",
          defaultValue: "730" // 2 years
        }
      ],
      documentation: [
        {
          title: "Implementation Guide",
          url: "https://docs.smarthealthhub.com/phr-service/implementation-guide"
        },
        {
          title: "API Reference",
          url: "https://docs.smarthealthhub.com/phr-service/api-reference"
        },
        {
          title: "FHIR Profile Conformance",
          url: "https://docs.smarthealthhub.com/phr-service/fhir-profiles"
        }
      ]
    },
    {
      id: "consent-service",
      name: "Universal Consent Service",
      category: "Core",
      description: "Central Policy Decision Point (PDP) for all consent management and enforcement",
      architecture: {
        components: [
          {
            name: "Consent Registry",
            description: "Stores and indexes consent directives and policies"
          },
          {
            name: "Policy Decision Engine",
            description: "Evaluates access requests against consent policies"
          },
          {
            name: "Consent Workflow Manager",
            description: "Handles consent capture, update, and revocation processes"
          },
          {
            name: "Notification Service",
            description: "Sends consent-related notifications to patients and providers"
          },
          {
            name: "Consent Verification API",
            description: "External API for consent verification by other services"
          }
        ],
        dataModel: [
          {
            entity: "Consent Policies",
            description: "Structured consent rules and policies",
            attributes: ["policy_id", "patient_id", "scope", "purpose", "data_categories", "authorized_parties"]
          },
          {
            entity: "Consent Decisions",
            description: "Records of consent decision evaluations",
            attributes: ["decision_id", "consent_id", "requester", "resource", "decision", "timestamp"]
          },
          {
            entity: "Consent Attestations",
            description: "Evidence of consent agreement (e.g., signatures)",
            attributes: ["attestation_id", "consent_id", "attestation_type", "evidence", "timestamp"]
          },
          {
            entity: "Consent Notification Log",
            description: "Records of consent-related notifications",
            attributes: ["notification_id", "consent_id", "recipient", "notification_type", "timestamp"]
          }
        ],
        patterns: [
          {
            name: "Policy Enforcement Point (PEP)",
            description: "Intercepts access requests and enforces policy decisions"
          },
          {
            name: "Policy Decision Point (PDP)",
            description: "Makes access decisions based on policies and context"
          },
          {
            name: "Policy Information Point (PIP)",
            description: "Provides additional context for decision making"
          },
          {
            name: "Attribute-Based Access Control (ABAC)",
            description: "Uses attributes of subjects, resources, and context for decisions"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "PHR Service",
            description: "Provides access control for health records"
          },
          {
            name: "Audit Service",
            description: "Records all consent decisions and changes"
          },
          {
            name: "Notification Service",
            description: "Delivers consent-related notifications"
          }
        ],
        external: [
          {
            name: "Consent API",
            description: "RESTful API for consent management"
          },
          {
            name: "Consent Verification API",
            description: "API for external systems to verify consent"
          }
        ]
      },
      configuration: [
        {
          parameter: "DECISION_CACHE_TTL",
          description: "Time to live for cached consent decisions (seconds)",
          defaultValue: "300"
        },
        {
          parameter: "DEFAULT_CONSENT_EXPIRY",
          description: "Default expiration period for consents (days)",
          defaultValue: "365"
        },
        {
          parameter: "CONSENT_REQUEST_TIMEOUT",
          description: "Maximum time for patient to respond to consent requests (days)",
          defaultValue: "30"
        },
        {
          parameter: "EMERGENCY_OVERRIDE_ENABLED",
          description: "Enable break-glass emergency access override",
          defaultValue: "true"
        }
      ],
      documentation: [
        {
          title: "Consent Model Guide",
          url: "https://docs.smarthealthhub.com/consent-service/model-guide"
        },
        {
          title: "API Reference",
          url: "https://docs.smarthealthhub.com/consent-service/api-reference"
        },
        {
          title: "Regulatory Compliance",
          url: "https://docs.smarthealthhub.com/consent-service/compliance"
        }
      ]
    },
    {
      id: "user-directory-service",
      name: "User Directory Service",
      category: "Core",
      description: "Manages user accounts, authentication, and authorization across the platform",
      architecture: {
        components: [
          {
            name: "Identity Provider",
            description: "Handles authentication and issues security tokens"
          },
          {
            name: "User Registry",
            description: "Stores and manages user profile information"
          },
          {
            name: "Role Manager",
            description: "Manages role definitions and assignments"
          },
          {
            name: "MFA Provider",
            description: "Implements multi-factor authentication methods"
          },
          {
            name: "Token Service",
            description: "Issues and validates JWT tokens for API access"
          }
        ],
        dataModel: [
          {
            entity: "Users",
            description: "Core user account information",
            attributes: ["user_id", "username", "email", "status", "password_hash", "created_at"]
          },
          {
            entity: "User Profiles",
            description: "Extended user profile information",
            attributes: ["profile_id", "user_id", "first_name", "last_name", "phone", "address"]
          },
          {
            entity: "Roles",
            description: "Role definitions for access control",
            attributes: ["role_id", "name", "description", "permissions"]
          },
          {
            entity: "User Roles",
            description: "Role assignments for users",
            attributes: ["user_id", "role_id", "scope", "assigned_at", "assigned_by"]
          },
          {
            entity: "MFA Devices",
            description: "Registered MFA devices for users",
            attributes: ["device_id", "user_id", "device_type", "registration_date"]
          }
        ],
        patterns: [
          {
            name: "Identity as a Service (IDaaS)",
            description: "Centralized identity management for all platform components"
          },
          {
            name: "Role-Based Access Control (RBAC)",
            description: "Access control based on assigned roles"
          },
          {
            name: "JWT Authentication",
            description: "Stateless authentication using signed JSON Web Tokens"
          },
          {
            name: "OAuth 2.0/OIDC",
            description: "Standard protocols for authentication and authorization"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "All Services",
            description: "Provides authentication and authorization for all platform services"
          },
          {
            name: "Audit Service",
            description: "Records all authentication and authorization events"
          },
          {
            name: "Master Person Index",
            description: "Links user accounts to person records"
          }
        ],
        external: [
          {
            name: "Authentication API",
            description: "API for user authentication and token management"
          },
          {
            name: "User Management API",
            description: "API for managing user accounts and profiles"
          },
          {
            name: "OIDC Endpoints",
            description: "Standard OIDC endpoints for external authentication"
          }
        ]
      },
      configuration: [
        {
          parameter: "TOKEN_EXPIRY",
          description: "Access token expiration time (minutes)",
          defaultValue: "60"
        },
        {
          parameter: "REFRESH_TOKEN_EXPIRY",
          description: "Refresh token expiration time (days)",
          defaultValue: "30"
        },
        {
          parameter: "PASSWORD_POLICY",
          description: "Password complexity policy (basic, standard, strict)",
          defaultValue: "standard"
        },
        {
          parameter: "MFA_REQUIRED",
          description: "Whether MFA is required for all users",
          defaultValue: "true"
        },
        {
          parameter: "ACCOUNT_LOCKOUT_THRESHOLD",
          description: "Failed login attempts before account lockout",
          defaultValue: "5"
        }
      ],
      documentation: [
        {
          title: "Authentication Guide",
          url: "https://docs.smarthealthhub.com/user-directory/authentication"
        },
        {
          title: "Authorization Model",
          url: "https://docs.smarthealthhub.com/user-directory/authorization"
        },
        {
          title: "API Reference",
          url: "https://docs.smarthealthhub.com/user-directory/api-reference"
        }
      ]
    },
    {
      id: "master-person-index",
      name: "Master Person/Patient Index",
      category: "Core",
      description: "Provides robust person identification and record linkage capabilities",
      architecture: {
        components: [
          {
            name: "Identity Registry",
            description: "Stores and indexes person demographic information"
          },
          {
            name: "Matching Engine",
            description: "Implements probabilistic and deterministic matching algorithms"
          },
          {
            name: "Identity Resolution",
            description: "Resolves duplicate records and manages identity merges"
          },
          {
            name: "Cross-Reference Registry",
            description: "Maintains mappings between local and external identifiers"
          },
          {
            name: "Search API",
            description: "Provides advanced search capabilities for person records"
          }
        ],
        dataModel: [
          {
            entity: "Persons",
            description: "Core demographic information for individuals",
            attributes: ["person_id", "name_parts", "birth_date", "gender", "contact_info", "metadata"]
          },
          {
            entity: "Person Identifiers",
            description: "Various identifiers for a person across systems",
            attributes: ["identifier_id", "person_id", "identifier_type", "identifier_value", "assigning_authority"]
          },
          {
            entity: "Patients",
            description: "Patient-specific information linked to persons",
            attributes: ["patient_id", "person_id", "medical_record_number", "status", "registration_date"]
          },
          {
            entity: "Identity Links",
            description: "Links between potentially duplicate person records",
            attributes: ["link_id", "person_id_1", "person_id_2", "match_score", "link_status", "link_date"]
          },
          {
            entity: "Match Audit",
            description: "Audit trail of matching decisions",
            attributes: ["audit_id", "operation", "person_ids", "match_details", "user_id", "timestamp"]
          }
        ],
        patterns: [
          {
            name: "Entity Resolution",
            description: "Identifies and resolves duplicate entity records"
          },
          {
            name: "Probabilistic Matching",
            description: "Uses statistical methods to calculate match probability"
          },
          {
            name: "Master Data Management",
            description: "Centralizes management of core identity data"
          },
          {
            name: "Reference Data Service",
            description: "Provides authoritative identity reference data"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "PHR Service",
            description: "Resolves patient identities for health records"
          },
          {
            name: "Claims Service",
            description: "Validates patient identities for claims processing"
          },
          {
            name: "User Directory Service",
            description: "Links user accounts to person records"
          }
        ],
        external: [
          {
            name: "Person/Patient API",
            description: "API for person and patient identity management"
          },
          {
            name: "Matching API",
            description: "API for record matching and resolution"
          },
          {
            name: "PDQ/PIX Interface",
            description: "IHE Patient Demographics Query and Cross-Reference interfaces"
          }
        ]
      },
      configuration: [
        {
          parameter: "MATCHING_THRESHOLD",
          description: "Minimum score for automatic matching (0-100)",
          defaultValue: "90"
        },
        {
          parameter: "REVIEW_THRESHOLD",
          description: "Score threshold for manual review (0-100)",
          defaultValue: "75"
        },
        {
          parameter: "DEMOGRAPHIC_WEIGHTS",
          description: "Relative weights for demographic fields in matching",
          defaultValue: "name:40,birthdate:30,gender:5,address:15,phone:10"
        },
        {
          parameter: "AUTO_MERGE_ENABLED",
          description: "Enable automatic merging of high-confidence matches",
          defaultValue: "false"
        }
      ],
      documentation: [
        {
          title: "Matching Algorithm Guide",
          url: "https://docs.smarthealthhub.com/mpi/matching-algorithm"
        },
        {
          title: "API Reference",
          url: "https://docs.smarthealthhub.com/mpi/api-reference"
        },
        {
          title: "Data Governance",
          url: "https://docs.smarthealthhub.com/mpi/data-governance"
        }
      ]
    }
  ];
  
  // Claims and Authorization Services
  const claimsServices = [
    {
      id: "claims-processing-service",
      name: "Claims Processing Service",
      category: "Claims",
      description: "Handles claim submission, tracking, and processing with dual-path architecture",
      architecture: {
        components: [
          {
            name: "Claim Intake",
            description: "Receives and validates incoming claims"
          },
          {
            name: "Routing Engine",
            description: "Determines processing path (direct or payer-forwarded)"
          },
          {
            name: "Validation Engine",
            description: "Validates claims against business rules and payer requirements"
          },
          {
            name: "AI Enhancement",
            description: "Uses AI to improve claim accuracy and completeness"
          },
          {
            name: "Status Tracker",
            description: "Monitors claim status throughout the processing lifecycle"
          }
        ],
        dataModel: [
          {
            entity: "Claims",
            description: "Core claim information",
            attributes: ["claim_id", "patient_id", "provider_id", "payer_id", "service_date", "status"]
          },
          {
            entity: "Claim Line Items",
            description: "Individual service lines within claims",
            attributes: ["line_id", "claim_id", "service_code", "quantity", "charge_amount", "diagnosis_pointers"]
          },
          {
            entity: "Claim Events",
            description: "Processing events in claim lifecycle",
            attributes: ["event_id", "claim_id", "event_type", "timestamp", "status", "notes"]
          },
          {
            entity: "Claim Documents",
            description: "Supporting documentation for claims",
            attributes: ["document_id", "claim_id", "document_type", "content_reference", "upload_date"]
          },
          {
            entity: "Payer Responses",
            description: "Responses received from payers",
            attributes: ["response_id", "claim_id", "payer_id", "response_date", "status", "details"]
          }
        ],
        patterns: [
          {
            name: "Dual-Path Processing",
            description: "Supports both direct processing and payer forwarding paths"
          },
          {
            name: "Event-Driven Architecture",
            description: "Uses events to track claim state transitions"
          },
          {
            name: "Saga Pattern",
            description: "Manages distributed transactions for claim processing steps"
          },
          {
            name: "CQRS",
            description: "Separates claim submission from status querying"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "Eligibility Service",
            description: "Verifies patient eligibility for claims"
          },
          {
            name: "Goldcarding Service",
            description: "Checks provider goldcarding status for expedited processing"
          },
          {
            name: "PHR Service",
            description: "Retrieves clinical information for claims"
          }
        ],
        external: [
          {
            name: "Claims API",
            description: "API for claim submission and tracking"
          },
          {
            name: "Payer Gateways",
            description: "Interfaces to external payer systems"
          },
          {
            name: "X12 EDI Interface",
            description: "Standard X12 837/835 interface for claims and remittance"
          }
        ]
      },
      configuration: [
        {
          parameter: "DEFAULT_PROCESSING_PATH",
          description: "Default processing path (direct, payer)",
          defaultValue: "direct"
        },
        {
          parameter: "AUTO_ADJUDICATION_ENABLED",
          description: "Enable automatic adjudication for eligible claims",
          defaultValue: "true"
        },
        {
          parameter: "VALIDATION_LEVEL",
          description: "Claim validation level (basic, standard, strict)",
          defaultValue: "standard"
        },
        {
          parameter: "AI_ENHANCEMENT_ENABLED",
          description: "Enable AI enhancement for claims",
          defaultValue: "true"
        }
      ],
      documentation: [
        {
          title: "Claims Processing Guide",
          url: "https://docs.smarthealthhub.com/claims/processing-guide"
        },
        {
          title: "Dual-Path Architecture",
          url: "https://docs.smarthealthhub.com/claims/dual-path"
        },
        {
          title: "API Reference",
          url: "https://docs.smarthealthhub.com/claims/api-reference"
        }
      ]
    },
    {
      id: "prior-auth-service",
      name: "Prior Authorization Service",
      category: "Claims",
      description: "Manages prior authorization requests with dual-path design",
      architecture: {
        components: [
          {
            name: "Request Intake",
            description: "Receives and validates authorization requests"
          },
          {
            name: "Path Selector",
            description: "Determines processing path (hub-run or pass-through)"
          },
          {
            name: "Rules Engine",
            description: "Evaluates local rules for hub-run authorizations"
          },
          {
            name: "Payer Gateway",
            description: "Forwards requests to payers for pass-through processing"
          },
          {
            name: "Status Tracker",
            description: "Monitors authorization status throughout lifecycle"
          }
        ],
        dataModel: [
          {
            entity: "Authorization Requests",
            description: "Core authorization request information",
            attributes: ["auth_id", "patient_id", "provider_id", "payer_id", "service_codes", "status"]
          },
          {
            entity: "Auth Request Items",
            description: "Individual service items within authorization requests",
            attributes: ["item_id", "auth_id", "service_code", "quantity", "diagnosis_codes"]
          },
          {
            entity: "Auth Events",
            description: "Processing events in authorization lifecycle",
            attributes: ["event_id", "auth_id", "event_type", "timestamp", "status", "notes"]
          },
          {
            entity: "Supporting Documents",
            description: "Clinical documentation supporting authorization requests",
            attributes: ["document_id", "auth_id", "document_type", "content_reference", "upload_date"]
          },
          {
            entity: "Determination Responses",
            description: "Authorization decisions",
            attributes: ["response_id", "auth_id", "decision", "effective_dates", "approved_items", "notes"]
          }
        ],
        patterns: [
          {
            name: "Dual-Path Processing",
            description: "Supports both hub-run and pass-through processing paths"
          },
          {
            name: "Business Rules Engine",
            description: "Applies configurable rules for authorization decisions"
          },
          {
            name: "Event-Driven Architecture",
            description: "Uses events to track authorization state transitions"
          },
          {
            name: "Document-Based Workflow",
            description: "Manages clinical document collection and review"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "Eligibility Service",
            description: "Verifies patient eligibility for requested services"
          },
          {
            name: "Goldcarding Service",
            description: "Checks provider goldcarding status for automatic approvals"
          },
          {
            name: "PHR Service",
            description: "Retrieves clinical information for authorization evaluation"
          }
        ],
        external: [
          {
            name: "Prior Auth API",
            description: "API for authorization submission and tracking"
          },
          {
            name: "Payer Gateways",
            description: "Interfaces to external payer systems"
          },
          {
            name: "X12 278 Interface",
            description: "Standard X12 278 interface for authorization transactions"
          }
        ]
      },
      configuration: [
        {
          parameter: "DEFAULT_PROCESSING_PATH",
          description: "Default processing path (hub, payer)",
          defaultValue: "hub"
        },
        {
          parameter: "RULES_UPDATE_FREQUENCY",
          description: "Frequency of rules updates (hours)",
          defaultValue: "24"
        },
        {
          parameter: "AUTO_APPROVAL_ENABLED",
          description: "Enable automatic approval for eligible requests",
          defaultValue: "true"
        },
        {
          parameter: "DOCUMENT_REQUIREMENT_CHECK",
          description: "Check for required supporting documentation",
          defaultValue: "true"
        }
      ],
      documentation: [
        {
          title: "Prior Auth Guide",
          url: "https://docs.smarthealthhub.com/prior-auth/guide"
        },
        {
          title: "Dual-Path Design",
          url: "https://docs.smarthealthhub.com/prior-auth/dual-path"
        },
        {
          title: "API Reference",
          url: "https://docs.smarthealthhub.com/prior-auth/api-reference"
        }
      ]
    },
    {
      id: "goldcarding-service",
      name: "Goldcarding Service",
      category: "Claims",
      description: "Implements provider goldcarding to streamline prior authorizations and claims",
      architecture: {
        components: [
          {
            name: "Eligibility Engine",
            description: "Determines provider eligibility for goldcarding"
          },
          {
            name: "Rules Registry",
            description: "Manages goldcarding rules by payer and service"
          },
          {
            name: "Verification API",
            description: "Verifies goldcarding status for specific services"
          },
          {
            name: "Performance Analytics",
            description: "Tracks provider performance metrics for goldcarding"
          },
          {
            name: "Renewal Manager",
            description: "Handles automatic and manual goldcarding renewals"
          }
        ],
        dataModel: [
          {
            entity: "Provider Profiles",
            description: "Provider information for goldcarding eligibility",
            attributes: ["provider_id", "specialties", "credentials", "practice_location", "metrics"]
          },
          {
            entity: "Service Eligibility",
            description: "Services eligible for goldcarding by provider and payer",
            attributes: ["eligibility_id", "provider_id", "payer_id", "service_code", "status", "effective_dates"]
          },
          {
            entity: "Goldcarding Rules",
            description: "Rules defining goldcarding eligibility criteria",
            attributes: ["rule_id", "payer_id", "service_code", "criteria", "threshold_values"]
          },
          {
            entity: "Performance Metrics",
            description: "Provider performance metrics for goldcarding decisions",
            attributes: ["metric_id", "provider_id", "metric_type", "period", "value"]
          },
          {
            entity: "Goldcarding Events",
            description: "Events in goldcarding lifecycle",
            attributes: ["event_id", "provider_id", "payer_id", "event_type", "service_code", "timestamp"]
          }
        ],
        patterns: [
          {
            name: "Rules Engine",
            description: "Applies configurable rules for goldcarding decisions"
          },
          {
            name: "Provider Reputation System",
            description: "Builds and tracks provider reputation metrics"
          },
          {
            name: "Expiration Management",
            description: "Manages time-bound goldcarding statuses"
          },
          {
            name: "Service-Specific Approvals",
            description: "Granular goldcarding at the service code level"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "Prior Auth Service",
            description: "Provides goldcarding status for authorization decisions"
          },
          {
            name: "Claims Service",
            description: "Verifies goldcarding status for claims processing"
          },
          {
            name: "Analytics Service",
            description: "Provides performance metrics for goldcarding decisions"
          }
        ],
        external: [
          {
            name: "Goldcarding API",
            description: "API for goldcarding status management and verification"
          },
          {
            name: "Payer Integration",
            description: "Integration with payer systems for goldcarding recognition"
          }
        ]
      },
      configuration: [
        {
          parameter: "PERFORMANCE_REVIEW_PERIOD",
          description: "Period for provider performance review (days)",
          defaultValue: "90"
        },
        {
          parameter: "AUTO_RENEWAL_ENABLED",
          description: "Enable automatic renewal for qualifying providers",
          defaultValue: "true"
        },
        {
          parameter: "DEFAULT_GOLDCARD_DURATION",
          description: "Default goldcarding status duration (days)",
          defaultValue: "365"
        },
        {
          parameter: "METRICS_UPDATE_FREQUENCY",
          description: "Frequency of provider metrics updates (hours)",
          defaultValue: "24"
        }
      ],
      documentation: [
        {
          title: "Goldcarding Guide",
          url: "https://docs.smarthealthhub.com/goldcarding/guide"
        },
        {
          title: "Provider Integration",
          url: "https://docs.smarthealthhub.com/goldcarding/provider-integration"
        },
        {
          title: "API Reference",
          url: "https://docs.smarthealthhub.com/goldcarding/api-reference"
        }
      ]
    },
    {
      id: "eligibility-service",
      name: "Eligibility & Benefits Service",
      category: "Claims",
      description: "Provides real-time eligibility verification and benefits information",
      architecture: {
        components: [
          {
            name: "Verification Engine",
            description: "Processes eligibility verification requests"
          },
          {
            name: "Payer Gateway",
            description: "Integrates with payer systems for real-time verification"
          },
          {
            name: "Benefits Interpreter",
            description: "Parses and normalizes benefits information"
          },
          {
            name: "Coverage Registry",
            description: "Caches and indexes coverage information"
          },
          {
            name: "Estimator Service",
            description: "Estimates patient financial responsibility"
          }
        ],
        dataModel: [
          {
            entity: "Verification Requests",
            description: "Eligibility verification request details",
            attributes: ["request_id", "patient_id", "provider_id", "payer_id", "service_types", "timestamp"]
          },
          {
            entity: "Verification Responses",
            description: "Eligibility verification results",
            attributes: ["response_id", "request_id", "status", "coverage_status", "plan_information", "raw_response"]
          },
          {
            entity: "Coverage Information",
            description: "Patient coverage details",
            attributes: ["coverage_id", "patient_id", "payer_id", "plan_id", "effective_dates", "status"]
          },
          {
            entity: "Benefit Information",
            description: "Detailed benefit information by service type",
            attributes: ["benefit_id", "coverage_id", "service_type", "in_network", "out_network", "details"]
          },
          {
            entity: "Financial Estimates",
            description: "Estimated patient responsibility calculations",
            attributes: ["estimate_id", "patient_id", "service_codes", "total_estimated_cost", "patient_responsibility"]
          }
        ],
        patterns: [
          {
            name: "Real-Time Integration",
            description: "Synchronous integration with payer systems"
          },
          {
            name: "Caching Strategy",
            description: "Caches verification results with appropriate TTL"
          },
          {
            name: "Fallback Processing",
            description: "Provides degraded service when payers are unavailable"
          },
          {
            name: "Normalization Engine",
            description: "Normalizes diverse payer response formats"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "Prior Auth Service",
            description: "Provides eligibility information for authorization decisions"
          },
          {
            name: "Claims Service",
            description: "Verifies eligibility for claims submission"
          },
          {
            name: "PHR Service",
            description: "Retrieves patient demographics for verification"
          }
        ],
        external: [
          {
            name: "Eligibility API",
            description: "API for eligibility verification and benefits inquiries"
          },
          {
            name: "Payer Gateways",
            description: "Integration with payer eligibility systems"
          },
          {
            name: "X12 270/271 Interface",
            description: "Standard X12 interface for eligibility transactions"
          }
        ]
      },
      configuration: [
        {
          parameter: "VERIFICATION_CACHE_TTL",
          description: "Time to live for cached verification results (minutes)",
          defaultValue: "60"
        },
        {
          parameter: "DEFAULT_TIMEOUT",
          description: "Default timeout for payer responses (seconds)",
          defaultValue: "30"
        },
        {
          parameter: "FALLBACK_MODE",
          description: "Fallback mode when payers are unavailable (none, cached, estimated)",
          defaultValue: "cached"
        },
        {
          parameter: "COVERAGE_REFRESH_PERIOD",
          description: "Period for background coverage refreshes (hours)",
          defaultValue: "24"
        }
      ],
      documentation: [
        {
          title: "Eligibility Verification Guide",
          url: "https://docs.smarthealthhub.com/eligibility/verification-guide"
        },
        {
          title: "Benefits Interpretation",
          url: "https://docs.smarthealthhub.com/eligibility/benefits-interpretation"
        },
        {
          title: "API Reference",
          url: "https://docs.smarthealthhub.com/eligibility/api-reference"
        }
      ]
    }
  ];
  
  // Integration and Infrastructure Services
  const infrastructureServices = [
    {
      id: "integration-gateway",
      name: "Integration Gateway Service",
      category: "Integration",
      description: "Provides secure connectivity to external healthcare systems",
      architecture: {
        components: [
          {
            name: "Protocol Adapters",
            description: "Supports multiple integration protocols (FHIR, HL7v2, X12)"
          },
          {
            name: "Transformation Engine",
            description: "Converts between different data formats and standards"
          },
          {
            name: "Connection Manager",
            description: "Manages and monitors external system connections"
          },
          {
            name: "API Gateway",
            description: "Provides unified API access to external systems"
          },
          {
            name: "Security Layer",
            description: "Implements authentication, authorization, and encryption"
          }
        ],
        dataModel: [
          {
            entity: "Connections",
            description: "External system connection configurations",
            attributes: ["connection_id", "name", "system_type", "protocol", "credentials_ref", "status"]
          },
          {
            entity: "Endpoints",
            description: "Endpoint definitions for connections",
            attributes: ["endpoint_id", "connection_id", "endpoint_type", "url", "protocols", "authentication"]
          },
          {
            entity: "Transformations",
            description: "Data transformation mappings",
            attributes: ["mapping_id", "source_format", "target_format", "mapping_definition", "version"]
          },
          {
            entity: "Transaction Log",
            description: "Log of all integration transactions",
            attributes: ["transaction_id", "connection_id", "direction", "timestamp", "status", "message_type"]
          },
          {
            entity: "API Keys",
            description: "API keys for external system access",
            attributes: ["key_id", "key_hash", "owner", "permissions", "created_at", "expires_at"]
          }
        ],
        patterns: [
          {
            name: "API Gateway",
            description: "Unified entry point for all integration traffic"
          },
          {
            name: "Adapter Pattern",
            description: "Protocol-specific adapters for different standards"
          },
          {
            name: "Circuit Breaker",
            description: "Prevents cascading failures from external system issues"
          },
          {
            name: "Message Transformation",
            description: "Bidirectional mapping between different data formats"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "All Services",
            description: "Provides external connectivity for all platform services"
          },
          {
            name: "Audit Service",
            description: "Records all integration activities"
          },
          {
            name: "Observability Service",
            description: "Monitors integration performance and health"
          }
        ],
        external: [
          {
            name: "FHIR API",
            description: "FHIR R4 API for clinical data exchange"
          },
          {
            name: "HL7v2 Interface",
            description: "Traditional HL7v2 messaging interface"
          },
          {
            name: "X12 EDI Gateway",
            description: "X12 transactions for claims and administrative data"
          }
        ]
      },
      configuration: [
        {
          parameter: "CONNECTION_TIMEOUT",
          description: "Default connection timeout (seconds)",
          defaultValue: "30"
        },
        {
          parameter: "RETRY_ATTEMPTS",
          description: "Number of retry attempts for failed connections",
          defaultValue: "3"
        },
        {
          parameter: "CIRCUIT_BREAKER_THRESHOLD",
          description: "Failure threshold for circuit breaker activation",
          defaultValue: "5"
        },
        {
          parameter: "KEY_ROTATION_PERIOD",
          description: "Period for API key rotation (days)",
          defaultValue: "90"
        }
      ],
      documentation: [
        {
          title: "Integration Guide",
          url: "https://docs.smarthealthhub.com/integration/guide"
        },
        {
          title: "Protocol Support",
          url: "https://docs.smarthealthhub.com/integration/protocols"
        },
        {
          title: "API Reference",
          url: "https://docs.smarthealthhub.com/integration/api-reference"
        }
      ]
    },
    {
      id: "audit-service",
      name: "Audit Service",
      category: "Infrastructure",
      description: "Captures comprehensive audit trails for all system activities",
      architecture: {
        components: [
          {
            name: "Audit Collector",
            description: "Collects audit events from all platform components"
          },
          {
            name: "Storage Engine",
            description: "Securely stores audit records with tamper detection"
          },
          {
            name: "Compliance Reporter",
            description: "Generates compliance reports from audit data"
          },
          {
            name: "Search API",
            description: "Provides search capabilities for audit records"
          },
          {
            name: "Retention Manager",
            description: "Implements retention policies for audit data"
          }
        ],
        dataModel: [
          {
            entity: "Audit Events",
            description: "Core audit event records",
            attributes: ["event_id", "timestamp", "actor", "action", "resource", "outcome", "context"]
          },
          {
            entity: "Data Access Events",
            description: "Records of data access operations",
            attributes: ["access_id", "event_id", "resource_type", "resource_id", "access_type", "purpose"]
          },
          {
            entity: "Data Change Events",
            description: "Records of data modification operations",
            attributes: ["change_id", "event_id", "resource_type", "resource_id", "change_type", "before", "after"]
          },
          {
            entity: "Retention Policies",
            description: "Policies for audit data retention",
            attributes: ["policy_id", "event_type", "retention_period", "policy_reason"]
          },
          {
            entity: "Audit Export Log",
            description: "Records of audit data exports",
            attributes: ["export_id", "user_id", "export_criteria", "timestamp", "reason"]
          }
        ],
        patterns: [
          {
            name: "Event Sourcing",
            description: "Records all system events as immutable audit records"
          },
          {
            name: "Append-Only Store",
            description: "Implements append-only storage for audit integrity"
          },
          {
            name: "Cryptographic Verification",
            description: "Uses cryptographic techniques to ensure audit integrity"
          },
          {
            name: "Retention Management",
            description: "Manages data retention based on compliance requirements"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "All Services",
            description: "Receives audit events from all platform services"
          },
          {
            name: "Consent Service",
            description: "Verifies access purposes for audit queries"
          },
          {
            name: "Observability Service",
            description: "Provides metrics on audit system performance"
          }
        ],
        external: [
          {
            name: "Audit API",
            description: "API for querying and managing audit records"
          },
          {
            name: "Compliance Reporting API",
            description: "API for generating compliance reports"
          }
        ]
      },
      configuration: [
        {
          parameter: "EVENT_BUFFERING",
          description: "Enable event buffering for performance",
          defaultValue: "true"
        },
        {
          parameter: "BUFFER_FLUSH_INTERVAL",
          description: "Interval for flushing event buffer (seconds)",
          defaultValue: "15"
        },
        {
          parameter: "CRYPTOGRAPHIC_SIGNING",
          description: "Enable cryptographic signing of audit records",
          defaultValue: "true"
        },
        {
          parameter: "DEFAULT_RETENTION_PERIOD",
          description: "Default retention period for audit data (days)",
          defaultValue: "2555" // 7 years
        }
      ],
      documentation: [
        {
          title: "Audit Framework Guide",
          url: "https://docs.smarthealthhub.com/audit/framework-guide"
        },
        {
          title: "Compliance Documentation",
          url: "https://docs.smarthealthhub.com/audit/compliance"
        },
        {
          title: "API Reference",
          url: "https://docs.smarthealthhub.com/audit/api-reference"
        }
      ]
    },
    {
      id: "notification-service",
      name: "Notification Service",
      category: "Infrastructure",
      description: "Handles delivery of notifications across multiple channels",
      architecture: {
        components: [
          {
            name: "Notification Manager",
            description: "Processes and routes notification requests"
          },
          {
            name: "Channel Adapters",
            description: "Connects to different delivery channels (email, SMS, push, in-app)"
          },
          {
            name: "Template Engine",
            description: "Manages notification content templates"
          },
          {
            name: "Delivery Tracker",
            description: "Tracks notification delivery status"
          },
          {
            name: "Preference Manager",
            description: "Manages user notification preferences"
          }
        ],
        dataModel: [
          {
            entity: "Notifications",
            description: "Core notification records",
            attributes: ["notification_id", "type", "subject", "content_template", "priority", "created_at"]
          },
          {
            entity: "Notification Deliveries",
            description: "Individual delivery attempts",
            attributes: ["delivery_id", "notification_id", "recipient_id", "channel", "status", "timestamp"]
          },
          {
            entity: "Templates",
            description: "Notification content templates",
            attributes: ["template_id", "notification_type", "channel", "locale", "subject_template", "body_template"]
          },
          {
            entity: "User Preferences",
            description: "User notification preferences",
            attributes: ["preference_id", "user_id", "notification_type", "channels", "enabled"]
          },
          {
            entity: "Delivery Failures",
            description: "Records of failed delivery attempts",
            attributes: ["failure_id", "delivery_id", "error_code", "error_message", "timestamp"]
          }
        ],
        patterns: [
          {
            name: "Multi-Channel Delivery",
            description: "Supports multiple notification channels with fallback"
          },
          {
            name: "Template-Based Rendering",
            description: "Separates notification content from delivery logic"
          },
          {
            name: "Delivery Guarantees",
            description: "Ensures notification delivery with retries and tracking"
          },
          {
            name: "Preference-Based Routing",
            description: "Routes notifications based on user preferences"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "All Services",
            description: "Provides notification capabilities to all platform services"
          },
          {
            name: "User Directory Service",
            description: "Retrieves user contact information and preferences"
          },
          {
            name: "Audit Service",
            description: "Records notification activities"
          }
        ],
        external: [
          {
            name: "Notification API",
            description: "API for sending and tracking notifications"
          },
          {
            name: "Preference API",
            description: "API for managing notification preferences"
          }
        ]
      },
      configuration: [
        {
          parameter: "RETRY_STRATEGY",
          description: "Retry strategy for failed deliveries (none, linear, exponential)",
          defaultValue: "exponential"
        },
        {
          parameter: "MAX_RETRY_ATTEMPTS",
          description: "Maximum number of retry attempts",
          defaultValue: "5"
        },
        {
          parameter: "DEFAULT_CHANNELS",
          description: "Default notification channels in priority order",
          defaultValue: "email,sms,push,in-app"
        },
        {
          parameter: "BATCHING_ENABLED",
          description: "Enable notification batching for performance",
          defaultValue: "true"
        }
      ],
      documentation: [
        {
          title: "Notification Guide",
          url: "https://docs.smarthealthhub.com/notifications/guide"
        },
        {
          title: "Template Development",
          url: "https://docs.smarthealthhub.com/notifications/templates"
        },
        {
          title: "API Reference",
          url: "https://docs.smarthealthhub.com/notifications/api-reference"
        }
      ]
    },
    {
      id: "observability-service",
      name: "Observability Service",
      category: "Infrastructure",
      description: "Collects, processes, and visualizes system metrics, logs, and traces",
      architecture: {
        components: [
          {
            name: "Metrics Collector",
            description: "Collects performance and business metrics from all services"
          },
          {
            name: "Log Aggregator",
            description: "Centralizes and indexes logs from all platform components"
          },
          {
            name: "Distributed Tracing",
            description: "Implements distributed tracing across service boundaries"
          },
          {
            name: "Health Monitor",
            description: "Monitors system health and generates alerts"
          },
          {
            name: "Visualization API",
            description: "Provides data for dashboards and reporting"
          }
        ],
        dataModel: [
          {
            entity: "Metrics",
            description: "Time-series metrics data",
            attributes: ["metric_id", "name", "labels", "timestamp", "value", "type"]
          },
          {
            entity: "Logs",
            description: "Aggregated log entries",
            attributes: ["log_id", "timestamp", "service", "level", "message", "context"]
          },
          {
            entity: "Traces",
            description: "Distributed trace records",
            attributes: ["trace_id", "parent_span_id", "span_id", "service", "operation", "start_time", "duration"]
          },
          {
            entity: "Alerts",
            description: "System alert records",
            attributes: ["alert_id", "alert_name", "severity", "status", "triggered_at", "resolved_at", "description"]
          },
          {
            entity: "Dashboards",
            description: "Dashboard configurations",
            attributes: ["dashboard_id", "name", "description", "panels", "owner"]
          }
        ],
        patterns: [
          {
            name: "OpenTelemetry Instrumentation",
            description: "Standardized telemetry collection across services"
          },
          {
            name: "Correlation Context",
            description: "Correlates metrics, logs, and traces for unified debugging"
          },
          {
            name: "Anomaly Detection",
            description: "Identifies abnormal patterns in system behavior"
          },
          {
            name: "Service Level Objectives",
            description: "Defines and tracks service reliability objectives"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "All Services",
            description: "Collects telemetry from all platform services"
          },
          {
            name: "Integration Gateway",
            description: "Monitors external system connectivity"
          },
          {
            name: "Notification Service",
            description: "Delivers alerts and notifications"
          }
        ],
        external: [
          {
            name: "Observability API",
            description: "API for querying metrics, logs, and traces"
          },
          {
            name: "Health Check API",
            description: "API for system health status"
          },
          {
            name: "Alert API",
            description: "API for managing and querying alerts"
          }
        ]
      },
      configuration: [
        {
          parameter: "METRICS_RESOLUTION",
          description: "Resolution for metrics collection (seconds)",
          defaultValue: "30"
        },
        {
          parameter: "TRACE_SAMPLING_RATE",
          description: "Sampling rate for distributed traces (0-1)",
          defaultValue: "0.1"
        },
        {
          parameter: "LOG_RETENTION_DAYS",
          description: "Days to retain log data",
          defaultValue: "90"
        },
        {
          parameter: "ALERTING_ENABLED",
          description: "Enable automatic alerting",
          defaultValue: "true"
        }
      ],
      documentation: [
        {
          title: "Observability Guide",
          url: "https://docs.smarthealthhub.com/observability/guide"
        },
        {
          title: "Instrumentation Guide",
          url: "https://docs.smarthealthhub.com/observability/instrumentation"
        },
        {
          title: "API Reference",
          url: "https://docs.smarthealthhub.com/observability/api-reference"
        }
      ]
    }
  ];
  
  // External Integration Services
  const externalServices = [
    {
      id: "fhir-api-gateway",
      name: "FHIR API Gateway",
      category: "External Integration",
      description: "FHIR R4-compliant API for external system integration",
      architecture: {
        components: [
          {
            name: "FHIR Server",
            description: "Full FHIR R4 REST API implementation"
          },
          {
            name: "Resource Handler",
            description: "Processes FHIR resource requests"
          },
          {
            name: "Search Engine",
            description: "Implements FHIR search capabilities"
          },
          {
            name: "Validation Engine",
            description: "Validates resources against profiles"
          },
          {
            name: "Capability Provider",
            description: "Provides FHIR capability statements"
          }
        ],
        dataModel: [
          {
            entity: "FHIR Resources",
            description: "All standard FHIR R4 resources",
            attributes: ["resource_type", "id", "version", "last_updated", "resource_content (JSONB)"]
          },
          {
            entity: "FHIR Profiles",
            description: "FHIR profiles for resource validation",
            attributes: ["profile_id", "resource_type", "profile_url", "version", "content"]
          },
          {
            entity: "Search Parameters",
            description: "Custom and standard FHIR search parameters",
            attributes: ["parameter_id", "resource_type", "name", "type", "expression"]
          },
          {
            entity: "FHIR Operations",
            description: "Custom FHIR operations",
            attributes: ["operation_id", "name", "resource_type", "type", "parameters"]
          }
        ],
        patterns: [
          {
            name: "RESTful API",
            description: "Standard HTTP-based RESTful API"
          },
          {
            name: "Content Negotiation",
            description: "Supports multiple content types (JSON, XML)"
          },
          {
            name: "Conditional Operations",
            description: "Supports FHIR conditional create/update/delete"
          },
          {
            name: "Version Awareness",
            description: "Handles FHIR versioning and history"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "PHR Service",
            description: "Provides access to health record data"
          },
          {
            name: "Consent Service",
            description: "Enforces consent policies for data access"
          },
          {
            name: "Audit Service",
            description: "Records all API access"
          }
        ],
        external: [
          {
            name: "FHIR REST API",
            description: "Standard FHIR RESTful API endpoints"
          },
          {
            name: "SMART on FHIR",
            description: "SMART App Launch Framework support"
          },
          {
            name: "Bulk Data API",
            description: "FHIR Bulk Data Access API"
          }
        ]
      },
      configuration: [
        {
          parameter: "DEFAULT_PAGE_SIZE",
          description: "Default page size for search results",
          defaultValue: "50"
        },
        {
          parameter: "MAX_PAGE_SIZE",
          description: "Maximum page size for search results",
          defaultValue: "1000"
        },
        {
          parameter: "SUMMARY_MODE_ENABLED",
          description: "Enable _summary parameter support",
          defaultValue: "true"
        },
        {
          parameter: "COMPARTMENT_SEARCH_ENABLED",
          description: "Enable compartment-based search",
          defaultValue: "true"
        }
      ],
      documentation: [
        {
          title: "FHIR API Guide",
          url: "https://docs.smarthealthhub.com/fhir-api/guide"
        },
        {
          title: "FHIR Profiles",
          url: "https://docs.smarthealthhub.com/fhir-api/profiles"
        },
        {
          title: "API Reference",
          url: "https://docs.smarthealthhub.com/fhir-api/reference"
        }
      ]
    },
    {
      id: "hl7v2-service",
      name: "HL7v2 Integration Service",
      category: "External Integration",
      description: "HL7v2 messaging gateway for legacy system integration",
      architecture: {
        components: [
          {
            name: "Message Processor",
            description: "Processes incoming and outgoing HL7v2 messages"
          },
          {
            name: "MLLP Server",
            description: "Implements MLLP (Minimal Lower Layer Protocol) for HL7v2"
          },
          {
            name: "Parser/Serializer",
            description: "Parses and serializes HL7v2 messages"
          },
          {
            name: "Translation Engine",
            description: "Translates between HL7v2 and FHIR formats"
          },
          {
            name: "Routing Engine",
            description: "Routes messages to appropriate internal services"
          }
        ],
        dataModel: [
          {
            entity: "HL7 Messages",
            description: "HL7v2 message records",
            attributes: ["message_id", "message_type", "message_trigger", "sender", "receiver", "timestamp", "content"]
          },
          {
            name: "HL7 Connections",
            description: "HL7v2 connection configurations",
            attributes: ["connection_id", "name", "host", "port", "credentials_ref", "status"]
          },
          {
            name: "Message Mappings",
            description: "Mappings between HL7v2 and internal formats",
            attributes: ["mapping_id", "message_type", "direction", "mapping_definition", "version"]
          },
          {
            name: "Message Log",
            description: "Log of processed HL7v2 messages",
            attributes: ["log_id", "message_id", "direction", "status", "timestamp", "error_details"]
          }
        ],
        patterns: [
          {
            name: "Message-Oriented Middleware",
            description: "Asynchronous message processing"
          },
          {
            name: "Adapter Pattern",
            description: "Adapts HL7v2 messages to internal services"
          },
          {
            name: "Store and Forward",
            description: "Ensures reliable message delivery"
          },
          {
            name: "Message Transformation",
            description: "Transforms messages between formats"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "PHR Service",
            description: "Updates health records from HL7v2 data"
          },
          {
            name: "Master Person Index",
            description: "Resolves patient identities from HL7v2 messages"
          },
          {
            name: "Audit Service",
            description: "Records all message processing activities"
          }
        ],
        external: [
          {
            name: "MLLP Endpoints",
            description: "Standard MLLP endpoints for HL7v2 messaging"
          },
          {
            name: "REST API",
            description: "RESTful API for HL7v2 message submission"
          },
          {
            name: "File Drop",
            description: "File-based HL7v2 message submission"
          }
        ]
      },
      configuration: [
        {
          parameter: "ACK_MODE",
          description: "Acknowledgment mode (immediate, application)",
          defaultValue: "application"
        },
        {
          parameter: "MESSAGE_VALIDATION",
          description: "Message validation level (none, schema, content)",
          defaultValue: "schema"
        },
        {
          parameter: "MAX_MESSAGE_SIZE",
          description: "Maximum message size in bytes",
          defaultValue: "10485760" // 10MB
        },
        {
          parameter: "RETRY_INTERVAL",
          description: "Retry interval for failed messages (seconds)",
          defaultValue: "300"
        }
      ],
      documentation: [
        {
          title: "HL7v2 Integration Guide",
          url: "https://docs.smarthealthhub.com/hl7v2/guide"
        },
        {
          title: "Message Types Support",
          url: "https://docs.smarthealthhub.com/hl7v2/message-types"
        },
        {
          title: "Configuration Guide",
          url: "https://docs.smarthealthhub.com/hl7v2/configuration"
        }
      ]
    },
    {
      id: "x12-gateway",
      name: "X12 EDI Gateway",
      category: "External Integration",
      description: "X12 EDI transaction processing for claims and benefits",
      architecture: {
        components: [
          {
            name: "X12 Parser",
            description: "Parses X12 EDI transactions"
          },
          {
            name: "Transaction Processor",
            description: "Processes different X12 transaction types"
          },
          {
            name: "Schema Validator",
            description: "Validates transactions against X12 schemas"
          },
          {
            name: "Translation Engine",
            description: "Translates between X12 and internal formats"
          },
          {
            name: "Routing Engine",
            description: "Routes transactions to appropriate internal services"
          }
        ],
        dataModel: [
          {
            entity: "X12 Transactions",
            description: "X12 transaction records",
            attributes: ["transaction_id", "transaction_type", "sender_id", "receiver_id", "timestamp", "content"]
          },
          {
            entity: "Trading Partners",
            description: "EDI trading partner configurations",
            attributes: ["partner_id", "name", "identifier", "transaction_types", "communications"]
          },
          {
            entity: "Transaction Mappings",
            description: "Mappings between X12 and internal formats",
            attributes: ["mapping_id", "transaction_type", "direction", "mapping_definition", "version"]
          },
          {
            entity: "Transaction Log",
            description: "Log of processed X12 transactions",
            attributes: ["log_id", "transaction_id", "direction", "status", "timestamp", "error_details"]
          }
        ],
        patterns: [
          {
            name: "Batch Processing",
            description: "Processes batches of EDI transactions"
          },
          {
            name: "Schema Validation",
            description: "Validates against X12 transaction schemas"
          },
          {
            name: "Trading Partner Management",
            description: "Manages EDI trading partner relationships"
          },
          {
            name: "Message Translation",
            description: "Translates between EDI and internal formats"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "Claims Service",
            description: "Processes X12 837 claim transactions"
          },
          {
            name: "Eligibility Service",
            description: "Processes X12 270/271 eligibility transactions"
          },
          {
            name: "Prior Auth Service",
            description: "Processes X12 278 authorization transactions"
          }
        ],
        external: [
          {
            name: "X12 API",
            description: "API for X12 transaction submission and retrieval"
          },
          {
            name: "File Transfer",
            description: "File-based X12 transaction processing"
          },
          {
            name: "Trading Partner Connections",
            description: "Direct connections to trading partners"
          }
        ]
      },
      configuration: [
        {
          parameter: "VALIDATION_LEVEL",
          description: "Transaction validation level (syntax, schema, content)",
          defaultValue: "schema"
        },
        {
          parameter: "BATCH_SIZE",
          description: "Maximum batch size for processing",
          defaultValue: "1000"
        },
        {
          parameter: "PROCESSING_MODE",
          description: "Processing mode (sync, async)",
          defaultValue: "async"
        },
        {
          parameter: "ACKNOWLEDGMENT_REQUIRED",
          description: "Whether to generate 997/999 acknowledgments",
          defaultValue: "true"
        }
      ],
      documentation: [
        {
          title: "X12 Integration Guide",
          url: "https://docs.smarthealthhub.com/x12/guide"
        },
        {
          title: "Transaction Types Support",
          url: "https://docs.smarthealthhub.com/x12/transaction-types"
        },
        {
          title: "Trading Partner Guide",
          url: "https://docs.smarthealthhub.com/x12/trading-partners"
        }
      ]
    },
    {
      id: "smart-on-fhir",
      name: "SMART on FHIR Service",
      category: "External Integration",
      description: "SMART on FHIR app integration framework",
      architecture: {
        components: [
          {
            name: "App Registry",
            description: "Registers and manages SMART apps"
          },
          {
            name: "Launch Context Provider",
            description: "Provides context for SMART app launches"
          },
          {
            name: "OAuth Authorization Server",
            description: "Handles OAuth 2.0 authorization flows"
          },
          {
            name: "Token Service",
            description: "Issues and validates access tokens"
          },
          {
            name: "Scope Validator",
            description: "Validates and enforces SMART app scopes"
          }
        ],
        dataModel: [
          {
            entity: "SMART Apps",
            description: "Registered SMART on FHIR applications",
            attributes: ["app_id", "name", "client_id", "client_secret", "redirect_uris", "launch_uri", "status"]
          },
          {
            entity: "App Authorizations",
            description: "User authorizations for SMART apps",
            attributes: ["authorization_id", "app_id", "user_id", "scope", "authorized_at", "expires_at"]
          },
          {
            entity: "Launch Contexts",
            description: "Context information for app launches",
            attributes: ["context_id", "patient_id", "encounter_id", "user_id", "timestamp"]
          },
          {
            entity: "Access Tokens",
            description: "OAuth 2.0 access tokens",
            attributes: ["token_id", "app_id", "user_id", "scope", "issued_at", "expires_at", "token_hash"]
          }
        ],
        patterns: [
          {
            name: "OAuth 2.0",
            description: "Standard OAuth 2.0 authorization flows"
          },
          {
            name: "EHR Launch",
            description: "Launches SMART apps from within EHR context"
          },
          {
            name: "Standalone Launch",
            description: "Launches SMART apps independently"
          },
          {
            name: "Scope-Based Authorization",
            description: "Authorizes access based on requested scopes"
          }
        ]
      },
      interfaces: {
        internal: [
          {
            name: "FHIR API Gateway",
            description: "Provides FHIR resources to SMART apps"
          },
          {
            name: "User Directory Service",
            description: "Authenticates users for SMART app access"
          },
          {
            name: "Consent Service",
            description: "Enforces consent policies for SMART app access"
          }
        ],
        external: [
          {
            name: "SMART API",
            description: "API for SMART app registration and management"
          },
          {
            name: "OAuth 2.0 Endpoints",
            description: "Standard OAuth 2.0 authorization endpoints"
          },
          {
            name: "SMART Discovery Endpoint",
            description: "SMART configuration discovery endpoint"
          }
        ]
      },
      configuration: [
        {
          parameter: "TOKEN_EXPIRY",
          description: "Access token expiration time (minutes)",
          defaultValue: "60"
        },
        {
          parameter: "REFRESH_TOKEN_EXPIRY",
          description: "Refresh token expiration time (days)",
          defaultValue: "30"
        },
        {
          parameter: "DEFAULT_SCOPE",
          description: "Default scope for SMART apps",
          defaultValue: "launch/patient patient/*.read"
        },
        {
          parameter: "AUTO_APPROVE_TRUSTED_APPS",
          description: "Automatically approve trusted apps",
          defaultValue: "true"
        }
      ],
      documentation: [
        {
          title: "SMART on FHIR Guide",
          url: "https://docs.smarthealthhub.com/smart-on-fhir/guide"
        },
        {
          title: "App Development Guide",
          url: "https://docs.smarthealthhub.com/smart-on-fhir/app-development"
        },
        {
          title: "API Reference",
          url: "https://docs.smarthealthhub.com/smart-on-fhir/api-reference"
        }
      ]
    }
  ];

  // Combined list of all services
  const allServices = [...coreServices, ...claimsServices, ...infrastructureServices, ...externalServices];
  
  // Filter services based on search
  const filteredServices = filterServices(allServices, searchQuery);
  
  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Service Documentation</h1>
          <p className="text-muted-foreground">
            Technical specifications and architecture documentation for all Smart Health Hub services
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search services by name, description, or category..."
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
            <TabsTrigger value="core">Core Services</TabsTrigger>
            <TabsTrigger value="claims">Claims Services</TabsTrigger>
            <TabsTrigger value="infrastructure">Infrastructure Services</TabsTrigger>
            <TabsTrigger value="external">External Integrations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="core" className="space-y-4">
            {filterServices(coreServices, searchQuery).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
            
            {filterServices(coreServices, searchQuery).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No services match your search criteria.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="claims" className="space-y-4">
            {filterServices(claimsServices, searchQuery).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
            
            {filterServices(claimsServices, searchQuery).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No services match your search criteria.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="infrastructure" className="space-y-4">
            {filterServices(infrastructureServices, searchQuery).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
            
            {filterServices(infrastructureServices, searchQuery).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No services match your search criteria.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="external" className="space-y-4">
            {filterServices(externalServices, searchQuery).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
            
            {filterServices(externalServices, searchQuery).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No services match your search criteria.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

// Service Card Component
const ServiceCard = ({ service }) => {
  const [activeTab, setActiveTab] = useState("architecture");
  
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
  
  // Getting icon for service category
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Core':
        return <Server className="h-5 w-5" />;
      case 'Claims':
        return <Database className="h-5 w-5" />;
      case 'Infrastructure':
        return <Zap className="h-5 w-5" />;
      case 'Integration':
        return <Zap className="h-5 w-5" />;
      case 'External Integration':
        return <ExternalLink className="h-5 w-5" />;
      default:
        return <Server className="h-5 w-5" />;
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${getCategoryBadgeColor(service.category).split(' ')[0]}`}>
              {getCategoryIcon(service.category)}
            </div>
            <div>
              <CardTitle>{service.name}</CardTitle>
              <CardDescription>{service.description}</CardDescription>
            </div>
          </div>
          <Badge className={`${getCategoryBadgeColor(service.category)}`}>
            {service.category}
          </Badge>
        </div>
      </CardHeader>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
        <TabsList className="w-full">
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="interfaces">Interfaces</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>
      </Tabs>
      <CardContent className="pt-6">
        {activeTab === "architecture" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Components</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {service.architecture.components.map((component, idx) => (
                  <div key={idx} className="bg-muted rounded-lg p-4 border">
                    <h4 className="font-semibold">{component.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{component.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-3">Data Model</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {service.architecture.dataModel.map((entity, idx) => (
                  <div key={idx} className="bg-muted rounded-lg p-4 border">
                    <h4 className="font-semibold">{entity.entity}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{entity.description}</p>
                    <div className="mt-2">
                      <p className="text-xs font-medium">Attributes:</p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        {entity.attributes.join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-3">Design Patterns</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {service.architecture.patterns.map((pattern, idx) => (
                  <div key={idx} className="bg-muted rounded-lg p-4 border">
                    <h4 className="font-semibold">{pattern.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "interfaces" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Internal Interfaces</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {service.interfaces.internal.map((iface, idx) => (
                  <div key={idx} className="bg-muted rounded-lg p-4 border">
                    <h4 className="font-semibold">{iface.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{iface.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-3">External Interfaces</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {service.interfaces.external.map((iface, idx) => (
                  <div key={idx} className="bg-muted rounded-lg p-4 border">
                    <h4 className="font-semibold">{iface.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{iface.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "configuration" && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Configuration Parameters</h3>
            <div className="overflow-hidden border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Parameter</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-[150px]">Default Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {service.configuration.map((param, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{param.parameter}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{param.description}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{param.defaultValue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        
        {activeTab === "documentation" && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Documentation Resources</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {service.documentation.map((doc, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{doc.title}</CardTitle>
                  </CardHeader>
                  <CardFooter>
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm font-medium text-primary"
                    >
                      View Documentation
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </a>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceDocumentationPage;