import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminUpgrade() {
  const { toast } = useToast();
  const [isPromoting, setIsPromoting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  // Function to promote current user to admin
  const promoteToAdmin = async () => {
    setIsPromoting(true);
    try {
      const response = await fetch('/api/promote-to-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to promote user to admin');
      }
      
      toast({
        title: "Success",
        description: data.message || "Successfully promoted to admin role"
      });
      
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to promote to admin",
        variant: "destructive"
      });
    } finally {
      setIsPromoting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Admin Role Upgrade</CardTitle>
          <CardDescription>
            Promote your account to get admin privileges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This tool will promote your current user account to have admin role privileges.
            This is required to access the user management functionality.
          </p>
          
          <Button 
            onClick={promoteToAdmin}
            disabled={isPromoting}
            className="w-full"
          >
            {isPromoting ? "Promoting..." : "Promote to Admin Role"}
          </Button>
          
          {result && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <h3 className="text-sm font-medium mb-2">Result:</h3>
              <pre className="text-xs overflow-auto p-2 bg-card border rounded">
                {result}
              </pre>
              <p className="text-xs mt-2 text-muted-foreground">
                You may need to refresh your browser to see the changes.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => window.location.href = "/portals/admin"}
              >
                Go to Admin Portal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}