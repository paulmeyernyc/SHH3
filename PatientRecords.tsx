import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Patient } from "@shared/schema";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, Filter, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PatientRecords() {
  const { data: patients, isLoading, error } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });

  if (isLoading) {
    return (
      <Card className="lg:col-span-2 shadow">
        <CardHeader className="px-5 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-gray-900">Patient Health Records</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !patients) {
    return (
      <Card className="lg:col-span-2 shadow">
        <CardHeader className="px-5 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-gray-900">Patient Health Records</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading patients: {error?.message || "Unknown error"}</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Complete':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{status}</Badge>;
      case 'Pending Update':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="lg:col-span-2 shadow">
      <CardHeader className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-gray-900">Patient Health Records</CardTitle>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </TableHead>
              <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                DOB
              </TableHead>
              <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Visit
              </TableHead>
              <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PHR Status
              </TableHead>
              <TableHead className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id} className="hover:bg-gray-50">
                <TableCell className="py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                        <User className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                      <div className="text-sm text-gray-500">ID: {patient.patientId}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="text-sm text-gray-900">{patient.dob}</div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="text-sm text-gray-900">{patient.lastVisit}</div>
                </TableCell>
                <TableCell className="py-4">
                  {getStatusBadge(patient.phrStatus)}
                </TableCell>
                <TableCell className="py-4 text-right text-sm font-medium">
                  <Button variant="link" className="text-primary-600 hover:text-primary-900 font-medium">View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <CardFooter className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex-1 flex justify-between sm:hidden">
          <Button variant="outline" size="sm">Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to <span className="font-medium">{patients.length}</span> of{" "}
              <span className="font-medium">{patients.length}</span> patients
            </p>
          </div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <Button variant="outline" size="sm" className="rounded-l-md">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="bg-primary-50 text-primary-600 hover:bg-primary-100">
              1
            </Button>
            <Button variant="ghost" size="sm" disabled className="rounded-r-md">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </CardFooter>
    </Card>
  );
}
