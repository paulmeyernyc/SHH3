import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, RefreshCw, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

// Define the PHR Data Source schema
const dataSourceSchema = z.object({
  sourceName: z.string().min(1, 'Source name is required'),
  sourceType: z.enum(['ehr', 'claims', 'pharmacy', 'lab', 'device', 'manual', 'imported']),
  sourceSystem: z.string().min(1, 'Source system is required'),
  apiEndpoint: z.string().optional(),
  connectionDetails: z.any().optional(),
});

// Define the PHR Record schema
const recordSchema = z.object({
  recordType: z.string().min(1, 'Record type is required'),
  category: z.string().min(1, 'Category is required'),
  effectiveDate: z.string().min(1, 'Date is required'),
  displayText: z.string().min(1, 'Description is required'),
  value: z.string().optional(),
  valueType: z.string().optional(),
  valueUnit: z.string().optional(),
});

type DataSource = z.infer<typeof dataSourceSchema>;
type Record = z.infer<typeof recordSchema>;

const PHRPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('health-records');
  const [isAddSourceDialogOpen, setIsAddSourceDialogOpen] = useState(false);
  const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Data sources query
  const {
    data: dataSources,
    isLoading: isLoadingSources,
    error: sourcesError,
  } = useQuery({
    queryKey: ['/api/sources'],
    queryFn: () => apiRequest('GET', '/api/sources').then(res => res.json()),
  });

  // Health records query
  const {
    data: healthRecords,
    isLoading: isLoadingRecords,
    error: recordsError,
  } = useQuery({
    queryKey: ['/api/records', selectedSource],
    queryFn: () => {
      const url = selectedSource 
        ? `/api/records?sourceId=${selectedSource}` 
        : '/api/records';
      return apiRequest('GET', url).then(res => res.json());
    },
  });

  // Add data source mutation
  const addSourceMutation = useMutation({
    mutationFn: async (data: DataSource) => {
      const res = await apiRequest('POST', '/api/sources', {
        ...data,
        patientId: user?.id.toString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
      setIsAddSourceDialogOpen(false);
      toast({
        title: 'Data source added',
        description: 'The data source has been added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add data source',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add health record mutation
  const addRecordMutation = useMutation({
    mutationFn: async (data: Record) => {
      const res = await apiRequest('POST', '/api/records', {
        ...data,
        patientId: user?.id.toString(),
        sourceId: selectedSource || 'manual',
        isPatientEntered: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/records'] });
      setIsAddRecordDialogOpen(false);
      toast({
        title: 'Health record added',
        description: 'The health record has been added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add health record',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create forms with react-hook-form and zod validation
  const sourceForm = useForm<DataSource>({
    resolver: zodResolver(dataSourceSchema),
    defaultValues: {
      sourceName: '',
      sourceType: 'manual',
      sourceSystem: '',
      apiEndpoint: '',
    },
  });

  const recordForm = useForm<Record>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      recordType: '',
      category: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      displayText: '',
      value: '',
      valueType: '',
      valueUnit: '',
    },
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to access your Personal Health Record</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Personal Health Record</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health-records">Health Records</TabsTrigger>
          <TabsTrigger value="data-sources">Data Sources</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="sharing">Consent & Sharing</TabsTrigger>
        </TabsList>
        
        {/* Health Records Tab */}
        <TabsContent value="health-records" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Health Records</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedSource(null)}>
                All Sources
              </Button>
              <Button 
                variant="default" 
                onClick={() => setIsAddRecordDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Record
              </Button>
            </div>
          </div>
          
          {isLoadingRecords ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : recordsError ? (
            <div className="p-6 text-center text-destructive">
              Error loading health records
            </div>
          ) : healthRecords?.length === 0 ? (
            <div className="p-6 text-center">
              <p>No health records found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {healthRecords?.map((record: any) => (
                <Card key={record.recordId} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{record.displayText}</CardTitle>
                      <Badge variant={record.recordStatus === 'active' ? 'default' : 'outline'}>
                        {record.recordStatus}
                      </Badge>
                    </div>
                    <CardDescription>
                      {new Date(record.effectiveDate).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Category:</span>
                        <span className="text-sm font-medium">{record.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Type:</span>
                        <span className="text-sm font-medium">{record.recordType}</span>
                      </div>
                      {record.value && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Value:</span>
                          <span className="text-sm font-medium">
                            {record.value} {record.valueUnit}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <div className="text-xs text-muted-foreground">
                      Source: {record.sourceId}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Data Sources Tab */}
        <TabsContent value="data-sources" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Data Sources</h2>
            <Button 
              variant="default" 
              onClick={() => setIsAddSourceDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Source
            </Button>
          </div>
          
          {isLoadingSources ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sourcesError ? (
            <div className="p-6 text-center text-destructive">
              Error loading data sources
            </div>
          ) : dataSources?.length === 0 ? (
            <div className="p-6 text-center">
              <p>No data sources found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataSources?.map((source: any) => (
                <Card key={source.sourceId} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{source.sourceName}</CardTitle>
                      <Badge 
                        variant={source.status === 'active' ? 'default' : 'destructive'}
                        className="capitalize"
                      >
                        {source.status}
                      </Badge>
                    </div>
                    <CardDescription className="capitalize">
                      {source.sourceType}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">System:</span>
                        <span className="text-sm font-medium">{source.sourceSystem}</span>
                      </div>
                      {source.lastSync && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Last Sync:</span>
                          <span className="text-sm font-medium">
                            {new Date(source.lastSync).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedSource(source.sourceId)}
                    >
                      View Records
                    </Button>
                    <Button variant="ghost" size="sm">
                      <RefreshCw className="h-4 w-4 mr-1" /> Sync
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <h2 className="text-2xl font-semibold">Health Timeline</h2>
          <div className="p-6 text-center">
            <p>Timeline view is under development</p>
          </div>
        </TabsContent>
        
        {/* Consent & Sharing Tab */}
        <TabsContent value="sharing" className="space-y-4">
          <h2 className="text-2xl font-semibold">Consent & Sharing</h2>
          <div className="p-6 text-center">
            <p>Consent management is under development</p>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Add Data Source Dialog */}
      <Dialog open={isAddSourceDialogOpen} onOpenChange={setIsAddSourceDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Data Source</DialogTitle>
            <DialogDescription>
              Add a new health data source to connect with your records
            </DialogDescription>
          </DialogHeader>
          <Form {...sourceForm}>
            <form onSubmit={sourceForm.handleSubmit(data => addSourceMutation.mutate(data))}>
              <div className="grid gap-4 py-4">
                <FormField
                  control={sourceForm.control}
                  name="sourceName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Health Provider" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sourceForm.control}
                  name="sourceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Type</FormLabel>
                      <Select
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ehr">Electronic Health Record</SelectItem>
                          <SelectItem value="claims">Insurance Claims</SelectItem>
                          <SelectItem value="pharmacy">Pharmacy</SelectItem>
                          <SelectItem value="lab">Laboratory</SelectItem>
                          <SelectItem value="device">Medical Device</SelectItem>
                          <SelectItem value="manual">Manual Entry</SelectItem>
                          <SelectItem value="imported">Imported Documents</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sourceForm.control}
                  name="sourceSystem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source System</FormLabel>
                      <FormControl>
                        <Input placeholder="Provider name or system ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sourceForm.control}
                  name="apiEndpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Endpoint (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://api.example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        API endpoint for automatic synchronization
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={addSourceMutation.isPending}
                >
                  {addSourceMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Source
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Add Health Record Dialog */}
      <Dialog open={isAddRecordDialogOpen} onOpenChange={setIsAddRecordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Health Record</DialogTitle>
            <DialogDescription>
              Add a new health record to your PHR
            </DialogDescription>
          </DialogHeader>
          <Form {...recordForm}>
            <form onSubmit={recordForm.handleSubmit(data => addRecordMutation.mutate(data))}>
              <div className="grid gap-4 py-4">
                <FormField
                  control={recordForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="vitals">Vital Signs</SelectItem>
                          <SelectItem value="labs">Lab Results</SelectItem>
                          <SelectItem value="medications">Medications</SelectItem>
                          <SelectItem value="conditions">Conditions</SelectItem>
                          <SelectItem value="procedures">Procedures</SelectItem>
                          <SelectItem value="allergies">Allergies</SelectItem>
                          <SelectItem value="immunizations">Immunizations</SelectItem>
                          <SelectItem value="notes">Notes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={recordForm.control}
                  name="recordType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Record Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Blood Pressure, A1C, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={recordForm.control}
                  name="effectiveDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={recordForm.control}
                  name="displayText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Description of the health record" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={recordForm.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 120/80, 7.2%, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={recordForm.control}
                    name="valueType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value Type (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Quantity" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={recordForm.control}
                    name="valueUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Units (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., mmHg, mg/dL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={addRecordMutation.isPending}
                >
                  {addRecordMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Record
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PHRPage;