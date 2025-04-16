import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart, LineChart, PieChart } from "@/components/ui/charts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, RefreshCw, BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon, Calendar, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";

interface ConnectionStatistics {
  totalRequests: number;
  successRate: number;
  averageLatency: number;
  errorRate: number;
  requestsByEndpoint: Record<string, number>;
  requestsByDay: {
    date: string;
    count: number;
  }[];
}

export function ConnectionStats() {
  const { data: stats, isLoading, error, refetch } = useQuery<ConnectionStatistics>({
    queryKey: ["/api/integration/connection-stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/integration/connection-stats");
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !stats) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Statistics</AlertTitle>
        <AlertDescription>
          There was a problem loading your connection statistics. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  // Prepare chart data for endpoints
  const endpointChartData = {
    labels: Object.keys(stats.requestsByEndpoint).map(endpoint => 
      endpoint.length > 15 ? endpoint.substring(0, 15) + '...' : endpoint
    ),
    datasets: [
      {
        label: 'Requests',
        data: Object.values(stats.requestsByEndpoint),
        backgroundColor: [
          'rgba(176, 136, 249, 0.8)',
          'rgba(129, 140, 248, 0.8)',
          'rgba(96, 165, 250, 0.8)',
          'rgba(56, 189, 248, 0.8)',
          'rgba(45, 212, 191, 0.8)',
          'rgba(52, 211, 153, 0.8)'
        ],
      },
    ],
  };

  // Prepare chart data for requests by day
  const requestsByDayData = {
    labels: stats.requestsByDay.map(day => format(new Date(day.date), 'MMM dd')),
    datasets: [
      {
        label: 'Requests',
        data: stats.requestsByDay.map(day => day.count),
        borderColor: 'rgb(176, 136, 249)',
        backgroundColor: 'rgba(176, 136, 249, 0.5)',
        tension: 0.3,
      },
    ],
  };

  // Performance metrics chart data
  const performanceData = {
    labels: ['Success', 'Error'],
    datasets: [
      {
        label: 'Rate (%)',
        data: [stats.successRate, stats.errorRate],
        backgroundColor: [
          'rgba(52, 211, 153, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-2xl font-bold">Connection Statistics</CardTitle>
          <CardDescription>
            Monitor your API usage and performance metrics
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.totalRequests.toLocaleString()}</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <BarChartIcon className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-green-500">
                <ArrowUp className="h-3 w-3 mr-1" />
                <span>12.5% from last week</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.successRate.toFixed(1)}%</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <PieChartIcon className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-green-500">
                <ArrowUp className="h-3 w-3 mr-1" />
                <span>0.3% from last month</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg. Latency</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.averageLatency} ms</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <LineChartIcon className="h-6 w-6 text-blue-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-red-500">
                <ArrowDown className="h-3 w-3 mr-1" />
                <span>5.2% improvement</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.errorRate.toFixed(1)}%</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-green-500">
                <ArrowDown className="h-3 w-3 mr-1" />
                <span>0.2% decrease</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Chart Tabs */}
        <Tabs defaultValue="traffic" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="traffic" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Traffic Over Time
            </TabsTrigger>
            <TabsTrigger value="endpoints" className="flex items-center gap-2">
              <BarChartIcon className="h-4 w-4" />
              Endpoint Usage
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Performance
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="traffic" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <div className="h-80">
                  <LineChart
                    data={requestsByDayData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                        },
                      },
                      scales: {
                        x: {
                          grid: {
                            display: false,
                          },
                        },
                        y: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                          },
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="endpoints" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <div className="h-80">
                  <BarChart
                    data={endpointChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                        },
                      },
                      scales: {
                        x: {
                          grid: {
                            display: false,
                          },
                        },
                        y: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                          },
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="performance" className="mt-0">
            <Card>
              <CardContent className="pt-6 flex justify-center">
                <div className="h-80 w-80">
                  <PieChart
                    data={performanceData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}