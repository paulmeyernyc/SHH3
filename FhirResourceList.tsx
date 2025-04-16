import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { FhirResource } from "@shared/schema";
import { Loader2, ArrowRight, FileText, User, Activity, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import ResourceViewer from "./ResourceViewer";

export default function FhirResourceList() {
  const [selectedResource, setSelectedResource] = useState<FhirResource | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  
  const { data: resources, isLoading, error } = useQuery<FhirResource[]>({
    queryKey: ['/api/fhir'],
  });

  const handleViewResource = (resource: FhirResource) => {
    setSelectedResource(resource);
    setIsViewerOpen(true);
  };

  const resourceIcons: Record<string, React.ReactNode> = {
    'Patient': <User className="h-5 w-5" />,
    'Practitioner': <User className="h-5 w-5" />,
    'Observation': <Activity className="h-5 w-5" />,
    'MedicationRequest': <Pill className="h-5 w-5" />,
    'default': <FileText className="h-5 w-5" />
  };

  const resourceColors: Record<string, string> = {
    'Patient': 'bg-primary-50 text-primary-500',
    'Practitioner': 'bg-secondary-50 text-secondary-500',
    'Observation': 'bg-indigo-50 text-indigo-500',
    'MedicationRequest': 'bg-amber-50 text-amber-500',
    'default': 'bg-gray-50 text-gray-500'
  };

  if (isLoading) {
    return (
      <Card className="shadow">
        <CardHeader className="pb-4 border-b border-gray-200">
          <CardTitle className="text-lg font-medium text-gray-900">Recent FHIR Resources</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !resources) {
    return (
      <Card className="shadow">
        <CardHeader className="pb-4 border-b border-gray-200">
          <CardTitle className="text-lg font-medium text-gray-900">Recent FHIR Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading FHIR resources: {error?.message || "Unknown error"}</p>
        </CardContent>
      </Card>
    );
  }

  // Format time relative to now (e.g., 10m ago, 1h ago)
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffMinutes / 1440)}d ago`;
    }
  };

  return (
    <>
      <Card className="shadow">
        <CardHeader className="px-5 py-4 border-b border-gray-200">
          <CardTitle className="text-lg font-medium text-gray-900">Recent FHIR Resources</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <ul className="divide-y divide-gray-200">
            {resources.slice(0, 4).map((resource) => (
              <li key={resource.id} className="py-3 px-2 hover:bg-gray-50 rounded-md cursor-pointer" onClick={() => handleViewResource(resource)}>
                <div className="flex items-center">
                  <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-md ${resourceColors[resource.resourceType] || resourceColors.default}`}>
                    {resourceIcons[resource.resourceType] || resourceIcons.default}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{resource.resourceType}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(resource.created)}</p>
                    </div>
                    <div className="mt-1">
                      <p className="text-xs text-gray-500 truncate">ID: {resource.resourceId}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="px-2 pt-0">
          <Button variant="link" className="text-primary-600 hover:text-primary-700 p-0 h-auto font-medium" size="sm">
            View all resources
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      {selectedResource && (
        <ResourceViewer 
          resource={selectedResource} 
          isOpen={isViewerOpen} 
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </>
  );
}
