import React from "react";
import { Network, Link, MessageSquare, PenTool, User, FileText, Activity, ClipboardCheck, DollarSign, FileSpreadsheet, CreditCard, Award, BookIcon } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Code, CheckCircle2 } from "lucide-react";

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

// Network Services data
const services: ServiceData[] = [
  {
    id: "integration-gateway",
    name: "Integration Gateway",
    description: "Bridge to external healthcare systems via industry protocols with enhanced partner onboarding capabilities",
    icon: <Network className="h-8 w-8 text-cyan-500" />,
    completion: 95,
    keyFeatures: [
      "SMART on FHIR app launching",
      "API Key self-service management",
      "HL7 v2, FHIR R4, and DICOM support",
      "CDS Hooks integration",
      "Self-service connection monitoring",
      "Bulk FHIR data transfer"
    ],
    technicalDocsLink: "/docs/integration-gateway/",
    apiDocsLink: "/api-docs/integration-gateway/",
    status: "stable"
  },
  {
    id: "directory-connect",
    name: "Directory Connect",
    description: "Centralized healthcare directory synchronization service",
    icon: <Link className="h-8 w-8 text-blue-500" />,
    completion: 95,
    keyFeatures: [
      "Bidirectional sync",
      "Real-time updates",
      "Source authority mapping",
      "Directory federation",
      "Change history tracking"
    ],
    technicalDocsLink: "/docs/directory-connect/",
    apiDocsLink: "/api-docs/directory-connect/",
    status: "stable"
  },
  {
    id: "secure-messaging",
    name: "Secure Messaging",
    description: "HIPAA-compliant communication platform for healthcare providers",
    icon: <MessageSquare className="h-8 w-8 text-green-500" />,
    completion: 85,
    keyFeatures: [
      "End-to-end encryption",
      "Message threading",
      "File attachments",
      "Read receipts",
      "Message expiration"
    ],
    technicalDocsLink: "/docs/messaging-service/",
    apiDocsLink: "/api-docs/messaging-service/",
    status: "stable"
  },
  {
    id: "consent-management",
    name: "Consent Management",
    description: "Dynamic patient consent tracking and policy enforcement",
    icon: <PenTool className="h-8 w-8 text-pink-500" />,
    completion: 75,
    keyFeatures: [
      "Consent recording",
      "Policy decision point",
      "Purpose-based permissions",
      "Consent verification",
      "Revocation handling"
    ],
    technicalDocsLink: "/docs/consent-management/",
    apiDocsLink: "/api-docs/consent-management/",
    status: "beta"
  },
  {
    id: "patient-data-access",
    name: "Patient Data Access",
    description: "Secure patient access to personal health information",
    icon: <User className="h-8 w-8 text-indigo-500" />,
    completion: 70,
    keyFeatures: [
      "PHR data integration",
      "Patient portal",
      "Data export/import",
      "Proxy access management",
      "Access logging"
    ],
    technicalDocsLink: "/docs/patient-data-access/",
    apiDocsLink: "/api-docs/patient-data-access/",
    status: "beta"
  },
  {
    id: "contract-parsing",
    name: "Secure Contract Parsing",
    description: "AI-powered healthcare contract analysis and management",
    icon: <FileText className="h-8 w-8 text-violet-500" />,
    completion: 65,
    keyFeatures: [
      "Automated extraction",
      "Coverage verification",
      "Clause analysis",
      "Obligation tracking",
      "Contract comparison"
    ],
    technicalDocsLink: "/docs/contract-parsing/",
    apiDocsLink: "/api-docs/contract-parsing/",
    status: "beta"
  },
  {
    id: "eligibility-benefits",
    name: "Eligibility & Benefits",
    description: "Real-time insurance eligibility verification service",
    icon: <Activity className="h-8 w-8 text-emerald-500" />,
    completion: 90,
    keyFeatures: [
      "Real-time verification",
      "Benefit summary",
      "Network status check",
      "Batch processing",
      "Response caching"
    ],
    technicalDocsLink: "/docs/eligibility-benefits/",
    apiDocsLink: "/api-docs/eligibility-benefits/",
    status: "stable"
  },
  {
    id: "prior-authorization",
    name: "Prior Authorization",
    description: "Streamlined authorization workflow for medical procedures",
    icon: <ClipboardCheck className="h-8 w-8 text-amber-500" />,
    completion: 60,
    keyFeatures: [
      "Authorization submission",
      "Status tracking",
      "Clinical criteria checks",
      "Documentation management",
      "Appeal processing"
    ],
    technicalDocsLink: "/docs/prior-authorization/",
    apiDocsLink: "/api-docs/prior-authorization/",
    status: "development"
  },
  {
    id: "cost-estimation",
    name: "Cost Estimation",
    description: "Accurate patient responsibility estimation for healthcare services",
    icon: <DollarSign className="h-8 w-8 text-green-600" />,
    completion: 75,
    keyFeatures: [
      "Contract-based estimates",
      "Patient responsibility",
      "Insurance coverage",
      "Multi-service bundling",
      "Historical data analysis"
    ],
    technicalDocsLink: "/docs/cost-estimation/",
    apiDocsLink: "/api-docs/cost-estimation/",
    status: "beta"
  },
  {
    id: "claims-processing",
    name: "Claims Processing",
    description: "End-to-end healthcare claims processing and management",
    icon: <FileSpreadsheet className="h-8 w-8 text-blue-600" />,
    completion: 85,
    keyFeatures: [
      "Claim submission",
      "Real-time adjudication",
      "Error correction",
      "Status tracking",
      "Payment reconciliation"
    ],
    technicalDocsLink: "/docs/claims-processing/",
    apiDocsLink: "/api-docs/claims-processing/",
    status: "stable"
  },
  {
    id: "billing-payments",
    name: "Billing & Payments",
    description: "Comprehensive healthcare financial transaction processing",
    icon: <CreditCard className="h-8 w-8 text-purple-600" />,
    completion: 80,
    keyFeatures: [
      "Patient billing",
      "Payment processing",
      "Payment plans",
      "EFT/ERA management",
      "Reconciliation tools"
    ],
    technicalDocsLink: "/docs/billing-payments/",
    apiDocsLink: "/api-docs/billing-payments/",
    status: "beta"
  },
  {
    id: "gold-carding",
    name: "Gold Carding",
    description: "Streamlined credentialing system for high-performing providers",
    icon: <Award className="h-8 w-8 text-yellow-500" />,
    completion: 65,
    keyFeatures: [
      "Performance analytics",
      "Automated eligibility",
      "Credentialing simplification",
      "Prior auth exemptions",
      "Quality metrics tracking"
    ],
    technicalDocsLink: "/docs/gold-carding/",
    apiDocsLink: "/api-docs/gold-carding/",
    status: "development"
  },
  {
    id: "rules-management",
    name: "Rules Management",
    description: "Dynamic healthcare business rules configuration and execution",
    icon: <BookIcon className="h-8 w-8 text-blue-400" />,
    completion: 70,
    keyFeatures: [
      "Rule authoring interface",
      "Version control",
      "Testing & simulation",
      "Audit logging",
      "Integration APIs"
    ],
    technicalDocsLink: "/docs/rules-management/",
    apiDocsLink: "/api-docs/rules-management/",
    status: "beta"
  }
];

export default function NetworkServices() {
  const navigate = (path: string) => {
    window.location.href = path;
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 flex-grow">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <h1 className="text-4xl font-bold mb-4 md:mb-0 text-white">
            Network Services
          </h1>
          <div className="flex justify-end">
            <Button 
              onClick={() => navigate('/network/directory')}
              className="bg-transparent border border-primary text-primary py-2 px-4 rounded-md hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-white transition-all"
            >
              <Network className="h-4 w-4 mr-2" />
              View Network Directory
            </Button>
          </div>
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