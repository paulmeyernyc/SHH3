import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface NetworkStatsProps {
  className?: string;
}

interface NetworkStatistics {
  totalParticipants: number;
  totalServices: number;
  totalConnections: number;
  participantsByType: {
    type: string;
    count: number;
  }[];
  servicesByType: {
    type: string;
    count: number;
  }[];
  connectionsByStatus: {
    status: string;
    count: number;
  }[];
}

// Type names for prettier display
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

// Service type names
const serviceNames = {
  eligibility_verification: 'Eligibility Verification',
  prior_authorization: 'Prior Authorization',
  claims_submission: 'Claims Submission',
  referral_management: 'Referral Management',
  clinical_data_exchange: 'Clinical Data Exchange',
  patient_access: 'Patient Access',
  provider_directory: 'Provider Directory',
  scheduling: 'Scheduling',
  notification: 'Notification',
  payment: 'Payment',
  pharmacy_services: 'Pharmacy Services',
  lab_orders: 'Lab Orders',
  imaging_orders: 'Imaging Orders',
  health_information_exchange: 'Health Information Exchange',
  analytics: 'Analytics',
  other: 'Other',
};

// Connection status names
const statusNames = {
  pending: 'Pending',
  active: 'Active',
  suspended: 'Suspended',
  terminated: 'Terminated',
};

// Mock statistics data for development
const mockStats: NetworkStatistics = {
  totalParticipants: 387,
  totalServices: 1245,
  totalConnections: 892,
  participantsByType: [
    { type: 'provider', count: 156 },
    { type: 'payer', count: 42 },
    { type: 'clearing_house', count: 18 },
    { type: 'pharmacy', count: 64 },
    { type: 'lab', count: 35 },
    { type: 'imaging_center', count: 28 },
    { type: 'health_system', count: 22 },
    { type: 'employer', count: 15 },
    { type: 'state_hie', count: 5 },
    { type: 'public_health_agency', count: 2 },
  ],
  servicesByType: [
    { type: 'eligibility_verification', count: 215 },
    { type: 'prior_authorization', count: 183 },
    { type: 'claims_submission', count: 247 },
    { type: 'clinical_data_exchange', count: 198 },
    { type: 'patient_access', count: 112 },
    { type: 'provider_directory', count: 87 },
    { type: 'pharmacy_services', count: 128 },
    { type: 'lab_orders', count: 75 },
  ],
  connectionsByStatus: [
    { status: 'active', count: 728 },
    { status: 'pending', count: 97 },
    { status: 'suspended', count: 42 },
    { status: 'terminated', count: 25 },
  ],
};

export default function NetworkStats({ className }: NetworkStatsProps) {
  const [stats, setStats] = useState<NetworkStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading delay for a more realistic experience
    const timer = setTimeout(() => {
      setStats(mockStats);
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">No statistics available</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 md:grid-cols-3 ${className}`}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Participants</CardTitle>
          <CardDescription>Network participants by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-4">
            {stats.totalParticipants.toLocaleString()}
          </div>
          <div className="space-y-2">
            {stats.participantsByType.map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <span className="text-sm">
                  {typeNames[item.type as keyof typeof typeNames] || item.type}
                </span>
                <span className="font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Services</CardTitle>
          <CardDescription>Available services by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-4">
            {stats.totalServices.toLocaleString()}
          </div>
          <div className="space-y-2">
            {stats.servicesByType.map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <span className="text-sm">
                  {serviceNames[item.type as keyof typeof serviceNames] || item.type}
                </span>
                <span className="font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Connections</CardTitle>
          <CardDescription>Network connections by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-4">
            {stats.totalConnections.toLocaleString()}
          </div>
          <div className="space-y-2">
            {stats.connectionsByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="text-sm flex items-center">
                  <span 
                    className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      item.status === 'active' 
                        ? 'bg-green-500' 
                        : item.status === 'pending' 
                        ? 'bg-yellow-500' 
                        : item.status === 'suspended'
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                    }`} 
                  />
                  {statusNames[item.status as keyof typeof statusNames] || item.status}
                </span>
                <span className="font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}