import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users, FileText, Building, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";

interface StatsData {
  activePatients: number;
  pendingClaims: number;
  providers: number;
  approvedAuth: string;
}

export default function DashboardStats() {
  const { data: stats, isLoading, error } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="bg-white overflow-hidden shadow rounded-lg p-5 flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg p-5 mb-6">
        <p className="text-red-500">Error loading stats: {error?.message || "Unknown error"}</p>
      </div>
    );
  }

  const statItems = [
    {
      title: "Active Patients",
      value: stats.activePatients.toLocaleString(),
      icon: <Users className="h-6 w-6" />,
      trend: { value: "3.2%", increase: true },
      bgColor: "bg-primary-100",
      textColor: "text-primary-600"
    },
    {
      title: "Pending Claims",
      value: stats.pendingClaims.toLocaleString(),
      icon: <FileText className="h-6 w-6" />,
      trend: { value: "1.8%", increase: false },
      bgColor: "bg-secondary-100", 
      textColor: "text-secondary-500" 
    },
    {
      title: "Provider Network",
      value: stats.providers.toLocaleString(),
      icon: <Building className="h-6 w-6" />,
      trend: { value: "5.4%", increase: true },
      bgColor: "bg-amber-100",
      textColor: "text-amber-600"
    },
    {
      title: "Approved Auth",
      value: stats.approvedAuth,
      icon: <CheckCircle className="h-6 w-6" />,
      trend: { value: "2.3%", increase: true },
      bgColor: "bg-green-100",
      textColor: "text-green-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
      {statItems.map((stat, index) => (
        <Card key={index} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-5 py-4">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-md ${stat.bgColor} ${stat.textColor}`}>
                {stat.icon}
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{stat.title}</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${stat.trend.increase ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.trend.increase ? (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      )}
                      <span className="sr-only">{stat.trend.increase ? 'Increased by' : 'Decreased by'}</span>
                      {stat.trend.value}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
