import { PortalLayout } from "@/components/portal/portal-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building, Users, Wrench, FileSpreadsheet, Globe, Shield } from "lucide-react";

export default function OrganizationPortalPage() {
  return (
    <PortalLayout
      title="Provider Organization Portal"
      portalType="Organization"
      subtitle="Manage your healthcare organization settings, staff, and facility information"
    >
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-6 w-full max-w-4xl mb-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Building size={16} />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users size={16} />
            <span>Staff</span>
          </TabsTrigger>
          <TabsTrigger value="facilities" className="flex items-center gap-2">
            <Globe size={16} />
            <span>Facilities</span>
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Wrench size={16} />
            <span>Admin</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileSpreadsheet size={16} />
            <span>Reports</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield size={16} />
            <span>Compliance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Organization Dashboard</CardTitle>
              <CardDescription>
                Key performance indicators and organizational overview
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <Building className="h-16 w-16 text-primary/50 mb-4" />
              <h3 className="text-xl font-medium">Provider Organization Portal</h3>
              <p className="text-center text-muted-foreground max-w-md mb-4">
                Comprehensive tools for managing your healthcare organization, including staff, facilities, 
                compliance, and performance analytics.
              </p>
              <Button>Configure Organization Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff Management</CardTitle>
              <CardDescription>
                Manage providers, staff, and administrative personnel
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-16 w-16 text-primary/50 mb-4" />
              <h3 className="text-xl font-medium">Staff Directory</h3>
              <p className="text-center text-muted-foreground max-w-md mb-4">
                Tools for managing provider credentials, staff onboarding, privileges, and scheduling.
              </p>
              <Button>View Staff Directory</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="facilities">
          <Card>
            <CardHeader>
              <CardTitle>Facilities Management</CardTitle>
              <CardDescription>
                Manage locations, equipment, and resources
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="h-16 w-16 text-primary/50 mb-4" />
              <h3 className="text-xl font-medium">Facilities</h3>
              <p className="text-center text-muted-foreground max-w-md mb-4">
                Comprehensive facilities management for your organization's locations, 
                including equipment inventory and maintenance.
              </p>
              <Button>Configure Facilities</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle>Administrative Tools</CardTitle>
              <CardDescription>
                Access to administrative functions and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wrench className="h-16 w-16 text-primary/50 mb-4" />
              <h3 className="text-xl font-medium">Admin Dashboard</h3>
              <p className="text-center text-muted-foreground max-w-md mb-4">
                Administrative tools for managing organization-wide settings, user permissions, 
                and system configurations.
              </p>
              <Button>Access Admin Tools</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
              <CardDescription>
                Access performance and operational reports
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileSpreadsheet className="h-16 w-16 text-primary/50 mb-4" />
              <h3 className="text-xl font-medium">Reporting Dashboard</h3>
              <p className="text-center text-muted-foreground max-w-md mb-4">
                Comprehensive analytics and reporting tools for monitoring organization performance, 
                patient outcomes, and financial metrics.
              </p>
              <Button>Generate Reports</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance & Regulations</CardTitle>
              <CardDescription>
                Manage regulatory compliance and certifications
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-16 w-16 text-primary/50 mb-4" />
              <h3 className="text-xl font-medium">Compliance Dashboard</h3>
              <p className="text-center text-muted-foreground max-w-md mb-4">
                Tools for managing regulatory compliance, certifications, accreditations, 
                and organization-wide policies.
              </p>
              <Button>View Compliance Status</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PortalLayout>
  );
}