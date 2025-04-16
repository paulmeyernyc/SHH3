import { FhirResource } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ResourceViewerProps {
  resource: FhirResource;
  isOpen: boolean;
  onClose: () => void;
}

export default function ResourceViewer({ resource, isOpen, onClose }: ResourceViewerProps) {
  const [viewMode, setViewMode] = useState<'raw' | 'formatted'>('raw');
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-gray-900">FHIR Resource Viewer</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <div className="border rounded-md p-4 bg-gray-50 font-mono text-sm overflow-auto max-h-96">
            <pre className="whitespace-pre text-xs overflow-x-auto">
              {JSON.stringify(resource.data, null, 2)}
            </pre>
          </div>
        </div>
        <DialogFooter className="mt-4 flex justify-between border-t pt-3">
          <Button 
            variant="outline" 
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setViewMode(viewMode === 'raw' ? 'formatted' : 'raw')}
          >
            {viewMode === 'raw' ? 'Formatted View' : 'Raw JSON'}
          </Button>
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
