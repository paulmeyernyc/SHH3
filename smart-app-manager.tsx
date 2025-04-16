import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Clock, Eye, Info, Pencil, Plus, RefreshCw, Rocket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SMARTApp {
  id: string;
  name: string;
  clientId: string;
  redirectUris: string[];
  launchUrl: string;
  scopes: string[];
  description: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}

interface SMARTAppWithSecret extends SMARTApp {
  clientSecret: string;
}

export function SmartAppManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<SMARTApp | null>(null);
  const [newAppDetails, setNewAppDetails] = useState<SMARTAppWithSecret | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    launchUrl: "",
    redirectUris: "",
    scopes: "launch patient/*.read"
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch SMART apps
  const { data: smartApps, isLoading, error } = useQuery({
    queryKey: ["/api/integration/smart-apps"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/integration/smart-apps");
      return response.json();
    }
  });
  
  // Create a new SMART app
  const createAppMutation = useMutation({
    mutationFn: async (appData: {
      name: string;
      description: string;
      launchUrl: string;
      redirectUris: string[];
      scopes: string[];
    }) => {
      const response = await apiRequest("POST", "/api/integration/smart-apps", appData);
      return response.json();
    },
    onSuccess: (data: SMARTAppWithSecret) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integration/smart-apps"] });
      setNewAppDetails(data);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to register SMART app",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Update a SMART app
  const updateAppMutation = useMutation({
    mutationFn: async ({ id, appData }: { 
      id: string;
      appData: {
        name: string;
        description: string;
        launchUrl: string;
        redirectUris: string[];
        scopes: string[];
      }
    }) => {
      const response = await apiRequest("PUT", `/api/integration/smart-apps/${id}`, appData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integration/smart-apps"] });
      toast({
        title: "SMART App Updated",
        description: "Your application has been successfully updated.",
        variant: "default"
      });
      setIsDetailsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update SMART app",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      launchUrl: "",
      redirectUris: "",
      scopes: "launch patient/*.read"
    });
    setIsCreateDialogOpen(false);
  };
  
  const handleCreateApp = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.launchUrl || !formData.redirectUris) {
      toast({
        title: "Validation Error",
        description: "Please fill out all required fields",
        variant: "destructive"
      });
      return;
    }
    
    const redirectUris = formData.redirectUris.split("\n").map(uri => uri.trim()).filter(Boolean);
    const scopes = formData.scopes.split(" ").map(scope => scope.trim()).filter(Boolean);
    
    createAppMutation.mutate({
      name: formData.name,
      description: formData.description,
      launchUrl: formData.launchUrl,
      redirectUris,
      scopes
    });
  };
  
  const handleViewAppDetails = (app: SMARTApp) => {
    setSelectedApp(app);
    setIsDetailsDialogOpen(true);
  };
  
  const handleCloseNewAppDialog = () => {
    setNewAppDetails(null);
  };
  
  const getStatusBadge = (status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="default" className="bg-red-500">Rejected</Badge>;
      case "pending":
      default:
        return <Badge variant="default" className="bg-amber-500">Pending Review</Badge>;
    }
  };
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: `${label} has been copied to your clipboard.`,
        variant: "default"
      });
    });
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading SMART Apps</AlertTitle>
        <AlertDescription>
          There was a problem loading your SMART applications. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">SMART on FHIR Applications</CardTitle>
            <CardDescription>
              Register and manage your SMART applications for seamless EHR integration
            </CardDescription>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)} 
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Register New App
          </Button>
        </CardHeader>
        
        <CardContent>
          {(!smartApps || smartApps.length === 0) ? (
            <div className="text-center py-8">
              <Rocket className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No SMART Applications Registered</h3>
              <p className="text-muted-foreground mb-4">
                You haven't registered any SMART on FHIR applications yet. Register your first app to enable EHR integration.
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Register Your First App
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {smartApps.map((app) => (
                <div key={app.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-lg">{app.name}</h3>
                        {getStatusBadge(app.status)}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        Registered {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                        <span className="mx-1">•</span>
                        Updated {formatDistanceToNow(new Date(app.updatedAt), { addSuffix: true })}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewAppDetails(app)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                  
                  <p className="text-sm mb-3 line-clamp-2">
                    {app.description || "No description provided."}
                  </p>
                  
                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex-1 min-w-[200px]">
                      <span className="block text-xs font-medium text-muted-foreground mb-1">Launch URL</span>
                      <code className="bg-secondary px-2 py-1 rounded text-xs">{app.launchUrl}</code>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <span className="block text-xs font-medium text-muted-foreground mb-1">Client ID</span>
                      <code className="bg-secondary px-2 py-1 rounded text-xs">
                        {app.clientId.substring(0, 16)}...
                      </code>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <span className="block text-xs font-medium text-muted-foreground mb-1">Scopes</span>
                      <div className="flex flex-wrap gap-1 max-w-[400px]">
                        {app.scopes.slice(0, 3).map((scope, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                        {app.scopes.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{app.scopes.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between flex-col sm:flex-row border-t pt-6">
          <p className="text-sm text-muted-foreground mb-4 sm:mb-0">
            <Info className="h-4 w-4 inline-block mr-1" />
            After registration, apps go through a brief review before being approved.
          </p>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/integration/smart-apps"] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardFooter>
      </Card>
      
      {/* Register App Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register SMART on FHIR Application</DialogTitle>
            <DialogDescription>
              Register your application to enable SMART on FHIR integration with EHR systems.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateApp}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">App Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="MyHealthApp"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">App Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="A brief description of your application and its purpose"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="launchUrl">Launch URL *</Label>
                <Input
                  id="launchUrl"
                  name="launchUrl"
                  placeholder="https://example.com/launch"
                  value={formData.launchUrl}
                  onChange={handleInputChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The URL that will be loaded when your app is launched from an EHR.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="redirectUris">Redirect URIs *</Label>
                <Textarea
                  id="redirectUris"
                  name="redirectUris"
                  placeholder="https://example.com/redirect&#10;https://example.com/callback"
                  value={formData.redirectUris}
                  onChange={handleInputChange}
                  required
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  List of allowed redirect URIs, one per line. These are the URLs that the OAuth flow can redirect to after authorization.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scopes">OAuth Scopes *</Label>
                <Input
                  id="scopes"
                  name="scopes"
                  placeholder="launch patient/*.read"
                  value={formData.scopes}
                  onChange={handleInputChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Space-separated list of SMART scopes your app requires.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAppMutation.isPending || !formData.name || !formData.launchUrl || !formData.redirectUris}
              >
                {createAppMutation.isPending ? "Registering..." : "Register App"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* App Details Dialog */}
      {selectedApp && (
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{selectedApp.name}</span>
                {getStatusBadge(selectedApp.status)}
              </DialogTitle>
              <DialogDescription>
                Detailed information about your SMART on FHIR application
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">App Description</Label>
                <p className="text-sm">
                  {selectedApp.description || "No description provided."}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Client ID</Label>
                <div className="flex">
                  <code className="bg-secondary flex-1 px-3 py-2 rounded-l-md font-mono text-sm overflow-x-auto">
                    {selectedApp.clientId}
                  </code>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-l-none"
                    onClick={() => copyToClipboard(selectedApp.clientId, "Client ID")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Launch URL</Label>
                <div className="flex">
                  <code className="bg-secondary flex-1 px-3 py-2 rounded-l-md font-mono text-sm overflow-x-auto">
                    {selectedApp.launchUrl}
                  </code>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-l-none"
                    onClick={() => copyToClipboard(selectedApp.launchUrl, "Launch URL")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Redirect URIs</Label>
                <div className="bg-secondary rounded-md px-3 py-2">
                  <ul className="space-y-1">
                    {selectedApp.redirectUris.map((uri, i) => (
                      <li key={i} className="font-mono text-sm">
                        {uri}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">OAuth Scopes</Label>
                <div className="flex flex-wrap gap-1">
                  {selectedApp.scopes.map((scope, i) => (
                    <Badge key={i} variant="secondary">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>SMART App Launch Configuration</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">Configure your application with these details to enable SMART on FHIR integration.</p>
                  <p className="text-sm font-medium mt-2">Authorization Endpoint:</p>
                  <code className="text-xs block mt-1 bg-secondary p-1 rounded">
                    {window.location.origin}/api/integration/auth
                  </code>
                  <p className="text-sm font-medium mt-2">Token Endpoint:</p>
                  <code className="text-xs block mt-1 bg-secondary p-1 rounded">
                    {window.location.origin}/api/integration/token
                  </code>
                </AlertDescription>
              </Alert>
            </div>
            
            <DialogFooter>
              <Button type="button" onClick={() => setIsDetailsDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* New App Registered Dialog */}
      {newAppDetails && (
        <Dialog open={true} onOpenChange={handleCloseNewAppDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>SMART App Registered Successfully</DialogTitle>
              <DialogDescription>
                Your application has been registered. Please copy your client credentials now. The client secret will never be shown again.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="rounded-md bg-secondary p-4">
                <div className="mb-4">
                  <Label htmlFor="clientId" className="text-sm font-medium block mb-1">Client ID</Label>
                  <div className="flex">
                    <code className="bg-background flex-1 px-3 py-2 rounded-l-md font-mono text-sm border overflow-x-auto">
                      {newAppDetails.clientId}
                    </code>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-l-none"
                      onClick={() => copyToClipboard(newAppDetails.clientId, "Client ID")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="clientSecret" className="text-sm font-medium block mb-1">Client Secret</Label>
                  <div className="flex">
                    <code className="bg-background flex-1 px-3 py-2 rounded-l-md font-mono text-sm border overflow-x-auto">
                      {newAppDetails.clientSecret}
                    </code>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-l-none"
                      onClick={() => copyToClipboard(newAppDetails.clientSecret, "Client Secret")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  This is the only time the Client Secret will be displayed. Please store it securely.
                </AlertDescription>
              </Alert>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Next Steps</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Configure your application with these credentials</li>
                  <li>Set your redirect URIs to match the ones you registered</li>
                  <li>Use the SMART on FHIR authorization flow to connect to EHRs</li>
                  <li>Your app is pending approval. You'll be notified when approved.</li>
                </ol>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" onClick={handleCloseNewAppDialog}>
                I've Saved My Credentials
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}