import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Briefcase, Users, Calendar, FileCheck, ClipboardList, PieChart, Building2, BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function EmployerPortalPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Sample data for demo purposes
  const employerData = {
    name: "Acme Healthcare Solutions",
    employees: 782,
    enrollmentProgress: 89,
    upcomingEvents: [
      { id: 1, title: "Open Enrollment", date: "May 15 - June 15, 2025", type: "enrollment" },
      { id: 2, title: "Wellness Challenge", date: "July 1 - July 30, 2025", type: "wellness" },
      { id: 3, title: "Benefits Information Session", date: "April 22, 2025", type: "webinar" }
    ],
    employeeGroups: [
      { id: 1, name: "Executive Leadership", members: 12, planType: "Premium" },
      { id: 2, name: "Technology", members: 156, planType: "Standard" },
      { id: 3, name: "Operations", members: 237, planType: "Standard" },
      { id: 4, name: "Customer Service", members: 310, planType: "Basic" },
      { id: 5, name: "Administrative", members: 67, planType: "Standard" }
    ],
    healthPrograms: [
      { id: 1, name: "Annual Biometric Screening", participation: 68, status: "active" },
      { id: 2, name: "Mental Health Support", participation: 42, status: "active" },
      { id: 3, name: "Smoking Cessation", participation: 15, status: "active" },
      { id: 4, name: "Diabetes Management", participation: 23, status: "active" },
      { id: 5, name: "Weight Management", participation: 31, status: "planning" }
    ],
    benefits: [
      { id: 1, name: "Health Insurance", enrollmentRate: 95, type: "medical" },
      { id: 2, name: "Dental Coverage", enrollmentRate: 88, type: "dental" },
      { id: 3, name: "Vision Coverage", enrollmentRate: 72, type: "vision" },
      { id: 4, name: "401(k) Retirement", enrollmentRate: 79, type: "retirement" },
      { id: 5, name: "Life Insurance", enrollmentRate: 65, type: "insurance" }
    ]
  };

  const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string, color: string }) => (
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
      </CardContent>
    </Card>
  );
  
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">{employerData.name}</h1>
            <p className="text-muted-foreground mt-1">Employer Portal Dashboard</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button variant="outline" size="sm">
              <ClipboardList className="h-4 w-4 mr-2" />
              Reports
            </Button>
            <Button size="sm">
              <FileCheck className="h-4 w-4 mr-2" />
              Manage Benefits
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="plans">Benefit Plans</TabsTrigger>
            <TabsTrigger value="programs">Health Programs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                icon={<Users className="h-5 w-5" />} 
                title="Total Employees" 
                value={employerData.employees.toString()} 
                color="bg-blue-500/20 text-blue-500" 
              />
              <StatCard 
                icon={<FileCheck className="h-5 w-5" />} 
                title="Enrollment Progress" 
                value={`${employerData.enrollmentProgress}%`} 
                color="bg-green-500/20 text-green-500" 
              />
              <StatCard 
                icon={<Building2 className="h-5 w-5" />} 
                title="Employee Groups" 
                value={employerData.employeeGroups.length.toString()} 
                color="bg-purple-500/20 text-purple-500" 
              />
              <StatCard 
                icon={<BadgePercent className="h-5 w-5" />} 
                title="Active Programs" 
                value={employerData.healthPrograms.filter(p => p.status === "active").length.toString()} 
                color="bg-amber-500/20 text-amber-500" 
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {employerData.upcomingEvents.map(event => (
                      <div key={event.id} className="flex items-start gap-4 pb-4 last:pb-0 last:border-0 border-b border-border">
                        <div className={`p-2 rounded-md ${
                          event.type === "enrollment" ? "bg-blue-500/20 text-blue-500" :
                          event.type === "wellness" ? "bg-green-500/20 text-green-500" : 
                          "bg-purple-500/20 text-purple-500"
                        }`}>
                          {event.type === "enrollment" ? <Calendar className="h-5 w-5" /> :
                           event.type === "wellness" ? <Users className="h-5 w-5" /> : 
                           <ClipboardList className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="font-medium">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">{event.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Benefit Enrollment Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {employerData.benefits.map(benefit => (
                      <div key={benefit.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{benefit.name}</span>
                          <span className="font-medium">{benefit.enrollmentRate}%</span>
                        </div>
                        <Progress value={benefit.enrollmentRate} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Employee Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-4 border-b p-3 bg-muted/50">
                    <div className="font-medium">Group Name</div>
                    <div className="font-medium">Members</div>
                    <div className="font-medium">Plan Type</div>
                    <div className="font-medium text-right">Actions</div>
                  </div>
                  {employerData.employeeGroups.map(group => (
                    <div key={group.id} className="grid grid-cols-4 p-3 border-b last:border-0 items-center">
                      <div>{group.name}</div>
                      <div>{group.members}</div>
                      <div>{group.planType}</div>
                      <div className="text-right">
                        <Button variant="outline" size="sm">Manage</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="plans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Benefit Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-4 border-b p-3 bg-muted/50">
                    <div className="font-medium">Plan Name</div>
                    <div className="font-medium">Type</div>
                    <div className="font-medium">Enrollment</div>
                    <div className="font-medium text-right">Actions</div>
                  </div>
                  {employerData.benefits.map(benefit => (
                    <div key={benefit.id} className="grid grid-cols-4 p-3 border-b last:border-0 items-center">
                      <div>{benefit.name}</div>
                      <div className="capitalize">{benefit.type}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Progress value={benefit.enrollmentRate} className="h-2" />
                          <span className="text-sm font-medium">{benefit.enrollmentRate}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Button variant="outline" size="sm">Details</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="programs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Health Programs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-4 border-b p-3 bg-muted/50">
                    <div className="font-medium">Program</div>
                    <div className="font-medium">Status</div>
                    <div className="font-medium">Participation</div>
                    <div className="font-medium text-right">Actions</div>
                  </div>
                  {employerData.healthPrograms.map(program => (
                    <div key={program.id} className="grid grid-cols-4 p-3 border-b last:border-0 items-center">
                      <div>{program.name}</div>
                      <div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          program.status === "active" ? "bg-green-500/20 text-green-500" : "bg-amber-500/20 text-amber-500"
                        }`}>
                          {program.status === "active" ? "Active" : "Planning"}
                        </span>
                      </div>
                      <div>{program.participation}%</div>
                      <div className="text-right">
                        <Button variant="outline" size="sm">Manage</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}