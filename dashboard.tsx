import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import DashboardStats from "@/components/DashboardStats";
import ClaimsChart from "@/components/ClaimsChart";
import FhirResourceList from "@/components/FhirResourceList";
import PatientRecords from "@/components/PatientRecords";
import ClaimsStatus from "@/components/ClaimsStatus";
import ProviderDirectory from "@/components/ProviderDirectory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";

export default function Dashboard() {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  
  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header toggleSidebar={toggleSidebar} isSidebarVisible={isSidebarVisible} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isVisible={isSidebarVisible} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto">
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Healthcare Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">Overview of key metrics and patient data</p>
              </div>
              <div className="mt-4 md:mt-0 flex space-x-3">
                <div className="relative">
                  <Input 
                    type="text" 
                    placeholder="Search" 
                    className="pl-10 w-full"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Record
                </Button>
              </div>
            </div>

            {/* Stats Overview */}
            <DashboardStats />

            {/* Main Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <ClaimsChart />
              <FhirResourceList />
            </div>

            {/* Patient Health Records and Claims Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <PatientRecords />
              <ClaimsStatus />
            </div>

            {/* Provider Directory Search */}
            <ProviderDirectory />
          </div>
        </main>
      </div>
    </div>
  );
}
