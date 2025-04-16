import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Provider } from "@shared/schema";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export default function ProviderDirectory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("");
  
  const { data: providers, isLoading, error } = useQuery<Provider[]>({
    queryKey: ['/api/providers', searchTerm, specialty, location],
  });

  if (isLoading) {
    return (
      <Card className="shadow mt-6">
        <CardHeader className="px-5 py-4 border-b border-gray-200">
          <CardTitle className="text-lg font-medium text-gray-900">Provider Directory Search</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !providers) {
    return (
      <Card className="shadow mt-6">
        <CardHeader className="px-5 py-4 border-b border-gray-200">
          <CardTitle className="text-lg font-medium text-gray-900">Provider Directory Search</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading providers: {error?.message || "Unknown error"}</p>
        </CardContent>
      </Card>
    );
  }

  const getNetworkStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in-network':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{status}</Badge>;
      case 'limited network':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="shadow mt-6">
      <CardHeader className="px-5 py-4 border-b border-gray-200">
        <CardTitle className="text-lg font-medium text-gray-900">Provider Directory Search</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="col-span-2">
            <Label htmlFor="provider-search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Providers
            </Label>
            <div className="relative">
              <Input
                id="provider-search"
                placeholder="Search by name, specialty, location, or NPI"
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1">
              Specialty
            </Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger id="specialty">
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Specialties</SelectItem>
                <SelectItem value="cardiology">Cardiology</SelectItem>
                <SelectItem value="dermatology">Dermatology</SelectItem>
                <SelectItem value="family-medicine">Family Medicine</SelectItem>
                <SelectItem value="neurology">Neurology</SelectItem>
                <SelectItem value="orthopedics">Orthopedics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger id="location">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Locations</SelectItem>
                <SelectItem value="ny">New York, NY</SelectItem>
                <SelectItem value="la">Los Angeles, CA</SelectItem>
                <SelectItem value="chicago">Chicago, IL</SelectItem>
                <SelectItem value="houston">Houston, TX</SelectItem>
                <SelectItem value="miami">Miami, FL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="overflow-x-auto mt-2">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </TableHead>
                <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specialty
                </TableHead>
                <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </TableHead>
                <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Network Status
                </TableHead>
                <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NPI
                </TableHead>
                <TableHead className="relative py-3">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider) => (
                <TableRow key={provider.id} className="hover:bg-gray-50">
                  <TableCell className="py-4">
                    <div className="flex items-center">
                      <div className="ml-0">
                        <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                        <div className="text-sm text-gray-500">{provider.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="text-sm text-gray-900">{provider.specialty}</div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="text-sm text-gray-900">{provider.location}</div>
                  </TableCell>
                  <TableCell className="py-4">
                    {getNetworkStatusBadge(provider.networkStatus)}
                  </TableCell>
                  <TableCell className="py-4 text-sm text-gray-500">
                    {provider.npi}
                  </TableCell>
                  <TableCell className="py-4 text-right text-sm font-medium">
                    <Button variant="link" className="text-primary-600 hover:text-primary-900 font-medium">Details</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
