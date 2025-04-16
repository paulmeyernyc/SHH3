import { PortalLayout } from "@/components/portal/portal-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CreditCard, Users, FileText, Activity, Settings, ShieldCheck } from "lucide-react";

export default function PlanPortalPage() {
  return (
    <PortalLayout
      title="Plan Portal"
      portalType="Plan"
      subtitle="Insurance plan administration and member management"
    >
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-6 w-full max-w-4xl mb-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CreditCard size={16} />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users size={16} />
            <span>Members</span>
          </TabsTrigger>
          <TabsTrigger value="claims" className="flex items-center gap-2">
            <FileText size={16} />
            <span>Claims</span>
          </TabsTrigger>
          <TabsTrigger value="utilization" className="flex items-center gap-2">
            <Activity size={16} />
            <span>Utilization</span>
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings size={16} />
            <span>Configuration</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <ShieldCheck size={16} />
            <span>Compliance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Plan Dashboard</CardTitle>
              <CardDescription>
                Key performance indicators and plan overview
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <CreditCard className="h-16 w-16 text-primary/50 mb-4" />
              <h3 className="text-xl font-medium">Plan Administration</h3>
              <p className="text-center text-muted-foreground max-w-md mb-4">
                Comprehensive tools for managing insurance plans, member benefits, 
                claims processing, and plan performance analytics.
              </p>
              <Button>View Plan Details</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Member Management</CardTitle>
              <CardDescription>
                Manage plan members and enrollment
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-16 w-16 text-primary/50 mb-4" />
              <h3 className="text-xl font-medium">Member Directory</h3>
              <p className="text-center text-muted-foreground max-w-md mb-4">
                Tools for managing member enrollment, eligibility verification, 
                benefit assignment, and member communications.
              </p>
              <Button>Access Member Directory</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle>Claims Processing</CardTitle>
              <CardDescription>
                Manage and process insurance claims
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-primary/50 mb-4" />
              <h3 className="text-xl font-medium">Claims Management</h3>
              <p className="text-center text-muted-foreground max-w-md mb-4">
                Comprehensive tools for claims intake, processing, adjudication, 
                and payment management.
              </p>
              <Button>View Claims Dashboard</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="utilization">
          <Card>
            <CardHeader>
              <CardTitle>Utilization Management</CardTitle>
              <CardDescription>
                Monitor and manage healthcare utilization
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="h-16 w-16 text-primary/50 mb-4" />
              <h3 className="text-xl font-medium">Utilization Dashboard</h3>
              <p className="text-center text-muted-foreground max-w-md mb-4">
                Tools for monitoring healthcare service utilization, 
                prior authorization management, and care coordination.
              </p>
              <Button>Access Utilization Tools</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle>Plan Configuration</CardTitle>
              <CardDescription>
                Configure plan details, benefits, and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-16 w-16 text-primary/50 mb-4" />
              <h3 className="text-xl font-medium">Plan Settings</h3>
              <p className="text-center text-muted-foreground max-w-md mb-4">
                Administrative tools for configuring plan benefits, coverage details, 
                provider networks, and reimbursement policies.
              </p>
              <Button>Configure Plan Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Compliance</CardTitle>
              <CardDescription>
                Manage compliance with healthcare regulations
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShieldCheck className="h-16 w-16 text-primary/50 mb-4" />
              <h3 className="text-xl font-medium">Compliance Dashboard</h3>
              <p className="text-center text-muted-foreground max-w-md mb-4">
                Tools for managing regulatory compliance, reporting requirements, 
                and adherence to healthcare regulations.
              </p>
              <Button>View Compliance Status</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PortalLayout>
  );
}