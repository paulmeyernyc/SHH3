import React, { useState } from "react";
import { Layout } from "@/components/layout";
import NetworkMap from "@/components/network-directory/NetworkMap";
import NetworkStats from "@/components/network-directory/NetworkStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Filter, Map, BarChart3, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function NetworkDirectoryPage() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate refresh with setTimeout
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 flex-grow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Network Directory</h1>
            <p className="text-muted-foreground">
              Visualize the SHH healthcare network services and connection status
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button 
              variant="outline" 
              className="flex items-center gap-1" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh Data"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="col-span-1 lg:col-span-3">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <CardTitle>Network Metrics</CardTitle>
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Filter className="h-3.5 w-3.5" />
                    <span>Filter</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <NetworkStats className="w-full" />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="map" className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <TabsList>
              <TabsTrigger value="map" className="flex items-center gap-1">
                <Map className="h-4 w-4" />
                <span>Map View</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                <span>Statistics</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="map" className="mt-0 p-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Network Geographical Distribution</CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <div className="h-[600px] w-full rounded-md overflow-hidden">
                  <NetworkMap />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="stats" className="mt-0 p-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Detailed Network Statistics</CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Additional statistics or charts could go here */}
                  <p className="col-span-1 md:col-span-2 text-muted-foreground text-center py-12">
                    Detailed statistics view is under development.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}