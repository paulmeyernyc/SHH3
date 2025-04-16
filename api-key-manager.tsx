import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Key, AlertCircle, Check, Copy, Clock, Trash2, Plus, RefreshCw } from "lucide-react";
import { Clipboard } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  status: "active" | "revoked";
  createdAt: string;
  lastUsed: string | null;
}

interface NewApiKey extends ApiKey {
  secret: string;
}

export function ApiKeyManager() {
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyDetails, setNewKeyDetails] = useState<NewApiKey | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch API keys
  const { data: apiKeys, isLoading, error } = useQuery({
    queryKey: ["/api/integration/api-keys"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/integration/api-keys");
      return response.json();
    }
  });
  
  // Create a new API key
  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/integration/api-keys", { name });
      return response.json();
    },
    onSuccess: (data: NewApiKey) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integration/api-keys"] });
      setNewKeyDetails(data);
      setNewKeyName("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create API key",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Revoke an API key
  const revokeKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/integration/api-keys/${id}`);
      return id;
    },
    onSuccess: (id: string) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integration/api-keys"] });
      toast({
        title: "API Key Revoked",
        description: "The API key has been successfully revoked.",
        variant: "default"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to revoke API key",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a name for your API key",
        variant: "destructive"
      });
      return;
    }
    
    createKeyMutation.mutate(newKeyName);
  };
  
  const handleCloseNewKeyDialog = () => {
    setNewKeyDetails(null);
    setIsCreateDialogOpen(false);
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
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading API Keys</AlertTitle>
        <AlertDescription>
          There was a problem loading your API keys. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">API Keys</CardTitle>
            <CardDescription>
              Manage your API keys for accessing Smart Health Hub services
            </CardDescription>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)} 
            className="bg-primary text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Key
          </Button>
        </CardHeader>
        
        <CardContent>
          {(!apiKeys || apiKeys.length === 0) ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No API Keys Found</h3>
              <p className="text-muted-foreground mb-4">
                You haven't created any API keys yet. Create your first key to get started.
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                variant="outline"
                className="text-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="rounded-lg border p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-lg">{key.name}</h3>
                        <Badge 
                          variant={key.status === "active" ? "outline" : "destructive"}
                          className="ml-2"
                        >
                          {key.status === "active" ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {key.status === "active" ? "Active" : "Revoked"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Clock className="h-3.5 w-3.5" />
                        Created {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                        {key.lastUsed && (
                          <>
                            <span className="mx-1">•</span>
                            <RefreshCw className="h-3.5 w-3.5" />
                            Last used {formatDistanceToNow(new Date(key.lastUsed), { addSuffix: true })}
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <code className="bg-secondary px-2 py-1 rounded text-sm font-mono">
                          {key.key.substring(0, 10)}...
                        </code>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(key.key, "API Key")}
                          className="h-8"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) {
                          revokeKeyMutation.mutate(key.id);
                        }
                      }}
                      disabled={key.status === "revoked" || revokeKeyMutation.isPending}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between flex-col sm:flex-row border-t pt-6">
          <p className="text-sm text-muted-foreground mb-4 sm:mb-0">
            <AlertCircle className="h-4 w-4 inline-block mr-1" />
            Keep your API keys secure. They provide access to services on your behalf.
          </p>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/integration/api-keys"] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardFooter>
      </Card>
      
      {/* Create Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Enter a name to identify this API key. The key will be used to authenticate API requests.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateKey}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">API Key Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Production Backend, Staging Environment"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createKeyMutation.isPending || !newKeyName.trim()}
              >
                {createKeyMutation.isPending ? "Creating..." : "Create Key"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* New Key Created Dialog */}
      {newKeyDetails && (
        <Dialog open={true} onOpenChange={handleCloseNewKeyDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>API Key Created Successfully</DialogTitle>
              <DialogDescription>
                Your new API key has been created. Please copy your key and secret now. The secret will never be shown again.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="rounded-md bg-secondary p-4">
                <div className="mb-4">
                  <Label htmlFor="apiKey" className="text-sm font-medium block mb-1">API Key</Label>
                  <div className="flex">
                    <code className="bg-background flex-1 px-3 py-2 rounded-l-md font-mono text-sm border overflow-x-auto">
                      {newKeyDetails.key}
                    </code>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-l-none"
                      onClick={() => copyToClipboard(newKeyDetails.key, "API Key")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="apiSecret" className="text-sm font-medium block mb-1">API Secret</Label>
                  <div className="flex">
                    <code className="bg-background flex-1 px-3 py-2 rounded-l-md font-mono text-sm border overflow-x-auto">
                      {newKeyDetails.secret}
                    </code>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-l-none"
                      onClick={() => copyToClipboard(newKeyDetails.secret, "API Secret")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  This is the only time the API Secret will be displayed. Please store it securely.
                </AlertDescription>
              </Alert>
            </div>
            
            <DialogFooter>
              <Button type="button" onClick={handleCloseNewKeyDialog}>
                I've Saved My API Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}