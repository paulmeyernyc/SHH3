import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

// Participant type colors
const typeColors = {
  provider: '#4285F4', // Blue
  payer: '#0F9D58', // Green
  clearing_house: '#F4B400', // Yellow
  pharmacy: '#DB4437', // Red
  lab: '#9C27B0', // Purple
  imaging_center: '#FF9800', // Orange
  health_system: '#3F51B5', // Indigo
  employer: '#00BCD4', // Cyan
  state_hie: '#795548', // Brown
  public_health_agency: '#607D8B', // Blue-grey
  other: '#9E9E9E', // Grey
};

// Participant type names for display
const typeNames = {
  provider: 'Provider',
  payer: 'Payer',
  clearing_house: 'Clearing House',
  pharmacy: 'Pharmacy',
  lab: 'Laboratory',
  imaging_center: 'Imaging Center',
  health_system: 'Health System',
  employer: 'Employer',
  state_hie: 'State HIE',
  public_health_agency: 'Public Health Agency',
  other: 'Other',
};

// Interface for network participant data structure
interface Participant {
  id: string;
  name: string;
  type: string;
  latitude: string;
  longitude: string;
  address?: string;
  city?: string;
  state?: string;
  services: {
    id: string;
    name: string;
    type: string;
    status: string;
  }[];
}

// Mock data for development
const mockParticipants: Participant[] = [
  {
    id: "1",
    name: "Central Hospital",
    type: "provider",
    latitude: "40.7128",
    longitude: "-74.0060",
    address: "123 Main St",
    city: "New York",
    state: "NY",
    services: [
      { id: "s1", name: "Patient Records", type: "clinical_data_exchange", status: "available" },
      { id: "s2", name: "Claims Processing", type: "claims_submission", status: "available" }
    ]
  },
  {
    id: "2",
    name: "BlueShield Insurance",
    type: "payer",
    latitude: "34.0522",
    longitude: "-118.2437",
    address: "456 Wilshire Blvd",
    city: "Los Angeles",
    state: "CA",
    services: [
      { id: "s3", name: "Eligibility Verification", type: "eligibility_verification", status: "available" },
      { id: "s4", name: "Prior Authorization", type: "prior_authorization", status: "degraded" }
    ]
  },
  {
    id: "3", 
    name: "HealthExchange Clearing House",
    type: "clearing_house",
    latitude: "41.8781",
    longitude: "-87.6298",
    address: "789 Michigan Ave",
    city: "Chicago",
    state: "IL",
    services: [
      { id: "s5", name: "Claims Routing", type: "claims_submission", status: "available" },
      { id: "s6", name: "Payment Processing", type: "payment", status: "available" }
    ]
  }
];

export default function NetworkMap() {
  const [participants, setParticipants] = useState<Participant[]>(mockParticipants);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterService, setFilterService] = useState<string | null>(null);
  const { toast } = useToast();

  // Load participants based on filters
  const loadParticipants = useCallback(async () => {
    try {
      setLoading(true);
      
      let url = '/api/network/map/participants';
      const params = new URLSearchParams();
      
      // Add filters to query if available
      if (filterType) {
        params.append('types', filterType);
      }
      
      // Add limit to query
      params.append('limit', '100');
      
      // Add params to URL
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      // In a production application, we would fetch from the API:
      // const response = await apiRequest('GET', url);
      // const data = await response.json();
      
      // For development, use mock data
      const data = [...mockParticipants];
      
      // Filter by service type if needed
      const filteredData = filterService
        ? data.filter((p: Participant) => 
            p.services.some(s => s.type === filterService || s.id === filterService))
        : data;
      
      // Filter by participant type if needed
      const typeFilteredData = filterType
        ? filteredData.filter(p => p.type === filterType)
        : filteredData;
      
      setParticipants(typeFilteredData);
    } catch (error) {
      console.error('Error loading participants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load network participants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filterType, filterService, toast]);

  // Load participants on mount and when filters change
  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  // Handle filter changes
  const handleFilterChange = (type: string | null) => {
    setFilterType(type);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="font-medium">Filter by Type:</div>
        <Button
          variant={filterType === null ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange(null)}
        >
          All
        </Button>
        {Object.keys(typeNames).map((type) => (
          <Button
            key={type}
            variant={filterType === type ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange(type)}
            className="capitalize"
          >
            {typeNames[type as keyof typeof typeNames]}
          </Button>
        ))}
      </div>
      
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
          {participants.length === 0 && !loading ? (
            <div className="col-span-full p-8 text-center">
              <p className="text-muted-foreground">No network participants found with the selected filters.</p>
            </div>
          ) : (
            participants.map(participant => (
              <Card 
                key={participant.id} 
                className={`overflow-hidden ${selectedParticipant?.id === participant.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedParticipant(participant)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-base">{participant.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {typeNames[participant.type as keyof typeof typeNames] || participant.type}
                      </p>
                    </div>
                    <div 
                      className="h-3 w-3 rounded-full"
                      style={{backgroundColor: typeColors[participant.type as keyof typeof typeColors] || typeColors.other}}
                    />
                  </div>
                  
                  {participant.address && (
                    <div className="flex items-start gap-1 text-sm mb-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span>
                        {participant.address}
                        {participant.city && participant.state && (
                          <span>, {participant.city}, {participant.state}</span>
                        )}
                      </span>
                    </div>
                  )}
                  
                  {participant.services && participant.services.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-1">Services:</p>
                      <ul className="space-y-1">
                        {participant.services.map((service) => (
                          <li key={service.id} className="flex items-center text-sm">
                            <span 
                              className={`inline-block w-2 h-2 rounded-full mr-1 ${
                                service.status === 'available' 
                                  ? 'bg-green-500' 
                                  : service.status === 'degraded' 
                                    ? 'bg-yellow-500' 
                                    : 'bg-red-500'
                              }`} 
                            />
                            {service.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/network/participants/${participant.id}`;
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}