import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

export default function ClaimsChart() {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  
  const { data, isLoading, error } = useQuery<ChartData>({
    queryKey: ['/api/charts/claims', timeframe],
  });

  if (isLoading) {
    return (
      <Card className="lg:col-span-2 shadow">
        <CardHeader className="pb-4 border-b border-gray-200">
          <CardTitle className="text-lg font-medium text-gray-900">Claims Processing Analytics</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="lg:col-span-2 shadow">
        <CardHeader className="pb-4 border-b border-gray-200">
          <CardTitle className="text-lg font-medium text-gray-900">Claims Processing Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading chart data: {error?.message || "Unknown error"}</p>
        </CardContent>
      </Card>
    );
  }

  // Transform the data for Recharts
  const chartData = data.labels.map((label, index) => {
    const dataPoint: { name: string; [key: string]: any } = { name: label };
    
    data.datasets.forEach(dataset => {
      dataPoint[dataset.label] = dataset.data[index];
    });
    
    return dataPoint;
  });

  // Custom colors for the lines
  const lineColors = ['#3B82F6', '#10B981', '#EF4444'];

  return (
    <Card className="lg:col-span-2 shadow">
      <CardHeader className="px-5 py-4 border-b border-gray-200 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-gray-900">Claims Processing Analytics</CardTitle>
        <div className="flex space-x-2">
          <Button 
            variant={timeframe === 'weekly' ? 'secondary' : 'outline'} 
            size="sm"
            onClick={() => setTimeframe('weekly')}
          >
            Weekly
          </Button>
          <Button 
            variant={timeframe === 'monthly' ? 'secondary' : 'outline'} 
            size="sm"
            onClick={() => setTimeframe('monthly')}
          >
            Monthly
          </Button>
          <Button 
            variant={timeframe === 'yearly' ? 'secondary' : 'outline'} 
            size="sm"
            onClick={() => setTimeframe('yearly')}
          >
            Yearly
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.datasets.map((dataset, index) => (
                <Line
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={lineColors[index % lineColors.length]}
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
