import { Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Layout } from "@/components/layout";
import { 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Code, 
  BookOpen, 
  Server, 
  Database, 
  Shield, 
  Bell,
  LineChart,
  Webhook,
  Network,
  FileCode2,
  MessageSquare,
  Workflow,
  Search,
  ClipboardList,
  PenTool
} from "lucide-react";

// Service data structure
interface ServiceData {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  completion: number;
  keyFeatures: string[];
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

// Services data
const services: ServiceData[] = [
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
    technicalDocsLink: "/docs/database-service/",
    apiDocsLink: "/api-docs/database-service/",
    status: "stable"
  },
  {
    id: "observability-service",
    name: "Observability Service",
    description: "Comprehensive monitoring and observability infrastructure",
    icon: <LineChart className="h-8 w-8 text-violet-500" />,
    completion: 100,
    keyFeatures: [
      "Distributed tracing",
      "Structured logging",
      "Application metrics",
      "Alerting system",
      "Dashboard visualizations"
    ],
    technicalDocsLink: "/docs/observability-service/",
    apiDocsLink: "/api-docs/observability-service/",
    status: "stable"
  },
  {
    id: "webhook-service",
    name: "Webhook Service",
    description: "Event notification system for real-time integrations",
    icon: <Webhook className="h-8 w-8 text-rose-500" />,
    completion: 100,
    keyFeatures: [
      "Subscription management",
      "HMAC signature verification",
      "Retry mechanism",
      "Filtered event delivery",
      "Delivery logs"
    ],
    technicalDocsLink: "/docs/webhook-service/",
    apiDocsLink: "/api-docs/webhook-service/",
    status: "stable"
  },
  {
    id: "sdk-generation",
    name: "SDK Generation",
    description: "Automated client library generation for multiple languages",
    icon: <FileCode2 className="h-8 w-8 text-amber-500" />,
    completion: 100,
    keyFeatures: [
      "JavaScript/TypeScript SDK",
      "Python SDK",
      "Java SDK",
      "Comprehensive documentation",
      "Webhook client support"
    ],
    technicalDocsLink: "/docs/sdk-generation/",
    apiDocsLink: "/api-docs/sdk-generation/",
    status: "stable"
  },
  {
    id: "integration-gateway",
    name: "Integration Gateway",
    description: "Bridge to external healthcare systems via industry protocols",
    icon: <Network className="h-8 w-8 text-cyan-500" />,
    completion: 80,
    keyFeatures: [
      "HL7 v2 support",
      "DICOM integration",
      "CDA document processing",
      "Protocol mapping",
      "Transformation engine"
    ],
    technicalDocsLink: "/docs/integration-gateway/",
    apiDocsLink: "/api-docs/integration-gateway/",
    status: "beta"
  },
  {
    id: "messaging-service",
    name: "Messaging Service",
    description: "Secure communication between platform users",
    icon: <MessageSquare className="h-8 w-8 text-green-500" />,
    completion: 75,
    keyFeatures: [
      "End-to-end encryption",
      "Message threading",
      "File attachments",
      "Read receipts",
      "Message expiration"
    ],
    technicalDocsLink: "/docs/messaging-service/",
    apiDocsLink: "/api-docs/messaging-service/",
    status: "beta"
  },
  {
    id: "workflow-engine",
    name: "Workflow Engine",
    description: "Healthcare process automation and clinical pathway management",
    icon: <Workflow className="h-8 w-8 text-orange-500" />,
    completion: 65,
    keyFeatures: [
      "Process definition",
      "Task assignment",
      "State transitions",
      "SLA monitoring",
      "Integration triggers"
    ],
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
    technicalDocsLink: "/docs/notification-service/",
    apiDocsLink: "/api-docs/notification-service/",
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
    technicalDocsLink: "/docs/analytics-service/",
    apiDocsLink: "/api-docs/analytics-service/",
    status: "beta"
  },
  {
    id: "consent-service",
    name: "Consent Management",
    description: "Patient consent tracking and enforcement",
    icon: <PenTool className="h-8 w-8 text-pink-500" />,
    completion: 60,
    keyFeatures: [
      "Consent recording",
      "Purpose-based permissions",
      "Consent verification",
      "Audit trail",
      "Revocation handling"
    ],
    technicalDocsLink: "/docs/consent-service/",
    apiDocsLink: "/api-docs/consent-service/",
    status: "development"
  }
];

export default function PlatformOverview() {
  const navigate = (path: string) => {
    window.location.href = path;
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 flex-grow">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-white">
            Platform Services
          </h1>
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

        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
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
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(`/docs/${service.id}`, '_blank')}
                  className="flex items-center"
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  Technical Docs
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(`/api-docs/${service.id}`, '_blank')}
                  className="flex items-center"
                >
                  <Code className="h-4 w-4 mr-1" />
                  API Reference
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}