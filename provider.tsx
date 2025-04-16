import { useState } from "react";
import { PortalLayout } from "@/components/portal/portal-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Users, CalendarClock, FileText, ClipboardList, Activity,
  Stethoscope, BadgePlus, Clock, Search, MessageSquare, 
  ShieldCheck, Columns, FileUp, Filter
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

// For demo purposes
import { MapPin } from "lucide-react";

export default function ProviderPortalPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("prior-auth");

  // Dummy data for UI demonstration
  const upcomingAppointments = [
    {
      id: 1,
      patient: "John Doe",
      reason: "Follow-up: Hypertension",
      date: "Apr 15, 2025",
      time: "9:30 AM",
      status: "Confirmed"
    },
    {
      id: 2,
      patient: "Emma Johnson",
      reason: "Annual Physical",
      date: "Apr 15, 2025",
      time: "10:45 AM",
      status: "Confirmed"
    },
    {
      id: 3,
      patient: "Michael Smith",
      reason: "Lab Results Review",
      date: "Apr 15, 2025",
      time: "1:15 PM",
      status: "Confirmed"
    },
    {
      id: 4,
      patient: "Sarah Wilson",
      reason: "New Patient Consultation",
      date: "Apr 15, 2025",
      time: "2:30 PM",
      status: "Confirmed"
    }
  ];

  const recentPatients = [
    {
      id: 1,
      name: "John Doe",
      dob: "05/12/1972",
      lastVisit: "Mar 22, 2025",
      reason: "Follow-up: Hypertension"
    },
    {
      id: 2,
      name: "Emma Johnson",
      dob: "11/28/1985",
      lastVisit: "Mar 18, 2025",
      reason: "Medication Review"
    },
    {
      id: 3,
      name: "Michael Smith",
      dob: "07/04/1968",
      lastVisit: "Mar 15, 2025",
      reason: "Lab Results Review"
    }
  ];

  const pendingTasks = [
    {
      id: 1,
      type: "Documentation",
      description: "Complete clinical notes for Sarah Wilson",
      due: "Today",
      priority: "High"
    },
    {
      id: 2,
      type: "Review",
      description: "Review lab results for Michael Smith",
      due: "Today",
      priority: "Medium"
    },
    {
      id: 3,
      type: "Authorization",
      description: "Sign prior authorization for John Doe",
      due: "Tomorrow",
      priority: "Medium"
    },
    {
      id: 4,
      type: "Refill",
      description: "Approve prescription refill for Emma Johnson",
      due: "Tomorrow",
      priority: "Low"
    }
  ];

  return (
    <PortalLayout
      title="Provider Portal"
      portalType="Provider"
      subtitle="Manage patient care, appointments, and access clinical tools"
    >
      <Tabs
        defaultValue="patients"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-5 w-full max-w-4xl mb-8">
          <TabsTrigger value="prior-auth" className="flex items-center gap-2">
            <ShieldCheck size={16} />
            <span>Prior Authorizations</span>
          </TabsTrigger>
          <TabsTrigger value="claims" className="flex items-center gap-2">
            <FileText size={16} />
            <span>Claims</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <Activity size={16} />
            <span>Billing</span>
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center gap-2">
            <Users size={16} />
            <span>Patients</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <CalendarClock size={16} />
            <span>Schedule</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prior-auth">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Prior Authorizations</CardTitle>
                    <Button>
                      <BadgePlus className="h-4 w-4 mr-2" />
                      New Authorization
                    </Button>
                  </div>
                  <CardDescription>
                    Manage and track prior authorization requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="text" 
                          placeholder="Search authorizations..." 
                          className="pl-9"
                        />
                      </div>
                      <Button variant="outline">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                      </Button>
                      <Button>Search</Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium">Recent Prior Authorizations</h3>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Pending</Button>
                          <Button variant="outline" size="sm">Approved</Button>
                          <Button variant="outline" size="sm">All</Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">Imaging: MRI Lumbar Spine</h4>
                              <div className="flex gap-4 mt-1">
                                <p className="text-sm text-muted-foreground">Patient: John Doe</p>
                                <p className="text-sm text-muted-foreground">ID: PA-100052</p>
                              </div>
                            </div>
                            <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full h-fit">
                              Pending
                            </span>
                          </div>
                          <div className="mt-2 text-sm grid grid-cols-2">
                            <p><span className="text-muted-foreground">Submitted:</span> Apr 14, 2025</p>
                            <p><span className="text-muted-foreground">Payer:</span> Blue Cross</p>
                            <p><span className="text-muted-foreground">Service Date:</span> Apr 22, 2025</p>
                            <p><span className="text-muted-foreground">Method:</span> Hub-run Path</p>
                          </div>
                        </div>
                        
                        <div className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">Procedure: Physical Therapy - 12 sessions</h4>
                              <div className="flex gap-4 mt-1">
                                <p className="text-sm text-muted-foreground">Patient: Emma Johnson</p>
                                <p className="text-sm text-muted-foreground">ID: PA-100045</p>
                              </div>
                            </div>
                            <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full h-fit">
                              Approved
                            </span>
                          </div>
                          <div className="mt-2 text-sm grid grid-cols-2">
                            <p><span className="text-muted-foreground">Submitted:</span> Apr 10, 2025</p>
                            <p><span className="text-muted-foreground">Payer:</span> United Health</p>
                            <p><span className="text-muted-foreground">Service Date:</span> Apr 17, 2025</p>
                            <p><span className="text-muted-foreground">Method:</span> Goldcarded</p>
                          </div>
                        </div>
                        
                        <div className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">Medication: Humira 40mg/0.4ml</h4>
                              <div className="flex gap-4 mt-1">
                                <p className="text-sm text-muted-foreground">Patient: Michael Smith</p>
                                <p className="text-sm text-muted-foreground">ID: PA-100038</p>
                              </div>
                            </div>
                            <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full h-fit">
                              Denied
                            </span>
                          </div>
                          <div className="mt-2 text-sm grid grid-cols-2">
                            <p><span className="text-muted-foreground">Submitted:</span> Apr 8, 2025</p>
                            <p><span className="text-muted-foreground">Payer:</span> Aetna</p>
                            <p><span className="text-muted-foreground">Service Date:</span> Apr 15, 2025</p>
                            <p><span className="text-muted-foreground">Method:</span> Pass-through Path</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 flex justify-center">
                  <Button variant="link">View All Prior Authorizations</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Goldcarding Status</CardTitle>
                  <CardDescription>
                    Services eligible for automated prior authorization approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 border border-border rounded-lg bg-primary/5">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldCheck className="h-5 w-5 text-green-500" />
                          <h3 className="font-medium">Physical Therapy</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">All payers</p>
                        <p className="text-xs text-muted-foreground">Approval rate: 98%</p>
                      </div>
                      
                      <div className="p-4 border border-border rounded-lg bg-primary/5">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldCheck className="h-5 w-5 text-green-500" />
                          <h3 className="font-medium">X-Ray Imaging</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">Blue Cross, Aetna</p>
                        <p className="text-xs text-muted-foreground">Approval rate: 100%</p>
                      </div>
                      
                      <div className="p-4 border border-border rounded-lg bg-primary/5">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldCheck className="h-5 w-5 text-green-500" />
                          <h3 className="font-medium">Routine Labs</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">All payers</p>
                        <p className="text-xs text-muted-foreground">Approval rate: 99%</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Goldcarding Eligibility</h3>
                        <p className="text-sm text-muted-foreground">Your practice qualifies for expedited authorizations</p>
                      </div>
                      <Button variant="outline">View Details</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>Authorization Tasks</CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                      <BadgePlus size={14} />
                      New
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">Complete clinical documentation for MRI request</h4>
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                          High
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>Patient: John Doe</span>
                        <span>Due: Today</span>
                      </div>
                    </div>
                    
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">Submit additional information for medication PA</h4>
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                          Medium
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>Patient: Michael Smith</span>
                        <span>Due: Tomorrow</span>
                      </div>
                    </div>
                    
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">Review appeal documentation for denied therapy</h4>
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                          Medium
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>Patient: Sarah Wilson</span>
                        <span>Due: Apr 18</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="link" className="w-full">View All Tasks</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Authorization Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Overall Approval Rate</span>
                        <span className="text-sm font-medium">89%</span>
                      </div>
                      <Progress value={89} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Industry Avg: 76%</span>
                        <span>Last 90 days</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Average Processing Time</span>
                        <span className="text-sm font-medium">2.4 days</span>
                      </div>
                      <Progress value={68} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Target: 2 days</span>
                        <span>Last 30 days</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Real-time Approval Rate</span>
                        <span className="text-sm font-medium">62%</span>
                      </div>
                      <Progress value={62} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Target: 75%</span>
                        <span>Last 30 days</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Upcoming Expirations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Emma Johnson - Physical Therapy</h4>
                        <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full h-fit">
                          7 days
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Expires: Apr 22, 2025</p>
                    </div>
                    
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Robert Lee - Medication</h4>
                        <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full h-fit">
                          3 days
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Expires: Apr 18, 2025</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="link" className="w-full">View All Expirations</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="claims">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Claims Management</CardTitle>
                    <Button>
                      <BadgePlus className="h-4 w-4 mr-2" />
                      New Claim
                    </Button>
                  </div>
                  <CardDescription>
                    Track and manage claim submissions and status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="text" 
                          placeholder="Search claims..." 
                          className="pl-9"
                        />
                      </div>
                      <Button variant="outline">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                      </Button>
                      <Button>Search</Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium">Recent Claims</h3>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Pending</Button>
                          <Button variant="outline" size="sm">Paid</Button>
                          <Button variant="outline" size="sm">All</Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">Office Visit - Level 3</h4>
                              <div className="flex gap-4 mt-1">
                                <p className="text-sm text-muted-foreground">Patient: John Doe</p>
                                <p className="text-sm text-muted-foreground">Claim #: 2025-11245</p>
                              </div>
                            </div>
                            <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full h-fit">
                              Pending
                            </span>
                          </div>
                          <div className="mt-2 text-sm grid grid-cols-2">
                            <p><span className="text-muted-foreground">Date of Service:</span> Apr 10, 2025</p>
                            <p><span className="text-muted-foreground">Payer:</span> Blue Cross</p>
                            <p><span className="text-muted-foreground">Billed Amount:</span> $225.00</p>
                            <p><span className="text-muted-foreground">Submitted:</span> Apr 11, 2025</p>
                          </div>
                        </div>
                        
                        <div className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">Physical Therapy - Initial Evaluation</h4>
                              <div className="flex gap-4 mt-1">
                                <p className="text-sm text-muted-foreground">Patient: Emma Johnson</p>
                                <p className="text-sm text-muted-foreground">Claim #: 2025-11242</p>
                              </div>
                            </div>
                            <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full h-fit">
                              Paid
                            </span>
                          </div>
                          <div className="mt-2 text-sm grid grid-cols-2">
                            <p><span className="text-muted-foreground">Date of Service:</span> Apr 8, 2025</p>
                            <p><span className="text-muted-foreground">Payer:</span> United Health</p>
                            <p><span className="text-muted-foreground">Billed Amount:</span> $175.00</p>
                            <p><span className="text-muted-foreground">Paid Amount:</span> $140.00</p>
                          </div>
                        </div>
                        
                        <div className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">Lab Tests - Comprehensive Metabolic Panel</h4>
                              <div className="flex gap-4 mt-1">
                                <p className="text-sm text-muted-foreground">Patient: Michael Smith</p>
                                <p className="text-sm text-muted-foreground">Claim #: 2025-11238</p>
                              </div>
                            </div>
                            <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full h-fit">
                              Denied
                            </span>
                          </div>
                          <div className="mt-2 text-sm grid grid-cols-2">
                            <p><span className="text-muted-foreground">Date of Service:</span> Apr 5, 2025</p>
                            <p><span className="text-muted-foreground">Payer:</span> Aetna</p>
                            <p><span className="text-muted-foreground">Billed Amount:</span> $95.00</p>
                            <p><span className="text-muted-foreground">Reason:</span> No Auth</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 flex justify-center">
                  <Button variant="link">View All Claims</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Claim Tools</CardTitle>
                  <CardDescription>
                    Utilities to improve claim submission and management
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-3">
                      <FileText className="h-6 w-6" />
                      <span>Eligibility Check</span>
                    </Button>
                    
                    <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-3">
                      <Columns className="h-6 w-6" />
                      <span>Batch Claims</span>
                    </Button>
                    
                    <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-3">
                      <Activity className="h-6 w-6" />
                      <span>Claim Analytics</span>
                    </Button>
                    
                    <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-3">
                      <FileUp className="h-6 w-6" />
                      <span>AI Coding Review</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Claims Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Clean Claim Rate</span>
                        <span className="text-sm font-medium">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Target: 95%</span>
                        <span>Last 30 days</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">First Pass Resolution</span>
                        <span className="text-sm font-medium">87%</span>
                      </div>
                      <Progress value={87} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Target: 90%</span>
                        <span>Last 30 days</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Average Days to Payment</span>
                        <span className="text-sm font-medium">16.3 days</span>
                      </div>
                      <Progress value={73} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Target: 14 days</span>
                        <span>Last 90 days</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>Claim Issues</CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                      <BadgePlus size={14} />
                      New
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">Missing modifier on procedure code</h4>
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                          High
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>Claim #: 2025-11238</span>
                        <span>Due: Today</span>
                      </div>
                    </div>
                    
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">Coverage verification needed</h4>
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                          Medium
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>Patient: Sarah Wilson</span>
                        <span>Due: Tomorrow</span>
                      </div>
                    </div>
                    
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">Payer requesting additional documentation</h4>
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                          Medium
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>Claim #: 2025-11242</span>
                        <span>Due: Apr 18</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="link" className="w-full">View All Issues</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Upcoming Claim Deadlines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Appeal Deadline</h4>
                        <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full h-fit">
                          5 days
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Claim #: 2025-11238</p>
                      <p className="text-sm text-muted-foreground">Deadline: Apr 20, 2025</p>
                    </div>
                    
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Timely Filing</h4>
                        <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full h-fit">
                          15 days
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Services: Mar 30, 2025</p>
                      <p className="text-sm text-muted-foreground">Deadline: Apr 30, 2025</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="link" className="w-full">View All Deadlines</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="billing">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Billing Dashboard</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                      <Button>
                        <BadgePlus className="h-4 w-4 mr-2" />
                        Create Invoice
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Manage patient billing and financial activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 border border-border rounded-lg bg-primary/5">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Receivables</h3>
                        <p className="text-2xl font-semibold mt-1">$127,845.00</p>
                        <div className="flex items-center mt-2 text-xs text-green-500">
                          <span>↑ 5.2% from last month</span>
                        </div>
                      </div>
                      
                      <div className="p-4 border border-border rounded-lg bg-primary/5">
                        <h3 className="text-sm font-medium text-muted-foreground">Collected (MTD)</h3>
                        <p className="text-2xl font-semibold mt-1">$42,180.00</p>
                        <div className="flex items-center mt-2 text-xs text-green-500">
                          <span>↑ 3.7% from last month</span>
                        </div>
                      </div>
                      
                      <div className="p-4 border border-border rounded-lg bg-primary/5">
                        <h3 className="text-sm font-medium text-muted-foreground">Aging (&gt;90 Days)</h3>
                        <p className="text-2xl font-semibold mt-1">$18,432.00</p>
                        <div className="flex items-center mt-2 text-xs text-red-500">
                          <span>↑ 1.8% from last month</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium">Recent Transactions</h3>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Payments</Button>
                          <Button variant="outline" size="sm">Adjustments</Button>
                          <Button variant="outline" size="sm">All</Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">Insurance Payment</h4>
                              <div className="flex gap-4 mt-1">
                                <p className="text-sm text-muted-foreground">Patient: John Doe</p>
                                <p className="text-sm text-muted-foreground">Claim #: 2025-11242</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-green-500">+$140.00</p>
                              <p className="text-xs text-muted-foreground">Apr 14, 2025</p>
                            </div>
                          </div>
                          <div className="mt-2 text-sm">
                            <p><span className="text-muted-foreground">Payer:</span> Blue Cross</p>
                            <p><span className="text-muted-foreground">Method:</span> ERA / EFT</p>
                          </div>
                        </div>
                        
                        <div className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">Patient Payment</h4>
                              <div className="flex gap-4 mt-1">
                                <p className="text-sm text-muted-foreground">Patient: Emma Johnson</p>
                                <p className="text-sm text-muted-foreground">Invoice #: INV-4582</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-green-500">+$35.00</p>
                              <p className="text-xs text-muted-foreground">Apr 13, 2025</p>
                            </div>
                          </div>
                          <div className="mt-2 text-sm">
                            <p><span className="text-muted-foreground">Service:</span> Office Visit Co-pay</p>
                            <p><span className="text-muted-foreground">Method:</span> Credit Card</p>
                          </div>
                        </div>
                        
                        <div className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">Contractual Adjustment</h4>
                              <div className="flex gap-4 mt-1">
                                <p className="text-sm text-muted-foreground">Patient: Michael Smith</p>
                                <p className="text-sm text-muted-foreground">Claim #: 2025-11238</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-orange-500">-$45.00</p>
                              <p className="text-xs text-muted-foreground">Apr 12, 2025</p>
                            </div>
                          </div>
                          <div className="mt-2 text-sm">
                            <p><span className="text-muted-foreground">Payer:</span> Aetna</p>
                            <p><span className="text-muted-foreground">Reason:</span> Per Contract</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 flex justify-center">
                  <Button variant="link">View All Transactions</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Patient Financial Tools</CardTitle>
                  <CardDescription>
                    Tools to improve patient collections and financial processes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-3">
                      <FileText className="h-6 w-6" />
                      <span>Patient Statements</span>
                    </Button>
                    
                    <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-3">
                      <Activity className="h-6 w-6" />
                      <span>Payment Plans</span>
                    </Button>
                    
                    <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-3">
                      <MessageSquare className="h-6 w-6" />
                      <span>Billing Messages</span>
                    </Button>
                    
                    <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-3">
                      <FileUp className="h-6 w-6" />
                      <span>Cost Estimates</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Financial Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Collection Rate</span>
                        <span className="text-sm font-medium">94%</span>
                      </div>
                      <Progress value={94} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Target: 96%</span>
                        <span>Last 90 days</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Days in A/R</span>
                        <span className="text-sm font-medium">24 days</span>
                      </div>
                      <Progress value={83} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Target: 21 days</span>
                        <span>Last 30 days</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Patient Collections</span>
                        <span className="text-sm font-medium">78%</span>
                      </div>
                      <Progress value={78} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Target: 85%</span>
                        <span>Last 90 days</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>Billing Tasks</CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                      <BadgePlus size={14} />
                      New
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">Resolve ERA rejection</h4>
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                          High
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>Payer: Blue Cross</span>
                        <span>Due: Today</span>
                      </div>
                    </div>
                    
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">Follow up on unpaid claims</h4>
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                          Medium
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>Claims: 12</span>
                        <span>Due: Tomorrow</span>
                      </div>
                    </div>
                    
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">Review patient payment plan requests</h4>
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                          Low
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>Requests: 3</span>
                        <span>Due: Apr 18</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="link" className="w-full">View All Tasks</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Payer Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Blue Cross</h4>
                        <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full h-fit">
                          Good
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Avg. Days to Pay:</span>
                          <span>18.5</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Approval Rate:</span>
                          <span>92%</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">United Health</h4>
                        <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full h-fit">
                          Good
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Avg. Days to Pay:</span>
                          <span>15.2</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Approval Rate:</span>
                          <span>94%</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Aetna</h4>
                        <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full h-fit">
                          Fair
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Avg. Days to Pay:</span>
                          <span>24.7</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Approval Rate:</span>
                          <span>88%</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="link" className="w-full">View All Payers</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="patients">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Patient Search</CardTitle>
                  </div>
                  <CardDescription>
                    Search for patients by name, DOB, or patient ID
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="text" 
                          placeholder="Search patients..." 
                          className="pl-9"
                        />
                      </div>
                      <Button variant="outline">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                      </Button>
                      <Button>Search</Button>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Recent Patients</h3>
                      
                      {recentPatients.map((patient) => (
                        <div key={patient.id} className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">{patient.name}</h4>
                              <div className="flex gap-4 mt-1">
                                <p className="text-sm text-muted-foreground">DOB: {patient.dob}</p>
                                <p className="text-sm text-muted-foreground">ID: PT-{100000 + patient.id}</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">View Chart</Button>
                          </div>
                          <div className="mt-2 text-sm">
                            <p><span className="text-muted-foreground">Last Visit:</span> {patient.lastVisit}</p>
                            <p><span className="text-muted-foreground">Reason:</span> {patient.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 flex justify-center">
                  <Button variant="link">View All Patients</Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Today's Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingAppointments.slice(0, 3).map((appt) => (
                      <div key={appt.id} className="p-3 border border-border rounded-lg">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">{appt.patient}</h4>
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                            {appt.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{appt.reason}</p>
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{appt.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="link" className="w-full">View Full Schedule</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="schedule">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Your Schedule</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Clock className="h-4 w-4 mr-2" />
                    My Availability
                  </Button>
                  <Button size="sm" className="flex items-center gap-1">
                    <BadgePlus size={14} />
                    New Appointment
                  </Button>
                </div>
              </div>
              <CardDescription>
                Manage your appointments and schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex gap-4 border-b border-border pb-4 overflow-auto">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
                    <div key={day} className={`min-w-[100px] p-3 text-center rounded-lg cursor-pointer ${
                      i === 2 ? 'bg-primary text-primary-foreground' : 'border border-border hover:border-primary/20'
                    }`}>
                      <div className="font-medium">{day}</div>
                      <div className="text-sm">{`Apr ${15 + i}`}</div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">April 17, 2025</h3>
                  
                  <div className="space-y-3">
                    {upcomingAppointments.map((appt) => (
                      <div key={appt.id} className="flex items-start justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-primary/10 rounded-md">
                            <CalendarClock className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{appt.patient}</h4>
                            <p className="text-sm text-muted-foreground">{appt.reason}</p>
                            <div className="mt-2 flex items-center gap-2 text-sm">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{appt.time}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                            {appt.status}
                          </span>
                          <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm">Start Visit</Button>
                            <Button variant="outline" size="sm">View Chart</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Documentation & Records</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button size="sm" className="flex items-center gap-1">
                    <FileText className="h-4 w-4 mr-2" />
                    New Document
                  </Button>
                </div>
              </div>
              <CardDescription>
                Manage clinical documentation and patient records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Tabs defaultValue="my-documents">
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="my-documents">My Documents</TabsTrigger>
                    <TabsTrigger value="pending">Pending Review</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                    <TabsTrigger value="shared">Shared With Me</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="my-documents">
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="text" 
                          placeholder="Search documents..." 
                          className="pl-9 mb-4"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div className="p-4 border border-border rounded-lg">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">Clinical Note - John Doe</h4>
                              <p className="text-sm text-muted-foreground">Follow-up: Hypertension</p>
                            </div>
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full h-fit">
                              Complete
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-muted-foreground">Apr 1, 2025</span>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="xs" className="h-6 px-2">View</Button>
                              <Button variant="ghost" size="xs" className="h-6 px-2">Edit</Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 border border-border rounded-lg">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">Medication Review - Emma Johnson</h4>
                              <p className="text-sm text-muted-foreground">Diabetes Management</p>
                            </div>
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full h-fit">
                              Complete
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-muted-foreground">Mar 28, 2025</span>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="xs" className="h-6 px-2">View</Button>
                              <Button variant="ghost" size="xs" className="h-6 px-2">Edit</Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 border border-border rounded-lg">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">Lab Results Review - Michael Smith</h4>
                              <p className="text-sm text-muted-foreground">Annual Bloodwork</p>
                            </div>
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full h-fit">
                              Draft
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-muted-foreground">Mar 25, 2025</span>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="xs" className="h-6 px-2">View</Button>
                              <Button variant="ghost" size="xs" className="h-6 px-2">Edit</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="pending">
                    <div className="text-center py-12 text-muted-foreground">
                      No documents pending your review
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="templates">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border border-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Progress Note</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">Standard template for patient visit progress notes</p>
                        </CardContent>
                        <CardFooter className="border-t border-border pt-2">
                          <Button variant="link" size="sm" className="w-full">Use Template</Button>
                        </CardFooter>
                      </Card>
                      
                      <Card className="border border-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Consultation</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">Template for specialist consultation reports</p>
                        </CardContent>
                        <CardFooter className="border-t border-border pt-2">
                          <Button variant="link" size="sm" className="w-full">Use Template</Button>
                        </CardFooter>
                      </Card>
                      
                      <Card className="border border-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Procedure Note</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">Detailed template for procedure documentation</p>
                        </CardContent>
                        <CardFooter className="border-t border-border pt-2">
                          <Button variant="link" size="sm" className="w-full">Use Template</Button>
                        </CardFooter>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="shared">
                    <div className="text-center py-12 text-muted-foreground">
                      No documents have been shared with you
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Task Management</CardTitle>
                <Button size="sm" className="flex items-center gap-1">
                  <BadgePlus size={14} />
                  New Task
                </Button>
              </div>
              <CardDescription>
                Manage your clinical and administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Tabs defaultValue="pending">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="pending">Pending ({pendingTasks.length})</TabsTrigger>
                    <TabsTrigger value="delegated">Delegated</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="pending">
                    <div className="space-y-4">
                      <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="text" 
                            placeholder="Search tasks..." 
                            className="pl-9"
                          />
                        </div>
                        <Button variant="outline">
                          <Filter className="h-4 w-4 mr-2" />
                          Filter
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {pendingTasks.map((task) => (
                          <div key={task.id} className="p-4 border border-border rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{task.description}</h4>
                                <p className="text-sm text-muted-foreground">Type: {task.type}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                task.priority === "High" ? "bg-red-500/20 text-red-400" :
                                task.priority === "Medium" ? "bg-orange-500/20 text-orange-400" :
                                "bg-green-500/20 text-green-400"
                              }`}>
                                {task.priority}
                              </span>
                            </div>
                            <div className="mt-3 flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Due: {task.due}</span>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">Delegate</Button>
                                <Button size="sm">Complete</Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="delegated">
                    <div className="text-center py-12 text-muted-foreground">
                      You have no delegated tasks
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="completed">
                    <div className="space-y-3">
                      <div className="p-4 border border-border rounded-lg bg-muted/30">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">Complete vaccination record update for Sarah Wilson</h4>
                            <p className="text-sm text-muted-foreground">Type: Documentation</p>
                          </div>
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                            Completed
                          </span>
                        </div>
                        <div className="mt-3 flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Completed: Apr 14, 2025</span>
                        </div>
                      </div>
                      
                      <div className="p-4 border border-border rounded-lg bg-muted/30">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">Review and sign discharge papers for David Brown</h4>
                            <p className="text-sm text-muted-foreground">Type: Documentation</p>
                          </div>
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                            Completed
                          </span>
                        </div>
                        <div className="mt-3 flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Completed: Apr 13, 2025</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="clinical">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Clinical Resources</CardTitle>
              </div>
              <CardDescription>
                Access clinical decision support tools and references
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Medication Reference</CardTitle>
                        <Stethoscope className="h-4 w-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Comprehensive medication database with dosing, contraindications, and interactions</p>
                    </CardContent>
                    <CardFooter className="border-t border-border pt-3">
                      <Button variant="link" size="sm" className="w-full">Open</Button>
                    </CardFooter>
                  </Card>
                  
                  <Card className="border border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Practice Guidelines</CardTitle>
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Evidence-based clinical practice guidelines for various conditions</p>
                    </CardContent>
                    <CardFooter className="border-t border-border pt-3">
                      <Button variant="link" size="sm" className="w-full">Open</Button>
                    </CardFooter>
                  </Card>
                  
                  <Card className="border border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Calculators</CardTitle>
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Medical calculators for risk assessment, dosing, and clinical scores</p>
                    </CardContent>
                    <CardFooter className="border-t border-border pt-3">
                      <Button variant="link" size="sm" className="w-full">Open</Button>
                    </CardFooter>
                  </Card>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Recent Clinical Alerts</h3>
                  
                  <div className="space-y-3">
                    <div className="p-4 border border-border rounded-lg">
                      <h4 className="font-medium">Medication Interaction Alert</h4>
                      <p className="text-sm text-muted-foreground mt-1">Potential interaction detected between Lisinopril and Spironolactone for patient Emma Johnson</p>
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm">Review</Button>
                      </div>
                    </div>
                    
                    <div className="p-4 border border-border rounded-lg">
                      <h4 className="font-medium">Lab Result Alert</h4>
                      <p className="text-sm text-muted-foreground mt-1">Abnormal potassium level (5.8 mEq/L) for patient Michael Smith</p>
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm">Review</Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Continuing Education</h3>
                  
                  <div className="space-y-3">
                    <div className="p-4 border border-border rounded-lg">
                      <h4 className="font-medium">New Guidelines for Hypertension Management</h4>
                      <p className="text-sm text-muted-foreground mt-1">1.5 CME credits • Updated Apr 2025</p>
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm">Start Module</Button>
                      </div>
                    </div>
                    
                    <div className="p-4 border border-border rounded-lg">
                      <h4 className="font-medium">Advances in Diabetes Care</h4>
                      <p className="text-sm text-muted-foreground mt-1">2.0 CME credits • Updated Mar 2025</p>
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm">Start Module</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PortalLayout>
  );
}