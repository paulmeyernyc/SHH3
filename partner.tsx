import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { UserPlus, Code, Shield, Database, Webhook, RefreshCw, Settings, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function PartnerPortalPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Sample data for demo purposes
  const partnerData = {
    name: "HealthTech Solutions",
    partnerType: "Technology Provider",
    status: "Active",
    onboardingProgress: 85,
    apiUsage: {
      currentMonth: 135022,
      limit: 150000,
      percentage: 90
    },
    connections: [
      { id: 1, name: "FHIR API", status: "active", lastConnected: "10 minutes ago", type: "api" },
      { id: 2, name: "Event Webhook", status: "active", lastConnected: "35 minutes ago", type: "webhook" },
      { id: 3, name: "SFTP Transfer", status: "inactive", lastConnected: "3 days ago", type: "sftp" },
      { id: 4, name: "HL7v2 Bridge", status: "active", lastConnected: "2 hours ago", type: "hl7" }
    ],
    apiKeys: [
      { id: "api_1a2b3c", name: "Production API Key", created: "Jan 15, 2025", expiresIn: "85 days", status: "active" },
      { id: "api_4d5e6f", name: "Development API Key", created: "Mar 2, 2025", expiresIn: "112 days", status: "active" },
      { id: "api_7g8h9i", name: "Test API Key", created: "Feb 10, 2025", expiresIn: "45 days", status: "active" }
    ],
    recentIntegrations: [
      { id: 1, name: "Patient Record Push", status: "online", type: "data-sync", lastSync: "15 minutes ago" },
      { id: 2, name: "Provider Directory Pull", status: "online", type: "directory", lastSync: "1 hour ago" },
      { id: 3, name: "Appointment Scheduling", status: "maintenance", type: "scheduler", lastSync: "5 hours ago" },
      { id: 4, name: "Claims Submission", status: "offline", type: "claims", lastSync: "2 days ago" }
    ],
    resources: [
      { id: 1, name: "API Documentation", description: "Complete reference for all API endpoints", type: "documentation" },
      { id: 2, name: "Integration Guide", description: "Step-by-step process for new integrations", type: "guide" },
      { id: 3, name: "SDK Downloads", description: "Client libraries for major programming languages", type: "sdk" },
      { id: 4, name: "Webhook Configuration", description: "Setting up real-time event subscriptions", type: "documentation" }
    ]
  };

  const StatCard = ({ icon, title, value, description, color }: { icon: React.ReactNode, title: string, value: string, description?: string, color: string }) => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className={`p-2 rounded-md ${color}`}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-sm text-muted-foreground">{title}</div>
        {description && <div className="text-xs text-muted-foreground mt-1">{description}</div>}
      </CardContent>
    </Card>
  );
  
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-primary">{partnerData.name}</h1>
              <Badge variant="outline" className="ml-2">{partnerData.partnerType}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">Partner Portal Dashboard</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button size="sm">
              <Code className="h-4 w-4 mr-2" />
              API Console
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="api">API & Keys</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                icon={<Shield className="h-5 w-5" />} 
                title="Account Status" 
                value={partnerData.status} 
                color="bg-green-500/20 text-green-500" 
              />
              <StatCard 
                icon={<Activity className="h-5 w-5" />} 
                title="API Usage" 
                value={`${partnerData.apiUsage.currentMonth.toLocaleString()} / ${partnerData.apiUsage.limit.toLocaleString()}`} 
                description="Current billing cycle"
                color="bg-blue-500/20 text-blue-500" 
              />
              <StatCard 
                icon={<UserPlus className="h-5 w-5" />} 
                title="Onboarding" 
                value={`${partnerData.onboardingProgress}%`} 
                color="bg-purple-500/20 text-purple-500" 
              />
              <StatCard 
                icon={<Database className="h-5 w-5" />} 
                title="Active Connections" 
                value={partnerData.connections.filter(c => c.status === "active").length.toString()} 
                color="bg-amber-500/20 text-amber-500" 
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Connection Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {partnerData.connections.map(connection => (
                      <div key={connection.id} className="flex items-start justify-between gap-4 pb-4 last:pb-0 last:border-0 border-b border-border">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-md ${
                            connection.type === "api" ? "bg-blue-500/20 text-blue-500" :
                            connection.type === "webhook" ? "bg-purple-500/20 text-purple-500" :
                            connection.type === "sftp" ? "bg-amber-500/20 text-amber-500" :
                            "bg-teal-500/20 text-teal-500"
                          }`}>
                            {connection.type === "api" ? <Code className="h-5 w-5" /> :
                            connection.type === "webhook" ? <Webhook className="h-5 w-5" /> :
                            connection.type === "sftp" ? <Database className="h-5 w-5" /> :
                            <RefreshCw className="h-5 w-5" />}
                          </div>
                          <div>
                            <h4 className="font-medium">{connection.name}</h4>
                            <p className="text-sm text-muted-foreground">Last active: {connection.lastConnected}</p>
                          </div>
                        </div>
                        <Badge variant={connection.status === "active" ? "default" : "secondary"}>
                          {connection.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Integration Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {partnerData.recentIntegrations.map(integration => (
                      <div key={integration.id} className="flex items-start justify-between gap-4 pb-4 last:pb-0 last:border-0 border-b border-border">
                        <div>
                          <h4 className="font-medium">{integration.name}</h4>
                          <p className="text-sm text-muted-foreground">Last sync: {integration.lastSync}</p>
                        </div>
                        <Badge variant={
                          integration.status === "online" ? "default" :
                          integration.status === "maintenance" ? "outline" : "destructive"
                        }>
                          {integration.status === "online" ? "Online" : 
                           integration.status === "maintenance" ? "Maintenance" : "Offline"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Progress</CardTitle>
                <CardDescription>Complete all required steps to achieve full platform integration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span className="font-medium">{partnerData.onboardingProgress}%</span>
                  </div>
                  <Progress value={partnerData.onboardingProgress} className="h-2" />
                  
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-sm">Account Setup</span>
                      </div>
                      <Badge variant="outline">Completed</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-sm">API Credentials</span>
                      </div>
                      <Badge variant="outline">Completed</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-sm">Webhook Configuration</span>
                      </div>
                      <Badge variant="outline">Completed</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                        <span className="text-sm">Data Model Implementation</span>
                      </div>
                      <Badge variant="outline">In Progress</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-slate-300"></div>
                        <span className="text-sm">Security Review</span>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>Manage your platform integrations and connection settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-4 border-b p-3 bg-muted/50">
                    <div className="font-medium">Integration</div>
                    <div className="font-medium">Type</div>
                    <div className="font-medium">Status</div>
                    <div className="font-medium text-right">Actions</div>
                  </div>
                  {partnerData.recentIntegrations.map(integration => (
                    <div key={integration.id} className="grid grid-cols-4 p-3 border-b last:border-0 items-center">
                      <div>{integration.name}</div>
                      <div className="capitalize">{integration.type.replace("-", " ")}</div>
                      <div>
                        <Badge variant={
                          integration.status === "online" ? "default" :
                          integration.status === "maintenance" ? "outline" : "destructive"
                        }>
                          {integration.status === "online" ? "Online" : 
                           integration.status === "maintenance" ? "Maintenance" : "Offline"}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add New Integration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage your API credentials for secure platform access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-5 border-b p-3 bg-muted/50">
                    <div className="font-medium">Key Name</div>
                    <div className="font-medium">Key ID</div>
                    <div className="font-medium">Created</div>
                    <div className="font-medium">Expires</div>
                    <div className="font-medium text-right">Actions</div>
                  </div>
                  {partnerData.apiKeys.map(key => (
                    <div key={key.id} className="grid grid-cols-5 p-3 border-b last:border-0 items-center">
                      <div>{key.name}</div>
                      <div className="font-mono text-xs">
                        {key.id}••••••••••••
                      </div>
                      <div>{key.created}</div>
                      <div>{key.expiresIn}</div>
                      <div className="text-right space-x-2">
                        <Button variant="outline" size="sm">Rotate</Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">Revoke</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button>
                    <Shield className="mr-2 h-4 w-4" />
                    Generate New API Key
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>API Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Current Billing Cycle</span>
                      <span className="text-sm font-medium">{partnerData.apiUsage.currentMonth.toLocaleString()} / {partnerData.apiUsage.limit.toLocaleString()} calls</span>
                    </div>
                    <Progress value={partnerData.apiUsage.percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {100 - partnerData.apiUsage.percentage}% of your monthly API quota remaining
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">Request Distribution</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">GET Requests</div>
                        <div className="text-sm font-medium">64,230 (48%)</div>
                        <Progress value={48} className="h-1.5" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">POST Requests</div>
                        <div className="text-sm font-medium">42,810 (32%)</div>
                        <Progress value={32} className="h-1.5" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">PUT Requests</div>
                        <div className="text-sm font-medium">19,422 (14%)</div>
                        <Progress value={14} className="h-1.5" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">DELETE Requests</div>
                        <div className="text-sm font-medium">8,560 (6%)</div>
                        <Progress value={6} className="h-1.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="resources" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {partnerData.resources.map(resource => (
                <Card key={resource.id} className="overflow-hidden">
                  <CardHeader className={`pb-3 ${
                    resource.type === 'documentation' ? 'bg-blue-500/10' :
                    resource.type === 'guide' ? 'bg-purple-500/10' :
                    resource.type === 'sdk' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                  }`}>
                    <CardTitle>{resource.name}</CardTitle>
                    <CardDescription>{resource.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Button variant="outline" className="w-full">Access Resource</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Support Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Technical Support</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Get help with technical integration issues and API questions
                      </p>
                      <Button variant="outline" className="w-full">Contact Support</Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Integration Workshops</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Join our weekly workshops for implementation guidance
                      </p>
                      <Button variant="outline" className="w-full">View Schedule</Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Partner Community</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Connect with other partners to share best practices
                      </p>
                      <Button variant="outline" className="w-full">Join Community</Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}