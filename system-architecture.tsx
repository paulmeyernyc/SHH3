import React from 'react';
import { Layout } from '../components/layout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const SystemArchitecturePage = () => {
  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">System Architecture</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of the Smart Health Hub's architecture, components, and technical design
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="microservices">Microservices</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Architecture Overview</CardTitle>
                <CardDescription>Key components and high-level design</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">High-Level Architecture</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The Smart Health Hub is designed as a scalable, cloud-native platform using a microservices architecture with event-driven communication patterns.
                  </p>
                  
                  <div className="relative bg-muted rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-card rounded-lg p-4 border shadow-sm">
                        <h4 className="font-semibold mb-2">Client Layer</h4>
                        <p className="text-xs text-muted-foreground">React-based frontend with tailored portal UIs for each user type</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">Web Portal</Badge>
                          <Badge variant="outline" className="text-xs">Mobile Apps</Badge>
                          <Badge variant="outline" className="text-xs">API Clients</Badge>
                        </div>
                      </div>
                      
                      <div className="bg-card rounded-lg p-4 border shadow-sm">
                        <h4 className="font-semibold mb-2">API Gateway Layer</h4>
                        <p className="text-xs text-muted-foreground">Centralized entry point with routing, authentication, and rate limiting</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">REST APIs</Badge>
                          <Badge variant="outline" className="text-xs">FHIR APIs</Badge>
                          <Badge variant="outline" className="text-xs">GraphQL</Badge>
                        </div>
                      </div>
                      
                      <div className="bg-card rounded-lg p-4 border shadow-sm">
                        <h4 className="font-semibold mb-2">Integration Layer</h4>
                        <p className="text-xs text-muted-foreground">Connectors and adapters for external systems integration</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">FHIR</Badge>
                          <Badge variant="outline" className="text-xs">HL7v2</Badge>
                          <Badge variant="outline" className="text-xs">X12</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="my-4 flex justify-center">
                      <svg height="40" width="160" className="text-muted-foreground">
                        <line x1="80" y1="0" x2="80" y2="40" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
                      </svg>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-primary/10 rounded-lg p-4 border shadow-sm col-span-4">
                        <h4 className="font-semibold mb-2">Microservices Layer</h4>
                        <p className="text-xs text-muted-foreground mb-3">Domain-specific services with dedicated responsibilities</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-primary/5 rounded p-2 border">
                            <h5 className="text-sm font-medium">Core Services</h5>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs">PHR</Badge>
                              <Badge variant="outline" className="text-xs">Consent</Badge>
                              <Badge variant="outline" className="text-xs">Directory</Badge>
                            </div>
                          </div>
                          
                          <div className="bg-primary/5 rounded p-2 border">
                            <h5 className="text-sm font-medium">Claims Services</h5>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs">Claims Processing</Badge>
                              <Badge variant="outline" className="text-xs">Prior Auth</Badge>
                              <Badge variant="outline" className="text-xs">Goldcarding</Badge>
                            </div>
                          </div>
                          
                          <div className="bg-primary/5 rounded p-2 border">
                            <h5 className="text-sm font-medium">Care Services</h5>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs">Scheduling</Badge>
                              <Badge variant="outline" className="text-xs">Care Events</Badge>
                              <Badge variant="outline" className="text-xs">Billing</Badge>
                            </div>
                          </div>
                          
                          <div className="bg-primary/5 rounded p-2 border">
                            <h5 className="text-sm font-medium">Support Services</h5>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs">Notification</Badge>
                              <Badge variant="outline" className="text-xs">Audit</Badge>
                              <Badge variant="outline" className="text-xs">Analytics</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="my-4 flex justify-center">
                      <svg height="40" width="160" className="text-muted-foreground">
                        <line x1="80" y1="0" x2="80" y2="40" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
                      </svg>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-card rounded-lg p-4 border shadow-sm">
                        <h4 className="font-semibold mb-2">Data Layer</h4>
                        <p className="text-xs text-muted-foreground">Distributed persistence with sharding and replication</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">PostgreSQL</Badge>
                          <Badge variant="outline" className="text-xs">Redis</Badge>
                          <Badge variant="outline" className="text-xs">Elasticsearch</Badge>
                        </div>
                      </div>
                      
                      <div className="bg-card rounded-lg p-4 border shadow-sm">
                        <h4 className="font-semibold mb-2">Message Bus</h4>
                        <p className="text-xs text-muted-foreground">Event-driven communication and reliable message delivery</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">Event Streaming</Badge>
                          <Badge variant="outline" className="text-xs">Message Queues</Badge>
                          <Badge variant="outline" className="text-xs">Pub/Sub</Badge>
                        </div>
                      </div>
                      
                      <div className="bg-card rounded-lg p-4 border shadow-sm">
                        <h4 className="font-semibold mb-2">Infrastructure Layer</h4>
                        <p className="text-xs text-muted-foreground">Cloud-native containerized deployment</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">Kubernetes</Badge>
                          <Badge variant="outline" className="text-xs">Docker</Badge>
                          <Badge variant="outline" className="text-xs">Terraform</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-xl font-semibold mb-2">Key Architectural Principles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Domain-Driven Design</h4>
                      <p className="text-sm text-muted-foreground">
                        Services are organized around business domains rather than technical functions, ensuring clear boundaries 
                        and focused responsibilities.
                      </p>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Zero-Trust Security</h4>
                      <p className="text-sm text-muted-foreground">
                        All service-to-service communication requires authentication and authorization, with no implicit trust 
                        between components.
                      </p>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Event-Driven Architecture</h4>
                      <p className="text-sm text-muted-foreground">
                        Asynchronous communication patterns enable loose coupling between services, improving resilience 
                        and scalability.
                      </p>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Observability-First</h4>
                      <p className="text-sm text-muted-foreground">
                        Comprehensive logging, metrics, and tracing across all components for real-time monitoring, 
                        debugging, and performance optimization.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="microservices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Microservices Architecture</CardTitle>
                <CardDescription>Details of individual microservices and their interactions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Core Services</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-muted rounded-lg p-4 border">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">PHR Service</h4>
                          <Badge>Core</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground my-2">
                          Manages personal health records with full FHIR R4 compatibility, handling record creation, 
                          updates, and access control.
                        </p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Key Capabilities:</h5>
                          <ul className="mt-1 text-sm list-disc list-inside text-muted-foreground">
                            <li>FHIR resource management</li>
                            <li>Document attachment support</li>
                            <li>Versioning and history</li>
                            <li>Structured and unstructured data</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-4 border">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">Universal Consent Service</h4>
                          <Badge>Core</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground my-2">
                          Central Policy Decision Point (PDP) for all consent management, enforcement, and audit across the platform.
                        </p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Key Capabilities:</h5>
                          <ul className="mt-1 text-sm list-disc list-inside text-muted-foreground">
                            <li>Fine-grained consent policies</li>
                            <li>Dynamic consent requests</li>
                            <li>Consent decision cache</li>
                            <li>Regulatory compliance</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-4 border">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">User Directory Service</h4>
                          <Badge>Core</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground my-2">
                          Manages user accounts, authentication, and authorization across all platform components.
                        </p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Key Capabilities:</h5>
                          <ul className="mt-1 text-sm list-disc list-inside text-muted-foreground">
                            <li>Identity management</li>
                            <li>Role-based access control</li>
                            <li>Multi-factor authentication</li>
                            <li>OAuth 2.0/OIDC support</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-4 border">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">Master Person/Patient Index</h4>
                          <Badge>Core</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground my-2">
                          Provides robust person identification, deduplication, and record linkage capabilities.
                        </p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Key Capabilities:</h5>
                          <ul className="mt-1 text-sm list-disc list-inside text-muted-foreground">
                            <li>Probabilistic matching</li>
                            <li>Identity resolution</li>
                            <li>Record cross-referencing</li>
                            <li>Demographic data management</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Claims and Authorization Services</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-muted rounded-lg p-4 border">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">Claims Processing Service</h4>
                          <Badge>Claims</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground my-2">
                          Handles claim submission, tracking, and processing with dual-path architecture for direct 
                          and payer-forwarded claims.
                        </p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Key Capabilities:</h5>
                          <ul className="mt-1 text-sm list-disc list-inside text-muted-foreground">
                            <li>Dual-path claim routing</li>
                            <li>AI-enhanced claim preparation</li>
                            <li>Claim status tracking</li>
                            <li>EDI X12 support</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-4 border">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">Prior Authorization Service</h4>
                          <Badge>Claims</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground my-2">
                          Manages prior authorization requests with dual-path design for local and payer-forwarded processing.
                        </p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Key Capabilities:</h5>
                          <ul className="mt-1 text-sm list-disc list-inside text-muted-foreground">
                            <li>Hub-run local rules</li>
                            <li>Pass-through payer routing</li>
                            <li>Authorization status tracking</li>
                            <li>Clinical criteria matching</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-4 border">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">Goldcarding Service</h4>
                          <Badge>Claims</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground my-2">
                          Implements provider goldcarding to streamline prior authorizations and claims processing.
                        </p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Key Capabilities:</h5>
                          <ul className="mt-1 text-sm list-disc list-inside text-muted-foreground">
                            <li>Provider eligibility tracking</li>
                            <li>Service-specific exemptions</li>
                            <li>Goldcarding rule engine</li>
                            <li>Automated renewal</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-4 border">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">Eligibility & Benefits Service</h4>
                          <Badge>Claims</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground my-2">
                          Provides real-time eligibility verification and benefits information for patients.
                        </p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Key Capabilities:</h5>
                          <ul className="mt-1 text-sm list-disc list-inside text-muted-foreground">
                            <li>Real-time verification</li>
                            <li>Benefits calculation</li>
                            <li>Coverage rule evaluation</li>
                            <li>Multiple payer connectivity</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Integration and Infrastructure Services</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-muted rounded-lg p-4 border">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">Integration Gateway Service</h4>
                          <Badge>Integration</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground my-2">
                          Provides secure connectivity to external healthcare systems with protocol translation and data mapping.
                        </p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Key Capabilities:</h5>
                          <ul className="mt-1 text-sm list-disc list-inside text-muted-foreground">
                            <li>FHIR/HL7v2/X12 protocols</li>
                            <li>API key management</li>
                            <li>Connection statistics</li>
                            <li>SMART on FHIR app support</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-4 border">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">Observability Service</h4>
                          <Badge>Infrastructure</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground my-2">
                          Collects, processes, and visualizes system metrics, logs, and traces for monitoring and troubleshooting.
                        </p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Key Capabilities:</h5>
                          <ul className="mt-1 text-sm list-disc list-inside text-muted-foreground">
                            <li>Distributed tracing</li>
                            <li>Metrics aggregation</li>
                            <li>Log correlation</li>
                            <li>Alerting and dashboards</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-4 border">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">Audit Service</h4>
                          <Badge>Infrastructure</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground my-2">
                          Captures comprehensive audit trails for all system activities with compliance reporting.
                        </p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Key Capabilities:</h5>
                          <ul className="mt-1 text-sm list-disc list-inside text-muted-foreground">
                            <li>HIPAA-compliant audit</li>
                            <li>Data access tracking</li>
                            <li>Change history</li>
                            <li>Retention policy management</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-4 border">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">Notification Service</h4>
                          <Badge>Infrastructure</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground my-2">
                          Handles delivery of notifications across multiple channels with delivery tracking.
                        </p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Key Capabilities:</h5>
                          <ul className="mt-1 text-sm list-disc list-inside text-muted-foreground">
                            <li>Multi-channel delivery</li>
                            <li>Templating engine</li>
                            <li>Delivery guarantees</li>
                            <li>Preference management</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Architecture</CardTitle>
                <CardDescription>Sharding strategy, data modeling, and schema design</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Sharding Strategy</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The platform employs a multi-dimensional sharding approach to distribute data efficiently across database instances.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">Tenant-Based Sharding</h4>
                      <p className="text-sm text-muted-foreground">
                        Primary sharding dimension divides data by tenant (organization) to maintain strict data isolation. 
                        Each tenant's data lives in a dedicated logical shard with its own connection pool.
                      </p>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">Functional Sharding</h4>
                      <p className="text-sm text-muted-foreground">
                        Secondary sharding dimension separates data by functional domain (PHR, claims, billing) 
                        to optimize for domain-specific query patterns and scaling needs.
                      </p>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">Time-Based Partitioning</h4>
                      <p className="text-sm text-muted-foreground">
                        High-volume tables like claims, events, and audit logs are partitioned by time periods to 
                        improve query performance and enable efficient archiving of historical data.
                      </p>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">Read/Write Splitting</h4>
                      <p className="text-sm text-muted-foreground">
                        Database connections are pooled and routed to primary (write) or read replica instances 
                        based on operation type, with automatic failover and load balancing.
                      </p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-xl font-semibold mb-2">Database Technologies</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">PostgreSQL</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Primary relational database for structured data with JSONB support for FHIR resources.
                      </p>
                      <div className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Usage:</span>
                          <span>Core data persistence</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Features:</span>
                          <span>JSONB, partitioning</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Scaling:</span>
                          <span>Horizontal sharding</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">Redis</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        In-memory data store for caching, session management, and pub/sub messaging.
                      </p>
                      <div className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Usage:</span>
                          <span>Caching, messaging</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Features:</span>
                          <span>Pub/sub, streams</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Scaling:</span>
                          <span>Cluster mode</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">Elasticsearch</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Distributed search engine for full-text search and analytics on healthcare data.
                      </p>
                      <div className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Usage:</span>
                          <span>Search, analytics</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Features:</span>
                          <span>Full-text, aggregations</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Scaling:</span>
                          <span>Shards and replicas</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-xl font-semibold mb-2">Data Model Design</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The platform employs a hybrid data modeling approach to balance flexibility, performance, and standards compliance.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">FHIR Resources</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        FHIR R4 resources are stored using a hybrid approach with indexed metadata and JSONB document bodies.
                      </p>
                      <div className="border rounded-md p-2 bg-card">
                        <pre className="text-xs overflow-auto">
                          <code>
{`# FHIR Resource Schema Example
fhir_resources (
  id UUID PRIMARY KEY,
  resource_type VARCHAR NOT NULL,
  patient_id UUID NOT NULL,
  version INTEGER NOT NULL,
  last_updated TIMESTAMP NOT NULL,
  status VARCHAR NOT NULL,
  structured_fields JSONB NOT NULL,
  resource_body JSONB NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
)
/* Indexes for common query patterns */
CREATE INDEX ON fhir_resources(resource_type);
CREATE INDEX ON fhir_resources(patient_id);
CREATE INDEX ON fhir_resources((resource_body->>'identifier'));`}
                          </code>
                        </pre>
                      </div>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">Entity Separation</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Clear separation between Person (MPI), Patient (MPI), and User (Directory) entities with specialized indices.
                      </p>
                      <div className="border rounded-md p-2 bg-card">
                        <pre className="text-xs overflow-auto">
                          <code>
{`# Entity Relationships Example
persons (
  id UUID PRIMARY KEY,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  birth_date DATE NOT NULL,
  /* Additional demographic fields */
)

patients (
  id UUID PRIMARY KEY,
  person_id UUID NOT NULL,
  medical_record_number VARCHAR UNIQUE,
  /* Patient-specific attributes */
  FOREIGN KEY (person_id) REFERENCES persons(id)
)

users (
  id UUID PRIMARY KEY,
  person_id UUID,
  username VARCHAR UNIQUE,
  /* User account attributes */
  FOREIGN KEY (person_id) REFERENCES persons(id)
)`}
                          </code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Architecture</CardTitle>
                <CardDescription>Zero-trust model, encryption, and compliance features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Zero-Trust Security Model</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The platform implements a comprehensive zero-trust security architecture with no implicit trust between components.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">Authentication</h4>
                      <ul className="mt-1 space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">JWT</span>
                          <span>Short-lived JWT tokens with signature verification</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">MFA</span>
                          <span>Multi-factor authentication for all user accounts</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">OIDC</span>
                          <span>OAuth 2.0/OIDC compliant identity federation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">mTLS</span>
                          <span>Mutual TLS for service-to-service communication</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">Authorization</h4>
                      <ul className="mt-1 space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">RBAC</span>
                          <span>Role-based access control for coarse-grained permissions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">ABAC</span>
                          <span>Attribute-based policies for fine-grained control</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">PDP</span>
                          <span>Centralized policy decision points for consent</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">SCOPE</span>
                          <span>Scoped OAuth tokens for API access control</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">Risk Assessment</h4>
                      <ul className="mt-1 space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">CONTEXT</span>
                          <span>Context-aware access evaluation (device, location, time)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">BEHAVIOR</span>
                          <span>Behavioral analysis for anomaly detection</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">SCORE</span>
                          <span>Real-time risk scoring for access decisions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">THRESHOLD</span>
                          <span>Dynamic risk thresholds based on data sensitivity</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-xl font-semibold mb-2">Data Protection</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">Encryption Layers</h4>
                      <div className="relative mt-4 pt-6 pb-2 px-4 border rounded-lg bg-card">
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-muted px-2 text-xs font-medium">
                          Encryption Stack
                        </div>
                        
                        <div className="space-y-3">
                          <div className="bg-primary/5 p-2 rounded border text-sm">
                            <span className="font-medium">Transport Encryption</span>
                            <p className="text-xs text-muted-foreground mt-1">TLS 1.3 for all external and internal traffic with modern cipher suites</p>
                          </div>
                          
                          <div className="bg-primary/5 p-2 rounded border text-sm">
                            <span className="font-medium">Application-Level Encryption</span>
                            <p className="text-xs text-muted-foreground mt-1">Field-level encryption for sensitive PHI elements with key rotation</p>
                          </div>
                          
                          <div className="bg-primary/5 p-2 rounded border text-sm">
                            <span className="font-medium">Database Encryption</span>
                            <p className="text-xs text-muted-foreground mt-1">Transparent data encryption (TDE) for data at rest</p>
                          </div>
                          
                          <div className="bg-primary/5 p-2 rounded border text-sm">
                            <span className="font-medium">Key Management</span>
                            <p className="text-xs text-muted-foreground mt-1">Centralized key management with HSM backing and automatic rotation</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">Audit and Compliance</h4>
                      <ul className="mt-1 space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">HIPAA</span>
                          <span>Comprehensive audit logging of all PHI access and changes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">INTEGRITY</span>
                          <span>Cryptographic integrity verification for audit records</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">RETENTION</span>
                          <span>Configurable retention policies with tamper-evident storage</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">REPORTING</span>
                          <span>Automated compliance reporting for regulatory requirements</span>
                        </li>
                      </ul>
                      
                      <div className="mt-4 pt-2 border-t">
                        <h5 className="text-sm font-medium mb-2">Data Access Patterns</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-primary/5 p-2 rounded border text-sm">
                            <span className="text-xs font-medium">Break-Glass Access</span>
                            <p className="text-xs text-muted-foreground mt-1">Emergency access with mandatory justification and high-priority auditing</p>
                          </div>
                          
                          <div className="bg-primary/5 p-2 rounded border text-sm">
                            <span className="text-xs font-medium">Minimum Necessary</span>
                            <p className="text-xs text-muted-foreground mt-1">Automatic data filtering based on purpose of use declarations</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Integration Architecture</CardTitle>
                <CardDescription>External system connectivity and interoperability standards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Interoperability Standards</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">FHIR R4</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Primary API standard with support for all US Core profiles and extensions.
                      </p>
                      <div className="text-sm">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">REST</span>
                          <span className="text-muted-foreground">Full REST API implementation</span>
                        </div>
                        <div className="flex items-start gap-2 mb-1">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">SMART</span>
                          <span className="text-muted-foreground">SMART on FHIR app launch framework</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">BULK</span>
                          <span className="text-muted-foreground">Bulk data export capabilities</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">HL7v2</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Legacy integration support for HL7v2 messaging with bidirectional translation.
                      </p>
                      <div className="text-sm">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">ADT</span>
                          <span className="text-muted-foreground">Admission, discharge, transfer</span>
                        </div>
                        <div className="flex items-start gap-2 mb-1">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">ORM/ORU</span>
                          <span className="text-muted-foreground">Orders and results</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">SIU</span>
                          <span className="text-muted-foreground">Scheduling information</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-4 border">
                      <h4 className="font-semibold mb-2">X12</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Support for EDI X12 transactions for claims and eligibility workflows.
                      </p>
                      <div className="text-sm">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">837</span>
                          <span className="text-muted-foreground">Claims submission</span>
                        </div>
                        <div className="flex items-start gap-2 mb-1">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">835</span>
                          <span className="text-muted-foreground">Remittance advice</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">270/271</span>
                          <span className="text-muted-foreground">Eligibility verification</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-xl font-semibold mb-2">Integration Gateway</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The Integration Gateway provides secure, managed connectivity to external healthcare systems.
                  </p>
                  
                  <div className="relative bg-muted rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-card rounded-lg p-4 border shadow-sm">
                        <h4 className="font-semibold mb-2">Connection Management</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">CREDS</span>
                            <span>Secure credential management for external systems</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">REGISTRY</span>
                            <span>Connection registry with endpoint discovery</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">MONITOR</span>
                            <span>Real-time connection health monitoring</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="bg-card rounded-lg p-4 border shadow-sm">
                        <h4 className="font-semibold mb-2">Protocol Adapters</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">TRANSFORM</span>
                            <span>Bidirectional data transformation between formats</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">VALIDATE</span>
                            <span>Message validation against standards</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">ROUTE</span>
                            <span>Intelligent message routing and orchestration</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="bg-card rounded-lg p-4 border shadow-sm">
                        <h4 className="font-semibold mb-2">API Management</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">KEYS</span>
                            <span>API key management and rotation</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">RATE</span>
                            <span>Rate limiting and quota enforcement</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-primary/10 text-primary px-1 rounded text-xs font-semibold mt-0.5">METRICS</span>
                            <span>Detailed API usage analytics</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="my-4 flex justify-center">
                      <svg height="40" width="160" className="text-muted-foreground">
                        <line x1="80" y1="0" x2="80" y2="40" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
                      </svg>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-card rounded-lg p-4 border shadow-sm">
                        <h4 className="font-semibold mb-2">Integration Patterns</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-primary/5 rounded p-2 border">
                            <h5 className="text-sm font-medium">Synchronous</h5>
                            <p className="text-xs text-muted-foreground mt-1">
                              Real-time request-response patterns for immediate data needs
                            </p>
                          </div>
                          
                          <div className="bg-primary/5 rounded p-2 border">
                            <h5 className="text-sm font-medium">Asynchronous</h5>
                            <p className="text-xs text-muted-foreground mt-1">
                              Message-based communication with reliable delivery guarantees
                            </p>
                          </div>
                          
                          <div className="bg-primary/5 rounded p-2 border">
                            <h5 className="text-sm font-medium">Batch</h5>
                            <p className="text-xs text-muted-foreground mt-1">
                              Scheduled bulk data exchanges with validation and reconciliation
                            </p>
                          </div>
                          
                          <div className="bg-primary/5 rounded p-2 border">
                            <h5 className="text-sm font-medium">Event-Driven</h5>
                            <p className="text-xs text-muted-foreground mt-1">
                              Pub/sub notification pattern for real-time event propagation
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-card rounded-lg p-4 border shadow-sm">
                        <h4 className="font-semibold mb-2">External Systems</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">EHR Systems</span>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-xs">FHIR</Badge>
                              <Badge variant="outline" className="text-xs">HL7v2</Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Payer Systems</span>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-xs">X12</Badge>
                              <Badge variant="outline" className="text-xs">FHIR</Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Health Information Exchanges</span>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-xs">FHIR</Badge>
                              <Badge variant="outline" className="text-xs">XDS</Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Lab/Imaging Systems</span>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-xs">HL7v2</Badge>
                              <Badge variant="outline" className="text-xs">DICOM</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SystemArchitecturePage;