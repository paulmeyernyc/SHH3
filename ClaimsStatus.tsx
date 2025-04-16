import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Claim } from "@shared/schema";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function ClaimsStatus() {
  const { data: claims, isLoading, error } = useQuery<Claim[]>({
    queryKey: ['/api/claims'],
  });

  if (isLoading) {
    return (
      <Card className="shadow">
        <CardHeader className="pb-4 border-b border-gray-200">
          <CardTitle className="text-lg font-medium text-gray-900">Claims Status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !claims) {
    return (
      <Card className="shadow">
        <CardHeader className="pb-4 border-b border-gray-200">
          <CardTitle className="text-lg font-medium text-gray-900">Claims Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading claims: {error?.message || "Unknown error"}</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'In Review':
        return 'bg-yellow-100 text-yellow-800';
      case 'Additional Info Needed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-500';
      case 'In Review':
        return 'bg-primary-500';
      case 'Additional Info Needed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="shadow">
      <CardHeader className="px-5 py-4 border-b border-gray-200">
        <CardTitle className="text-lg font-medium text-gray-900">Claims Status</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {claims.map((claim) => (
            <div key={claim.id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{claim.claimId}</h4>
                  <p className="text-xs text-gray-500 mt-1">Patient: {claim.patientName}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusClass(claim.status)}`}>
                  {claim.status}
                </span>
              </div>
              <div className="mt-4">
                <div className="relative">
                  <Progress 
                    value={claim.progress} 
                    className="h-2 bg-gray-200" 
                    indicatorClassName={getProgressColor(claim.status)}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Submitted</span>
                    <span>In Review</span>
                    <span>Processed</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-gray-500">
                <p><span className="font-medium">Date:</span> <span>{claim.date}</span></p>
                <p><span className="font-medium">Amount:</span> <span>{claim.amount}</span></p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="px-4 pt-0">
        <Button variant="link" className="text-primary-600 hover:text-primary-700 p-0 h-auto font-medium" size="sm">
          View all claims
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
