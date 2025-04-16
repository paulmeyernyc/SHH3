import { useState } from "react";
import { PortalLayout } from "@/components/portal/portal-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FilePlus2, CalendarClock, MessageSquare, ClipboardList, Activity, FileText, HeartPulse, BadgePlus, Clock, MapPin } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";

export default function PatientPortalPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("records");

  // Dummy data for UI demonstration
  const upcomingAppointments = [
    {
      id: 1,
      provider: "Dr. James Wilson",
      specialty: "Cardiology",
      date: "Apr 22, 2025",
      time: "10:30 AM",
      location: "Cardiac Care Center",
      status: "Confirmed"
    },
    {
      id: 2,
      provider: "Dr. Emily Chen",
      specialty: "Primary Care",
      date: "May 05, 2025",
      time: "2:15 PM",
      location: "Community Health Clinic",
      status: "Scheduled"
    }
  ];

  const recentDocuments = [
    {
      id: 1,
      title: "Cardiology Consultation Notes",
      provider: "Dr. James Wilson",
      date: "Mar 15, 2025",
      type: "Clinical Notes"
    },
    {
      id: 2,
      title: "Lab Results - Complete Blood Count",
      provider: "LabCorp",
      date: "Mar 12, 2025",
      type: "Lab Report"
    },
    {
      id: 3,
      title: "Prescription - Lisinopril 10mg",
      provider: "Dr. Emily Chen",
      date: "Feb 28, 2025",
      type: "Prescription"
    }
  ];

  return (
    <PortalLayout
      title="Patient Portal"
      portalType="Patient"
      subtitle="Access your health records, appointments, and communicate with providers"
    >
      <Tabs
        defaultValue="records"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-5 w-full max-w-4xl mb-8">
          <TabsTrigger value="records" className="flex items-center gap-2">
            <FileText size={16} />
            <span>Health Records</span>
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <CalendarClock size={16} />
            <span>Appointments</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare size={16} />
            <span>Messages</span>
          </TabsTrigger>
          <TabsTrigger value="medications" className="flex items-center gap-2">
            <HeartPulse size={16} />
            <span>Medications</span>
          </TabsTrigger>
          <TabsTrigger value="claims" className="flex items-center gap-2">
            <ClipboardList size={16} />
            <span>Claims</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Recent Health Documents</CardTitle>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <FilePlus2 size={14} />
                      Upload
                    </Button>
                  </div>
                  <CardDescription>
                    Access your recent medical documents and reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-start p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="p-2 bg-primary/10 rounded-md mr-3">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground">{doc.provider} • {doc.date}</p>
                          <span className="text-xs bg-secondary px-2 py-0.5 rounded-full mt-1 inline-block">
                            {doc.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-2 flex justify-center">
                  <Button variant="link">View All Documents</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Health Summary</CardTitle>
                  <CardDescription>
                    Overview of your key health information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border border-border rounded-lg">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Allergies</h3>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span>Penicillin</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span>Shellfish</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="p-4 border border-border rounded-lg">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Conditions</h3>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            <span>Hypertension</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            <span>Type 2 Diabetes</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Vitals (Last Recorded)</h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Blood Pressure</span>
                          <div className="text-lg font-medium">138/85</div>
                          <span className="text-xs text-muted-foreground">Mar 15, 2025</span>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Heart Rate</span>
                          <div className="text-lg font-medium">72 bpm</div>
                          <span className="text-xs text-muted-foreground">Mar 15, 2025</span>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Weight</span>
                          <div className="text-lg font-medium">185 lbs</div>
                          <span className="text-xs text-muted-foreground">Mar 15, 2025</span>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">BMI</span>
                          <div className="text-lg font-medium">27.2</div>
                          <span className="text-xs text-muted-foreground">Mar 15, 2025</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Upcoming Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingAppointments.map((appt) => (
                      <div key={appt.id} className="p-3 border border-border rounded-lg">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">{appt.provider}</h4>
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                            {appt.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{appt.specialty}</p>
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{appt.date}, {appt.time}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{appt.location}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="outline" className="w-full">Schedule Appointment</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Health Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Blood Glucose</span>
                        <span className="text-sm font-medium">128 mg/dL</span>
                      </div>
                      <Progress value={65} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Target: 70-120</span>
                        <span>Last updated: 2 days ago</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Medication Adherence</span>
                        <span className="text-sm font-medium">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Goal: 100%</span>
                        <span>This month</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Physical Activity</span>
                        <span className="text-sm font-medium">75%</span>
                      </div>
                      <Progress value={75} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Goal: 150 min/week</span>
                        <span>This week</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button variant="link" className="w-full">View Health Dashboard</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="appointments">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Appointments</CardTitle>
                <Button size="sm" className="flex items-center gap-1">
                  <BadgePlus size={14} />
                  Schedule New
                </Button>
              </div>
              <CardDescription>
                Manage your scheduled appointments and visit history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Tabs defaultValue="upcoming">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upcoming">
                    <div className="space-y-4">
                      {upcomingAppointments.map((appt) => (
                        <div key={appt.id} className="flex items-start justify-between p-4 border border-border rounded-lg">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary/10 rounded-md">
                              <CalendarClock className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium">{appt.provider}</h4>
                              <p className="text-sm text-muted-foreground">{appt.specialty}</p>
                              <div className="mt-2 flex items-center gap-2 text-sm">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{appt.date}, {appt.time}</span>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-sm">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{appt.location}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                              {appt.status}
                            </span>
                            <div className="flex gap-2 mt-4">
                              <Button variant="outline" size="sm">Reschedule</Button>
                              <Button variant="outline" size="sm" className="text-destructive border-destructive">Cancel</Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="pending">
                    <div className="text-center py-12 text-muted-foreground">
                      No pending appointment requests
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="past">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-muted rounded-md">
                            <CalendarClock className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-medium">Dr. Emily Chen</h4>
                            <p className="text-sm text-muted-foreground">Primary Care</p>
                            <div className="mt-2 flex items-center gap-2 text-sm">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Feb 28, 2025, 9:00 AM</span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-sm">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Community Health Clinic</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                            Completed
                          </span>
                          <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm">View Summary</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Messages & Secure Communications</CardTitle>
              <CardDescription>
                Communicate securely with your healthcare providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4 text-muted-foreground/70" />
                <h3 className="text-lg font-medium mb-2">No Messages</h3>
                <p className="text-center mb-6">You don't have any messages in your inbox</p>
                <Button>Start New Conversation</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="medications">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Current Medications</CardTitle>
                <Button variant="outline" size="sm">Request Refill</Button>
              </div>
              <CardDescription>
                Manage your medication list and prescription history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-medium">Lisinopril 10mg</h4>
                      <p className="text-sm text-muted-foreground">Take 1 tablet by mouth daily</p>
                    </div>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full h-fit">
                      Active
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">Prescriber</span>
                      <span>Dr. James Wilson</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Pharmacy</span>
                      <span>HealthRx Pharmacy</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Refills</span>
                      <span>2 remaining</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-medium">Metformin 500mg</h4>
                      <p className="text-sm text-muted-foreground">Take 1 tablet by mouth twice daily with meals</p>
                    </div>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full h-fit">
                      Active
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">Prescriber</span>
                      <span>Dr. Emily Chen</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Pharmacy</span>
                      <span>HealthRx Pharmacy</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Refills</span>
                      <span>3 remaining</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-medium">Atorvastatin 20mg</h4>
                      <p className="text-sm text-muted-foreground">Take 1 tablet by mouth at bedtime</p>
                    </div>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full h-fit">
                      Active
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">Prescriber</span>
                      <span>Dr. James Wilson</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Pharmacy</span>
                      <span>HealthRx Pharmacy</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Refills</span>
                      <span>1 remaining</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="link" className="w-full">View Medication History</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle>Claims & Billing</CardTitle>
              <CardDescription>
                View your healthcare claims and billing information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 border border-border rounded-lg space-y-4">
                  <div className="flex justify-between">
                    <h3 className="font-medium">Recent Claims</h3>
                    <Button variant="link" size="sm" className="p-0">View All</Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-muted/40 rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium">Cardiology Consultation</h4>
                          <p className="text-sm text-muted-foreground">Dr. James Wilson</p>
                        </div>
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full h-fit">
                          Processing
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground block">Date of Service</span>
                          <span>Mar 15, 2025</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Claim #</span>
                          <span>CL25030012</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Amount</span>
                          <span>$175.00</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-muted/40 rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium">Laboratory Services</h4>
                          <p className="text-sm text-muted-foreground">LabCorp</p>
                        </div>
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full h-fit">
                          Paid
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground block">Date of Service</span>
                          <span>Mar 12, 2025</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Claim #</span>
                          <span>CL25029876</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Amount</span>
                          <span>$85.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border border-border rounded-lg space-y-4">
                  <h3 className="font-medium">Billing Summary</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Claims Submitted (YTD)</span>
                      <span className="font-medium">12</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span>Total Charges</span>
                      <span className="font-medium">$1,835.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Insurance Paid</span>
                      <span className="font-medium">$1,354.75</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Patient Responsibility</span>
                      <span className="font-medium">$480.25</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span>Outstanding Balance</span>
                      <span className="font-medium">$175.00</span>
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