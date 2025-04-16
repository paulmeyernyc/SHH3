import { useState } from "react";
import { 
  Network, 
  Settings, 
  Users, 
  Server, 
  Layers, 
  Shield, 
  Database, 
  FileText, 
  LineChart, 
  PenTool, 
  Workflow, 
  Search, 
  ClipboardList, 
  Bell, 
  MessageSquare, 
  Fingerprint, 
  FileCheck, 
  CreditCard, 
  Calendar, 
  FileBadge,
  BarChart, 
  Building, 
  MapPin, 
  Heart, 
  Activity,
  Clock,
  Award
} from "lucide-react";

import { Layout } from "@/components/layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ServiceData {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  completion: number;
  keyFeatures: string[];
  category: "network" | "configuration" | "directory" | "platform";
  technicalDocsLink: string;
  apiDocsLink: string;
  status: "stable" | "beta" | "development";
}

// Helper function to get color based on completion percentage
const getCompletionColor = (completion: number): string => {
  if (completion < 30) return "bg-red-500";
  if (completion < 70) return "bg-amber-500";
  return "bg-green-500";
};

// Helper function to get status badge styling
const getStatusBadge = (status: "stable" | "beta" | "development") => {
  switch (status) {
    case "stable":
      return <Badge variant="default" className="bg-green-500">Stable</Badge>;
    case "beta":
      return <Badge variant="default" className="bg-blue-500">Beta</Badge>;
    case "development":
      return <Badge variant="default" className="bg-amber-500">Development</Badge>;
    default:
      return null;
  }
};

// Services data - organized by category
const services: ServiceData[] = [
  // Network Services
  {
    id: "integration-gateway",
    name: "Integration Gateway",
    description: "API gateway for secure integration with external systems",
    icon: <Network className="h-8 w-8 text-blue-500" />,
    completion: 95,
    keyFeatures: [
      "API Key Management",
      "SMART on FHIR App Management",
      "Connection Statistics",
      "Connection Testing (FHIR, HL7v2, X12)",
    ],
    category: "network",
    technicalDocsLink: "/docs/integration-gateway/",
    apiDocsLink: "/api-docs/integration-gateway/",
    status: "stable"
  },
  {
    id: "directory-connect",
    name: "Directory Connect",
    description: "Healthcare directory federation service",
    icon: <Layers className="h-8 w-8 text-indigo-500" />,
    completion: 90,
    keyFeatures: [
      "Provider Directory Synchronization",
      "Healthcare Network Discovery",
      "Directory Federation",
      "Availability Management"
    ],
    category: "network",
    technicalDocsLink: "/docs/directory-connect/",
    apiDocsLink: "/api-docs/directory-connect/",
    status: "stable"
  },
  {
    id: "secure-messaging",
    name: "Secure Messaging",
    description: "HIPAA-compliant messaging for healthcare providers",
    icon: <MessageSquare className="h-8 w-8 text-green-500" />,
    completion: 85,
    keyFeatures: [
      "End-to-end encryption",
      "Direct Project integration",
      "Message archiving",
      "Thread management"
    ],
    category: "network",
    technicalDocsLink: "/docs/secure-messaging/",
    apiDocsLink: "/api-docs/secure-messaging/",
    status: "stable"
  },
  {
    id: "consent-management",
    name: "Consent Management",
    description: "Patient consent tracking and enforcement",
    icon: <PenTool className="h-8 w-8 text-pink-500" />,
    completion: 85,
    keyFeatures: [
      "Consent recording",
      "Purpose-based permissions",
      "Consent verification",
      "Audit trail",
      "Revocation handling"
    ],
    category: "network",
    technicalDocsLink: "/docs/consent-service/",
    apiDocsLink: "/api-docs/consent-service/",
    status: "stable"
  },
  {
    id: "patient-data-access",
    name: "Patient Data Access",
    description: "Secure patient data sharing and access",
    icon: <Fingerprint className="h-8 w-8 text-teal-500" />,
    completion: 80,
    keyFeatures: [
      "PHR data access",
      "Patient authentication",
      "Proxy access management",
      "Secure sharing"
    ],
    category: "network",
    technicalDocsLink: "/docs/pda-service/",
    apiDocsLink: "/api-docs/pda-service/",
    status: "beta"
  },
  {
    id: "contract-parsing",
    name: "Secure Contract Parsing",
    description: "Contract and document parsing for healthcare agreements",
    icon: <FileCheck className="h-8 w-8 text-orange-500" />,
    completion: 75,
    keyFeatures: [
      "Document extraction",
      "Contract term identification",
      "Obligation tracking",
      "Attachment linking"
    ],
    category: "network",
    technicalDocsLink: "/docs/contract-parsing/",
    apiDocsLink: "/api-docs/contract-parsing/",
    status: "beta"
  },
  {
    id: "eligibility-benefits",
    name: "Eligibility & Benefits",
    description: "Real-time insurance eligibility verification",
    icon: <Activity className="h-8 w-8 text-cyan-500" />,
    completion: 90,
    keyFeatures: [
      "Real-time 270/271 processing",
      "Benefit validation",
      "Coverage details",
      "Cost sharing information"
    ],
    category: "network",
    technicalDocsLink: "/docs/eligibility-service/",
    apiDocsLink: "/api-docs/eligibility-service/",
    status: "stable"
  },
  {
    id: "scheduling",
    name: "Scheduling",
    description: "Provider scheduling and appointment management",
    icon: <Calendar className="h-8 w-8 text-purple-500" />,
    completion: 85,
    keyFeatures: [
      "Appointment scheduling",
      "Availability management",
      "Automated reminders",
      "Resource allocation"
    ],
    category: "network",
    technicalDocsLink: "/docs/scheduling-service/",
    apiDocsLink: "/api-docs/scheduling-service/",
    status: "stable"
  },
  {
    id: "prior-authorization",
    name: "Prior Authorization",
    description: "Streamlined prior authorization processing",
    icon: <Clock className="h-8 w-8 text-amber-500" />,
    completion: 80,
    keyFeatures: [
      "Dual-path processing",
      "Hub-run authorization rules",
      "Pass-through to payers",
      "Status tracking"
    ],
    category: "network",
    technicalDocsLink: "/docs/prior-auth-service/",
    apiDocsLink: "/api-docs/prior-auth-service/",
    status: "beta"
  },
  {
    id: "cost-estimation",
    name: "Cost Estimation",
    description: "Patient cost estimation for healthcare services",
    icon: <BarChart className="h-8 w-8 text-green-500" />,
    completion: 75,
    keyFeatures: [
      "Fee schedule integration",
      "Insurance coverage calculation",
      "Patient responsibility estimation",
      "Provider-specific pricing"
    ],
    category: "network",
    technicalDocsLink: "/docs/cost-estimation/",
    apiDocsLink: "/api-docs/cost-estimation/",
    status: "beta"
  },
  {
    id: "claims-processing",
    name: "Claims Processing",
    description: "Comprehensive claims submission and tracking",
    icon: <FileBadge className="h-8 w-8 text-blue-500" />,
    completion: 90,
    keyFeatures: [
      "Dual-path claims processing",
      "Real-time adjudication",
      "Claim status tracking",
      "AI-assisted validation"
    ],
    category: "network",
    technicalDocsLink: "/docs/claims-service/",
    apiDocsLink: "/api-docs/claims-service/",
    status: "stable"
  },
  {
    id: "billing-payments",
    name: "Billing & Payments",
    description: "Healthcare billing and payment processing",
    icon: <CreditCard className="h-8 w-8 text-red-500" />,
    completion: 85,
    keyFeatures: [
      "Patient billing",
      "Payment processing",
      "Payment plans",
      "Electronic remittances",
      "Statement management"
    ],
    category: "network",
    technicalDocsLink: "/docs/billing-service/",
    apiDocsLink: "/api-docs/billing-service/",
    status: "stable"
  },
  {
    id: "goldcarding",
    name: "Goldcarding",
    description: "Provider pre-certification and trusted status management",
    icon: <Award className="h-8 w-8 text-yellow-500" />,
    completion: 85,
    keyFeatures: [
      "Provider profiling",
      "Service eligibility checks",
      "Goldcarding rules engine",
      "Event tracking",
      "Prior auth & claim tracking"
    ],
    category: "network",
    technicalDocsLink: "/docs/goldcarding-service/",
    apiDocsLink: "/api-docs/goldcarding-service/",
    status: "beta"
  },
  
  // Configuration Services
  {
    id: "payer-config",
    name: "Payer Configuration",
    description: "Insurance payer configuration and management",
    icon: <Settings className="h-8 w-8 text-blue-500" />,
    completion: 85,
    keyFeatures: [
      "Payer registration",
      "Plan configuration",
      "EDI setup",
      "Trading partner management"
    ],
    category: "configuration",
    technicalDocsLink: "/docs/payer-configuration/",
    apiDocsLink: "/api-docs/payer-configuration/",
    status: "beta"
  },
  {
    id: "provider-config",
    name: "Provider Organization Configuration",
    description: "Provider organization setup and management",
    icon: <Settings className="h-8 w-8 text-green-500" />,
    completion: 90,
    keyFeatures: [
      "Organization profile management",
      "Provider association",
      "Service configuration",
      "Facility management"
    ],
    category: "configuration",
    technicalDocsLink: "/docs/provider-configuration/",
    apiDocsLink: "/api-docs/provider-configuration/",
    status: "stable"
  },
  {
    id: "employer-config",
    name: "Employer Configuration",
    description: "Employer organization setup and benefit management",
    icon: <Settings className="h-8 w-8 text-purple-500" />,
    completion: 85,
    keyFeatures: [
      "Employer profile setup",
      "Employee management",
      "Benefit package configuration",
      "Health program integration"
    ],
    category: "configuration",
    technicalDocsLink: "/docs/employer-configuration/",
    apiDocsLink: "/api-docs/employer-configuration/",
    status: "beta"
  },
  {
    id: "canonical-rules",
    name: "Canonical Rules",
    description: "Centralized healthcare rules management",
    icon: <ClipboardList className="h-8 w-8 text-amber-500" />,
    completion: 80,
    keyFeatures: [
      "Clinical rule definitions",
      "Administrative rules",
      "Rule versioning",
      "Rule execution engine"
    ],
    category: "configuration",
    technicalDocsLink: "/docs/canonical-rules/",
    apiDocsLink: "/api-docs/canonical-rules/",
    status: "beta"
  },
  {
    id: "canonical-datasets",
    name: "Canonical Datasets",
    description: "Standardized healthcare reference data",
    icon: <Database className="h-8 w-8 text-teal-500" />,
    completion: 85,
    keyFeatures: [
      "Code systems management",
      "Reference data libraries",
      "Dataset versioning",
      "Data synchronization"
    ],
    category: "configuration",
    technicalDocsLink: "/docs/canonical-datasets/",
    apiDocsLink: "/api-docs/canonical-datasets/",
    status: "stable"
  },
  
  // Directory Services
  {
    id: "users-directory",
    name: "Users",
    description: "User identity and access management",
    icon: <Users className="h-8 w-8 text-blue-500" />,
    completion: 95,
    keyFeatures: [
      "User provisioning",
      "Role management",
      "Authentication services",
      "User profile management"
    ],
    category: "directory",
    technicalDocsLink: "/docs/user-directory/",
    apiDocsLink: "/api-docs/user-directory/",
    status: "stable"
  },
  {
    id: "people-directory",
    name: "People",
    description: "Master Person Index (MPI) service",
    icon: <Users className="h-8 w-8 text-green-500" />,
    completion: 90,
    keyFeatures: [
      "Identity management",
      "Demographic storage",
      "Duplicate detection",
      "Record linkage"
    ],
    category: "directory",
    technicalDocsLink: "/docs/person-directory/",
    apiDocsLink: "/api-docs/person-directory/",
    status: "stable"
  },
  {
    id: "patients-directory",
    name: "Patients",
    description: "Master Patient Index (MPI) service",
    icon: <Heart className="h-8 w-8 text-red-500" />,
    completion: 90,
    keyFeatures: [
      "Patient record management",
      "Clinical data association",
      "Patient-provider relationships",
      "Care management"
    ],
    category: "directory",
    technicalDocsLink: "/docs/patient-directory/",
    apiDocsLink: "/api-docs/patient-directory/",
    status: "stable"
  },
  {
    id: "providers-directory",
    name: "Providers",
    description: "Healthcare provider directory and management",
    icon: <Users className="h-8 w-8 text-purple-500" />,
    completion: 85,
    keyFeatures: [
      "Provider credentials",
      "Specialty tracking",
      "Network affiliations",
      "Availability management"
    ],
    category: "directory",
    technicalDocsLink: "/docs/provider-directory/",
    apiDocsLink: "/api-docs/provider-directory/",
    status: "stable"
  },
  {
    id: "facilities-directory",
    name: "Facilities",
    description: "Healthcare facility and organization directory",
    icon: <Building className="h-8 w-8 text-indigo-500" />,
    completion: 85,
    keyFeatures: [
      "Organization records",
      "Facility profiles",
      "Service offerings",
      "Accreditation tracking"
    ],
    category: "directory",
    technicalDocsLink: "/docs/facility-directory/",
    apiDocsLink: "/api-docs/facility-directory/",
    status: "stable"
  },
  {
    id: "locations-directory",
    name: "Locations",
    description: "Physical location management for healthcare services",
    icon: <MapPin className="h-8 w-8 text-orange-500" />,
    completion: 85,
    keyFeatures: [
      "Location profiles",
      "Address validation",
      "Geocoding",
      "Service availability"
    ],
    category: "directory",
    technicalDocsLink: "/docs/location-directory/",
    apiDocsLink: "/api-docs/location-directory/",
    status: "stable"
  },
  {
    id: "payers-directory",
    name: "Payers",
    description: "Insurance payer directory and information",
    icon: <CreditCard className="h-8 w-8 text-blue-500" />,
    completion: 85,
    keyFeatures: [
      "Payer organization records",
      "Plan details",
      "Coverage information",
      "Contact management"
    ],
    category: "directory",
    technicalDocsLink: "/docs/payer-directory/",
    apiDocsLink: "/api-docs/payer-directory/",
    status: "stable"
  },
  {
    id: "care-event-directory",
    name: "Care Events",
    description: "Healthcare transaction and care event tracking",
    icon: <Activity className="h-8 w-8 text-amber-500" />,
    completion: 80,
    keyFeatures: [
      "Care event tracking",
      "Partner access control",
      "Transaction linking",
      "Webhook notifications"
    ],
    category: "directory",
    technicalDocsLink: "/docs/care-event-service/",
    apiDocsLink: "/api-docs/care-event-service/",
    status: "beta"
  },
  
  // Platform Services
  {
    id: "fhir-service",
    name: "FHIR Integration Service",
    description: "Provides full FHIR R4 compatibility for healthcare data exchange",
    icon: <Server className="h-8 w-8 text-blue-500" />,
    completion: 90,
    keyFeatures: [
      "FHIR R4 resource validation",
      "RESTful API endpoints",
      "Search parameters",
      "SMART on FHIR support"
    ],
    category: "platform",
    technicalDocsLink: "/docs/fhir-service/",
    apiDocsLink: "/api-docs/fhir-service/",
    status: "stable"
  },
  {
    id: "security-service",
    name: "Security Service",
    description: "Comprehensive zero-trust security framework for authentication and authorization",
    icon: <Shield className="h-8 w-8 text-indigo-500" />,
    completion: 100,
    keyFeatures: [
      "OAuth 2.0/OIDC",
      "JWT token management",
      "RBAC/ABAC authorization",
      "MFA support",
      "Risk-based security"
    ],
    category: "platform",
    technicalDocsLink: "/docs/security-service/",
    apiDocsLink: "/api-docs/security-service/",
    status: "stable"
  },
  {
    id: "database-service",
    name: "Database Service",
    description: "Advanced database architecture with sharding and connection management",
    icon: <Database className="h-8 w-8 text-emerald-500" />,
    completion: 85,
    keyFeatures: [
      "ShardManager",
      "Read/write splitting",
      "Table partitioning",
      "Connection pooling",
      "Migrations framework"
    ],
    category: "platform",
    technicalDocsLink: "/docs/database-service/",
    apiDocsLink: "/api-docs/database-service/",
    status: "stable"
  },
  {
    id: "document-service",
    name: "Document Management",
    description: "Secure storage and retrieval of clinical documents",
    icon: <FileText className="h-8 w-8 text-blue-400" />,
    completion: 80,
    keyFeatures: [
      "Document versioning",
      "Multi-format support",
      "Document templates",
      "Electronic signatures",
      "Retention management"
    ],
    category: "platform",
    technicalDocsLink: "/docs/document-service/",
    apiDocsLink: "/api-docs/document-service/",
    status: "beta"
  },
  {
    id: "analytics-service",
    name: "Analytics & Reporting",
    description: "Healthcare data analytics and customizable reporting",
    icon: <LineChart className="h-8 w-8 text-teal-500" />,
    completion: 75,
    keyFeatures: [
      "Clinical metrics",
      "Financial analytics",
      "Custom report builder",
      "Data visualization",
      "Scheduled reports"
    ],
    category: "platform",
    technicalDocsLink: "/docs/analytics-service/",
    apiDocsLink: "/api-docs/analytics-service/",
    status: "beta"
  },
  {
    id: "workflow-engine",
    name: "Workflow Engine",
    description: "Business process automation for healthcare workflows",
    icon: <Workflow className="h-8 w-8 text-red-500" />,
    completion: 70,
    keyFeatures: [
      "Process modeling",
      "Task automation",
      "Status tracking",
      "SLA monitoring",
      "Integration triggers"
    ],
    category: "platform",
    technicalDocsLink: "/docs/workflow-engine/",
    apiDocsLink: "/api-docs/workflow-engine/",
    status: "development"
  },
  {
    id: "search-service",
    name: "Search Service",
    description: "Advanced search capabilities across all healthcare data",
    icon: <Search className="h-8 w-8 text-yellow-500" />,
    completion: 70,
    keyFeatures: [
      "Full-text search",
      "Faceted filtering",
      "Synonym expansion",
      "Medical terminology support",
      "Search analytics"
    ],
    category: "platform",
    technicalDocsLink: "/docs/search-service/",
    apiDocsLink: "/api-docs/search-service/",
    status: "beta"
  },
  {
    id: "audit-service",
    name: "Audit Service",
    description: "Comprehensive audit logging for regulatory compliance",
    icon: <ClipboardList className="h-8 w-8 text-purple-500" />,
    completion: 95,
    keyFeatures: [
      "HIPAA-compliant logging",
      "Access tracking",
      "Data change history",
      "Retention policies",
      "Report generation"
    ],
    category: "platform",
    technicalDocsLink: "/docs/audit-service/",
    apiDocsLink: "/api-docs/audit-service/",
    status: "stable"
  },
  {
    id: "notification-service",
    name: "Notification Service",
    description: "Multi-channel notification delivery system",
    icon: <Bell className="h-8 w-8 text-red-500" />,
    completion: 85,
    keyFeatures: [
      "Email notifications",
      "SMS delivery",
      "Mobile push notifications",
      "In-app alerts",
      "Notification preferences"
    ],
    category: "platform",
    technicalDocsLink: "/docs/notification-service/",
    apiDocsLink: "/api-docs/notification-service/",
    status: "stable"
  }
];

// Service Component
function ServiceCard({ service }: { service: ServiceData }) {
  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="p-2 rounded-lg bg-slate-100">{service.icon}</div>
          {getStatusBadge(service.status)}
        </div>
        <CardTitle className="text-xl mt-2">{service.name}</CardTitle>
        <CardDescription>{service.description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Completion</span>
            <span className="text-sm font-medium">{service.completion}%</span>
          </div>
          <Progress value={service.completion} className={`h-2 ${getCompletionColor(service.completion)}`} />
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2">Key Features</h4>
          <ul className="text-sm space-y-1">
            {service.keyFeatures.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="w-full flex flex-col xs:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => window.open(service.technicalDocsLink, "_blank")}
          >
            Technical Docs
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => window.open(service.apiDocsLink, "_blank")}
          >
            API Docs
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

// Services page
export default function Services() {
  const [activeCategory, setActiveCategory] = useState<string>("network");
  
  // Filter services by category and arrange network services in the specified order
  const networkServiceOrder = [
    "integration-gateway",
    "directory-connect",
    "secure-messaging",
    "consent-management",
    "patient-data-access",
    "scheduling",
    "eligibility-benefits",
    "prior-authorization",
    "cost-estimation",
    "claims-processing",
    "billing-payments",
    "goldcarding",
    "contract-parsing"
  ];
  
  // Sort network services according to specified order
  const networkServices = services
    .filter(service => service.category === "network")
    .sort((a, b) => {
      return networkServiceOrder.indexOf(a.id) - networkServiceOrder.indexOf(b.id);
    });
    
  // Other categories remain as is
  const configurationServices = services.filter(service => service.category === "configuration");
  const directoryServices = services.filter(service => service.category === "directory");
  const platformServices = services.filter(service => service.category === "platform");
  
  return (
    <Layout>
      <div className="container mx-auto py-8 flex-grow">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">Services</h1>
          <p className="text-muted-foreground">
            
          </p>
        </div>

        {/* Status legend */}
        <div className="flex justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500">Stable</Badge>
            <span className="text-sm text-muted-foreground">Production Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-blue-500">Beta</Badge>
            <span className="text-sm text-muted-foreground">Feature Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-amber-500">Development</Badge>
            <span className="text-sm text-muted-foreground">In Progress</span>
          </div>
        </div>

        {/* Services tabs */}
        <Tabs defaultValue="network" className="w-full">
          <TabsList className="w-full flex mb-8 justify-center">
            <TabsTrigger value="network" className="flex-1 max-w-[200px]">Network Services</TabsTrigger>
            <TabsTrigger value="configuration" className="flex-1 max-w-[200px]">Configuration Services</TabsTrigger>
            <TabsTrigger value="directory" className="flex-1 max-w-[200px]">Directory Services</TabsTrigger>
            <TabsTrigger value="platform" className="flex-1 max-w-[200px]">Platform Services</TabsTrigger>
          </TabsList>
          
          <TabsContent value="network">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2 text-white">Network Services</h2>
              <p className="text-muted-foreground">
                Services that facilitate interaction and communication between different healthcare entities, systems, and users.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {networkServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="configuration">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2 text-white">Configuration Services</h2>
              <p className="text-muted-foreground">
                Services for setting up and managing system configurations, reference data, and operational parameters.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {configurationServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="directory">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2 text-white">Directory Services</h2>
              <p className="text-muted-foreground">
                Services that manage identity, profiles, and relationships for various healthcare entities.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {directoryServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="platform">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2 text-white">Platform Services</h2>
              <p className="text-muted-foreground">
                Core technical services that support the entire Smart Health Hub platform.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {platformServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}