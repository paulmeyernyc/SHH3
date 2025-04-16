import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, RefreshCw, ExternalLink, AlertCircle, CheckCircle, XCircle, Clock, ArrowRight, FileText, Lock, ShieldAlert, ShieldCheck, AlertTriangle, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

// Define schemas for consents
const consentSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  scope: z.string().min(1, 'Scope is required'),
  category: z.string().min(1, 'Category is required'),
  policyText: z.string().min(1, 'Policy text is required'),
  effectiveStart: z.string().min(1, 'Start date is required'),
  effectiveEnd: z.string().optional(),
  organization: z.string().optional(),
  templateReference: z.string().optional(),
});

const provisionSchema = z.object({
  type: z.enum(['permit', 'deny']),
  actorType: z.string().min(1, 'Actor type is required'),
  actorId: z.string().min(1, 'Actor ID is required'),
  actorDisplay: z.string().min(1, 'Actor display name is required'),
  purpose: z.array(z.string()).min(1, 'At least one purpose is required'),
  dataClasses: z.array(z.string()).min(1, 'At least one data class is required'),
  excludeClasses: z.array(z.string()).optional(),
});

const consentRequestResponseSchema = z.object({
  approved: z.boolean(),
  policyText: z.string().optional(),
});

type Consent = z.infer<typeof consentSchema>;
type Provision = z.infer<typeof provisionSchema>;
type ConsentRequestResponse = z.infer<typeof consentRequestResponseSchema>;

// Purpose of use options for consents
const purposeOptions = [
  { value: 'TREAT', label: 'Treatment' },
  { value: 'ETREAT', label: 'Emergency Treatment' },
  { value: 'HPAYMT', label: 'Healthcare Payment' },
  { value: 'HOPERAT', label: 'Healthcare Operations' },
  { value: 'PATRQT', label: 'Patient Request' },
  { value: 'PUBHLTH', label: 'Public Health' },
  { value: 'RESEARCH', label: 'Research' },
  { value: 'HMARKT', label: 'Healthcare Marketing' },
  { value: 'HRESCH', label: 'Healthcare Research' },
  { value: 'FAMRQT', label: 'Family Request' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'COVERAGE', label: 'Insurance Coverage' }
];

// Data class options
const dataClassOptions = [
  { value: 'Laboratory', label: 'Laboratory Results' },
  { value: 'Medication', label: 'Medications' },
  { value: 'Condition', label: 'Conditions/Problems' },
  { value: 'Allergy', label: 'Allergies' },
  { value: 'Procedure', label: 'Procedures' },
  { value: 'Immunization', label: 'Immunizations' },
  { value: 'Vital', label: 'Vital Signs' },
  { value: 'Observation', label: 'Observations' },
  { value: 'DocumentReference', label: 'Documents' },
  { value: 'DiagnosticReport', label: 'Diagnostic Reports' },
  { value: 'CarePlan', label: 'Care Plans' },
  { value: 'Encounter', label: 'Encounters/Visits' },
  { value: 'Genomic', label: 'Genomic Data' },
  { value: 'MentalHealth', label: 'Mental Health' },
  { value: 'SensitiveInformation', label: 'Sensitive Information' }
];

// Actor type options
const actorTypeOptions = [
  { value: 'Provider', label: 'Healthcare Provider' },
  { value: 'Organization', label: 'Healthcare Organization' },
  { value: 'Practitioner', label: 'Practitioner' },
  { value: 'Patient', label: 'Patient' },
  { value: 'RelatedPerson', label: 'Related Person' },
  { value: 'System', label: 'System' }
];

const ConsentPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('active-consents');
  const [isAddConsentDialogOpen, setIsAddConsentDialogOpen] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<string | null>(null);
  const [isViewConsentDialogOpen, setIsViewConsentDialogOpen] = useState(false);
  const [isRespondDialogOpen, setIsRespondDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // Get active consents
  const {
    data: consents,
    isLoading: isLoadingConsents,
    error: consentsError,
  } = useQuery({
    queryKey: ['/fhir/Consent'],
    queryFn: () => apiRequest('GET', `/fhir/Consent?patient=${user?.id}`).then(res => res.json()),
  });

  // Get consent by ID
  const {
    data: consentDetail,
    isLoading: isLoadingConsentDetail,
    error: consentDetailError,
    refetch: refetchConsentDetail
  } = useQuery({
    queryKey: ['/fhir/Consent', selectedConsent],
    queryFn: () => {
      if (!selectedConsent) return null;
      return apiRequest('GET', `/fhir/Consent/${selectedConsent}`).then(res => res.json());
    },
    enabled: !!selectedConsent
  });

  // Get consent templates
  const {
    data: templates,
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = useQuery({
    queryKey: ['/consent/templates'],
    queryFn: () => apiRequest('GET', '/consent/templates').then(res => res.json()),
  });

  // Get consent requests
  const {
    data: consentRequests,
    isLoading: isLoadingRequests,
    error: requestsError,
    refetch: refetchRequests
  } = useQuery({
    queryKey: ['/consent/requests'],
    queryFn: () => apiRequest('GET', `/consent/requests/${user?.id}`).then(res => res.json()),
  });

  // Get consent notifications
  const {
    data: notifications,
    isLoading: isLoadingNotifications,
    error: notificationsError,
    refetch: refetchNotifications
  } = useQuery({
    queryKey: ['/consent/notifications'],
    queryFn: () => apiRequest('GET', `/consent/notifications/${user?.id}`).then(res => res.json()),
  });

  // Get consent analytics
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ['/consent/analytics'],
    queryFn: () => apiRequest('GET', `/consent/analytics/patients/${user?.id}`).then(res => res.json()),
  });

  // Create consent mutation
  const createConsentMutation = useMutation({
    mutationFn: async (data: { consent: Consent, provisions: Provision[] }) => {
      // Convert to FHIR format
      const fhirConsent = {
        resourceType: 'Consent',
        status: 'active',
        scope: {
          coding: [
            {
              system: 'http://hl7.org/fhir/consentscope',
              code: data.consent.scope
            }
          ]
        },
        category: [
          {
            coding: [
              {
                system: 'http://loinc.org',
                code: data.consent.category,
                display: 'Consent for release of information'
              }
            ]
          }
        ],
        patient: {
          reference: `Patient/${data.consent.patientId}`
        },
        policyText: data.consent.policyText,
        provision: data.provisions.map(p => ({
          type: p.type,
          actor: [
            {
              role: {
                coding: [
                  {
                    code: 'recipient'
                  }
                ]
              },
              reference: {
                reference: `${p.actorType}/${p.actorId}`,
                display: p.actorDisplay
              }
            }
          ],
          purpose: p.purpose.map(code => ({
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason',
                code
              }
            ]
          })),
          class: p.dataClasses.map(c => ({
            code: c
          }))
        }))
      };

      const res = await apiRequest('POST', '/fhir/Consent', fhirConsent);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/fhir/Consent'] });
      setIsAddConsentDialogOpen(false);
      toast({
        title: 'Consent created',
        description: 'Your consent has been created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create consent',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Revoke consent mutation
  const revokeConsentMutation = useMutation({
    mutationFn: async (consentId: string) => {
      const res = await apiRequest('POST', `/consent/${consentId}/revoke`, {
        reason: 'User-initiated revocation'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/fhir/Consent'] });
      toast({
        title: 'Consent revoked',
        description: 'Your consent has been revoked successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to revoke consent',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Respond to consent request mutation
  const respondToRequestMutation = useMutation({
    mutationFn: async ({ requestId, response }: { requestId: string, response: ConsentRequestResponse }) => {
      const res = await apiRequest('POST', `/consent/requests/${requestId}/respond`, response);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/consent/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/fhir/Consent'] });
      setIsRespondDialogOpen(false);
      setSelectedRequest(null);
      toast({
        title: 'Response submitted',
        description: 'Your response to the consent request has been submitted',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to submit response',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Acknowledge notification mutation
  const acknowledgeNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiRequest('POST', `/consent/notifications/${notificationId}/acknowledge`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/consent/notifications'] });
      toast({
        title: 'Notification acknowledged',
        description: 'The notification has been acknowledged',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to acknowledge notification',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Form for creating a new consent
  const consentForm = useForm<Consent>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      patientId: user?.id.toString() || '',
      scope: 'patient-privacy',
      category: '64292-6',
      policyText: '',
      effectiveStart: new Date().toISOString().split('T')[0],
      effectiveEnd: '',
      organization: '',
      templateReference: '',
    },
  });

  // Form for creating a provision
  const provisionForm = useForm<Provision>({
    resolver: zodResolver(provisionSchema),
    defaultValues: {
      type: 'permit',
      actorType: '',
      actorId: '',
      actorDisplay: '',
      purpose: [],
      dataClasses: [],
      excludeClasses: [],
    },
  });

  // Form for responding to a consent request
  const responseForm = useForm<ConsentRequestResponse>({
    resolver: zodResolver(consentRequestResponseSchema),
    defaultValues: {
      approved: false,
      policyText: '',
    },
  });

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    if (!templates) return;
    
    const template = templates.find((t: any) => t.id === templateId);
    if (!template) return;
    
    // Set consent form values based on template
    consentForm.setValue('policyText', template.policyText || '');
    consentForm.setValue('templateReference', templateId);
    
    // Set provision form values based on template
    provisionForm.setValue('purpose', template.purpose || []);
    provisionForm.setValue('dataClasses', template.dataClasses || []);
  };

  // Handle consent request selection
  const handleRequestSelect = (request: any) => {
    setSelectedRequest(request);
    setIsRespondDialogOpen(true);
    
    // Reset form
    responseForm.reset({
      approved: false,
      policyText: `I consent to allow ${request.requesterName} to access my health information for ${request.purpose.toLowerCase()} purposes.`
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to access Consent Management</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Consent Management</h1>
      
      {/* Analytics Overview */}
      {!isLoadingAnalytics && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Active Consents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{analytics.activeConsentsCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Expiring Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{analytics.expiringConsentsCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{analytics.pendingRequestsCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent Decisions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{analytics.recentDecisions?.length || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active-consents">Active Consents</TabsTrigger>
          <TabsTrigger value="requests">Consent Requests</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="history">Access History</TabsTrigger>
        </TabsList>
        
        {/* Active Consents Tab */}
        <TabsContent value="active-consents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Active Consents</h2>
            <Button 
              variant="default" 
              onClick={() => setIsAddConsentDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Create Consent
            </Button>
          </div>
          
          {isLoadingConsents ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : consentsError ? (
            <div className="p-6 text-center text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Error loading consents</p>
            </div>
          ) : !consents || consents.length === 0 ? (
            <div className="p-6 text-center border rounded-lg">
              <p className="text-muted-foreground">No active consents found</p>
              <p className="text-sm text-muted-foreground mt-2">Create a consent to allow others to access your health information</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {consents.map((consent: any) => (
                <Card key={consent.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {consent.policyText ? 
                          (consent.policyText.length > 50 ? 
                            `${consent.policyText.substring(0, 50)}...` : 
                            consent.policyText) : 
                          'Consent'}
                      </CardTitle>
                      <Badge variant={consent.status === 'active' ? 'default' : 'outline'} className="capitalize">
                        {consent.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      Created: {consent.dateTime ? format(parseISO(consent.dateTime), 'PPP') : 'Unknown date'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-2">
                      {consent.provision && (
                        <>
                          {Array.isArray(consent.provision) ? (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {consent.provision.map((p: any, i: number) => (
                                <div key={i}>
                                  <Badge variant={p.type === 'permit' ? 'default' : 'destructive'} className="capitalize mr-1">
                                    {p.type || 'permit'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Badge variant={consent.provision.type === 'permit' ? 'default' : 'destructive'} className="capitalize">
                              {consent.provision.type || 'permit'}
                            </Badge>
                          )}
                        </>
                      )}
                      
                      {consent.provision && Array.isArray(consent.provision) && consent.provision[0]?.actor && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Recipient:</span>
                          <span className="text-sm font-medium">
                            {consent.provision[0].actor[0]?.reference?.display || 
                             consent.provision[0].actor[0]?.reference?.reference || 
                             'Not specified'}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedConsent(consent.id);
                        setIsViewConsentDialogOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => revokeConsentMutation.mutate(consent.id)}
                    >
                      Revoke
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Consent Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Consent Requests</h2>
            <Button 
              variant="outline" 
              onClick={() => refetchRequests()}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
          
          {isLoadingRequests ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : requestsError ? (
            <div className="p-6 text-center text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Error loading consent requests</p>
            </div>
          ) : !consentRequests || consentRequests.length === 0 ? (
            <div className="p-6 text-center border rounded-lg">
              <p className="text-muted-foreground">No pending consent requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {consentRequests.map((request: any) => (
                <Card key={request.requestId} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        Request from {request.requesterName || request.requesterId}
                      </CardTitle>
                      <Badge variant="outline" className="capitalize">
                        {request.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      For purpose: <span className="font-medium capitalize">{request.purpose.toLowerCase()}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-2">
                      <p className="text-sm">{request.requestMessage || 'No additional message provided'}</p>
                      
                      {request.resourceTypes && request.resourceTypes.length > 0 && (
                        <div>
                          <span className="text-sm text-muted-foreground">Requested data types:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {request.resourceTypes.map((type: string) => (
                              <Badge key={type} variant="outline" className="capitalize">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Expires:</span>
                        <span className="text-sm font-medium">
                          {format(parseISO(request.expiresAt), 'PPP')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 flex justify-end gap-2">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        respondToRequestMutation.mutate({
                          requestId: request.requestId,
                          response: { approved: false }
                        });
                      }}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Deny
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleRequestSelect(request)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" /> Approve
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Notifications</h2>
            <Button 
              variant="outline" 
              onClick={() => refetchNotifications()}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
          
          {isLoadingNotifications ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : notificationsError ? (
            <div className="p-6 text-center text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Error loading notifications</p>
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="p-6 text-center border rounded-lg">
              <p className="text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification: any) => {
                // Pick icon based on notification type
                let Icon = Info;
                let variant: 'default' | 'destructive' | 'outline' | 'secondary' = 'default';
                
                switch (notification.notificationType) {
                  case 'break-glass':
                    Icon = AlertTriangle;
                    variant = 'destructive';
                    break;
                  case 'expiration':
                    Icon = Clock;
                    variant = 'destructive';
                    break;
                  case 'near-expiration':
                    Icon = Clock;
                    variant = 'outline';
                    break;
                  case 'creation':
                    Icon = FileText;
                    variant = 'default';
                    break;
                  case 'update':
                    Icon = RefreshCw;
                    variant = 'default';
                    break;
                  case 'revocation':
                    Icon = Lock;
                    variant = 'destructive';
                    break;
                  case 'consent-request':
                    Icon = ShieldAlert;
                    variant = 'outline';
                    break;
                  default:
                    Icon = Info;
                }
                
                return (
                  <Card key={notification.id} className={`overflow-hidden ${notification.status === 'acknowledged' ? 'opacity-60' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-5 w-5 ${variant === 'destructive' ? 'text-destructive' : 'text-primary'}`} />
                          <CardTitle className="text-lg capitalize">
                            {notification.notificationType.replace('-', ' ')}
                          </CardTitle>
                        </div>
                        <Badge variant={notification.status === 'pending' ? 'outline' : 'secondary'} className="capitalize">
                          {notification.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        {notification.scheduledTime ? format(parseISO(notification.scheduledTime), 'PPP p') : 'Unknown date'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm">{notification.message}</p>
                    </CardContent>
                    {notification.status !== 'acknowledged' && (
                      <CardFooter className="pt-2 flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => acknowledgeNotificationMutation.mutate(notification.id)}
                        >
                          Mark as Read
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        {/* Access History Tab */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Access History</h2>
            <Button 
              variant="outline" 
              onClick={() => refetchAnalytics()}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
          
          {isLoadingAnalytics ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : analyticsError ? (
            <div className="p-6 text-center text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Error loading access history</p>
            </div>
          ) : !analytics || !analytics.recentDecisions || analytics.recentDecisions.length === 0 ? (
            <div className="p-6 text-center border rounded-lg">
              <p className="text-muted-foreground">No access history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.recentDecisions.map((decision: any) => (
                <Card key={decision.transactionId} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        Access by {decision.requesterType} {decision.requesterId}
                      </CardTitle>
                      <Badge 
                        variant={decision.decision === 'PERMIT' ? 'default' : 'destructive'}
                      >
                        {decision.decision}
                      </Badge>
                    </div>
                    <CardDescription>
                      {decision.accessTime ? format(parseISO(decision.accessTime), 'PPP p') : 'Unknown date'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Purpose:</span>
                        <span className="text-sm font-medium capitalize">
                          {decision.purpose.toLowerCase()}
                        </span>
                      </div>
                      
                      {decision.resourceType && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Resource Type:</span>
                          <span className="text-sm font-medium">
                            {decision.resourceType}
                          </span>
                        </div>
                      )}
                      
                      {decision.breakGlass && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-destructive/10 rounded-md">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium text-destructive">
                            Emergency break-glass access
                          </span>
                        </div>
                      )}
                      
                      {decision.breakGlassReason && (
                        <div className="p-2 bg-muted rounded-md mt-1">
                          <p className="text-sm">{decision.breakGlassReason}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Create Consent Dialog */}
      <Dialog open={isAddConsentDialogOpen} onOpenChange={setIsAddConsentDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Consent</DialogTitle>
            <DialogDescription>
              Create a consent to allow others to access your health information under specific conditions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Start from a template</h3>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingTemplates ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : templates?.map((template: any) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <Form {...consentForm}>
                <form className="space-y-4">
                  <FormField
                    control={consentForm.control}
                    name="policyText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consent Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Example: I consent to share my health information with Dr. Smith for treatment purposes." 
                            {...field} 
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={consentForm.control}
                      name="effectiveStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={consentForm.control}
                      name="effectiveEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
              
              <Separator className="my-4" />
              
              <h3 className="text-lg font-medium mb-2">Who can access your data?</h3>
              
              <Form {...provisionForm}>
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={provisionForm.control}
                      name="actorType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {actorTypeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={provisionForm.control}
                      name="actorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient ID</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., provider-123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={provisionForm.control}
                    name="actorDisplay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Dr. Jane Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={provisionForm.control}
                    name="purpose"
                    render={() => (
                      <FormItem>
                        <div className="mb-2">
                          <FormLabel>Purpose of Use</FormLabel>
                          <FormDescription>
                            Select the purposes for which this data can be accessed
                          </FormDescription>
                        </div>
                        {purposeOptions.map((option) => (
                          <FormField
                            key={option.value}
                            control={provisionForm.control}
                            name="purpose"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={option.value}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(option.value)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, option.value])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== option.value
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {option.label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={provisionForm.control}
                    name="dataClasses"
                    render={() => (
                      <FormItem>
                        <div className="mb-2">
                          <FormLabel>Data Categories</FormLabel>
                          <FormDescription>
                            Select the types of data that can be accessed
                          </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {dataClassOptions.map((option) => (
                            <FormField
                              key={option.value}
                              control={provisionForm.control}
                              name="dataClasses"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={option.value}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(option.value)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, option.value])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== option.value
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {option.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={provisionForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Permission Type
                          </FormLabel>
                          <FormDescription>
                            Allow or deny access to the selected data
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value === 'permit'}
                            onCheckedChange={(checked) =>
                              field.onChange(checked ? 'permit' : 'deny')
                            }
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddConsentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const consentData = consentForm.getValues();
                const provisionData = provisionForm.getValues();
                
                createConsentMutation.mutate({
                  consent: consentData,
                  provisions: [provisionData]
                });
              }}
              disabled={createConsentMutation.isPending}
            >
              {createConsentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Consent'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Consent Details Dialog */}
      <Dialog open={isViewConsentDialogOpen} onOpenChange={setIsViewConsentDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Consent Details</DialogTitle>
            <DialogDescription>
              Detailed information about this consent.
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingConsentDetail ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : consentDetailError ? (
            <div className="p-6 text-center text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Error loading consent details</p>
            </div>
          ) : consentDetail && (
            <div className="py-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                <Badge variant={consentDetail.status === 'active' ? 'default' : 'outline'} className="capitalize">
                  {consentDetail.status}
                </Badge>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p>{consentDetail.policyText || 'No description provided'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
                  <p>{consentDetail.dateTime ? format(parseISO(consentDetail.dateTime), 'PPP') : 'Unknown'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Valid Until</h3>
                  <p>{consentDetail.period?.end ? format(parseISO(consentDetail.period.end), 'PPP') : 'No end date'}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Provisions</h3>
                
                {Array.isArray(consentDetail.provision) ? (
                  <div className="space-y-4">
                    {consentDetail.provision.map((p: any, index: number) => (
                      <Card key={index}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <Badge variant={p.type === 'permit' ? 'default' : 'destructive'} className="capitalize">
                              {p.type || 'permit'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          {p.actor && p.actor.length > 0 && (
                            <div className="mb-2">
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">Recipient</h4>
                              <p>{p.actor[0]?.reference?.display || p.actor[0]?.reference?.reference || 'Not specified'}</p>
                            </div>
                          )}
                          
                          {p.purpose && p.purpose.length > 0 && (
                            <div className="mb-2">
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">Purpose</h4>
                              <div className="flex flex-wrap gap-1">
                                {p.purpose.map((purpose: any, i: number) => (
                                  <Badge key={i} variant="outline" className="capitalize">
                                    {purpose.coding?.[0]?.code?.toLowerCase() || 'unknown'}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {p.class && p.class.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">Data Categories</h4>
                              <div className="flex flex-wrap gap-1">
                                {p.class.map((dataClass: any, i: number) => (
                                  <Badge key={i} variant="outline">
                                    {dataClass.code}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : consentDetail.provision ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <Badge variant={consentDetail.provision.type === 'permit' ? 'default' : 'destructive'} className="capitalize">
                          {consentDetail.provision.type || 'permit'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      {/* Similar to above, but for a single provision */}
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-muted-foreground">No provisions specified</p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsViewConsentDialogOpen(false);
                setSelectedConsent(null);
              }}
            >
              Close
            </Button>
            {consentDetail && consentDetail.status === 'active' && (
              <Button 
                variant="destructive"
                onClick={() => {
                  revokeConsentMutation.mutate(consentDetail.id);
                  setIsViewConsentDialogOpen(false);
                }}
                disabled={revokeConsentMutation.isPending}
              >
                {revokeConsentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  'Revoke Consent'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Respond to Consent Request Dialog */}
      <Dialog open={isRespondDialogOpen} onOpenChange={setIsRespondDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Respond to Consent Request</DialogTitle>
            <DialogDescription>
              {selectedRequest && `${selectedRequest.requesterName} has requested access to your health information for ${selectedRequest.purpose.toLowerCase()} purposes.`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <Form {...responseForm}>
              <form className="space-y-4 py-4">
                <FormField
                  control={responseForm.control}
                  name="approved"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Approve Request
                        </FormLabel>
                        <FormDescription>
                          {field.value 
                            ? 'You are allowing access to your health information' 
                            : 'You are denying access to your health information'}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {responseForm.watch('approved') && (
                  <FormField
                    control={responseForm.control}
                    name="policyText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consent Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Please provide a description for this consent" 
                            {...field} 
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </form>
            </Form>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRespondDialogOpen(false);
                setSelectedRequest(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant={responseForm.watch('approved') ? 'default' : 'destructive'}
              onClick={() => {
                if (!selectedRequest) return;
                
                respondToRequestMutation.mutate({
                  requestId: selectedRequest.requestId,
                  response: responseForm.getValues()
                });
              }}
              disabled={respondToRequestMutation.isPending}
            >
              {respondToRequestMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : responseForm.watch('approved') ? (
                'Approve Request'
              ) : (
                'Deny Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsentPage;