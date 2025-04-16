import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { UserRound, Heart, Stethoscope, Building, CreditCard, Briefcase, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PortalsPage() {
  const { user } = useAuth();
  const [hoveredPortal, setHoveredPortal] = useState<string | null>(null);

  const portalTypes = [
    {
      id: "user",
      name: "User Portal",
      description: "Manage your account settings, preferences, and profile information",
      icon: <UserRound className="h-8 w-8" />,
      url: "/portals/user",
      color: "bg-blue-500/20 text-blue-400"
    },
    {
      id: "patient",
      name: "Patient Portal",
      description: "Access your health records, appointments, and manage your care",
      icon: <Heart className="h-8 w-8" />,
      url: "/portals/patient",
      color: "bg-rose-500/20 text-rose-400"
    },
    {
      id: "provider",
      name: "Provider Portal",
      description: "Manage patients, schedules, and access clinical tools",
      icon: <Stethoscope className="h-8 w-8" />,
      url: "/portals/provider",
      color: "bg-teal-500/20 text-teal-400"
    },
    {
      id: "organization",
      name: "Provider Organization Portal",
      description: "Manage your healthcare organization, staff, and facilities",
      icon: <Building className="h-8 w-8" />,
      url: "/portals/organization",
      color: "bg-indigo-500/20 text-indigo-400"
    },
    {
      id: "plan",
      name: "Health Plan Portal",
      description: "Manage insurance plans, members, claims, and benefits",
      icon: <CreditCard className="h-8 w-8" />,
      url: "/portals/plan",
      color: "bg-amber-500/20 text-amber-400"
    },
    {
      id: "employer",
      name: "Employer Portal",
      description: "Manage employee benefits, enrollment, and health programs",
      icon: <Briefcase className="h-8 w-8" />,
      url: "/portals/employer",
      color: "bg-emerald-500/20 text-emerald-400"
    },
    {
      id: "partner",
      name: "Partner Portal",
      description: "Onboarding, account setup, and integration management",
      icon: <UserPlus className="h-8 w-8" />,
      url: "/portals/partner",
      color: "bg-purple-500/20 text-purple-400"
    }
  ];

  return (
    <Layout>
      <div className="container mx-auto py-10">
        <h1 className="text-4xl font-bold mb-2 text-primary">Smart Health Hub Portals</h1>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          Access role-specific portals designed for different healthcare ecosystem participants. 
          Each portal provides specialized tools and information relevant to your role.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portalTypes.map((portal) => (
            <Card 
              key={portal.id}
              className={`border-border hover:border-primary/50 transition-all duration-300 ${
                hoveredPortal === portal.id ? "shadow-md" : ""
              }`}
              onMouseEnter={() => setHoveredPortal(portal.id)}
              onMouseLeave={() => setHoveredPortal(null)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-md ${portal.color}`}>
                    {portal.icon}
                  </div>
                </div>
                <CardTitle className="mt-3">{portal.name}</CardTitle>
                <CardDescription>
                  {portal.description}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button 
                  onClick={() => window.location.href = portal.url}
                  className="w-full"
                >
                  Access Portal
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 bg-primary/5 rounded-lg p-6 border border-primary/20">
          <h2 className="text-2xl font-bold mb-4">About Smart Health Hub Portals</h2>
          <p className="text-muted-foreground mb-4">
            The Smart Health Hub portal system provides role-specific interfaces designed for different 
            participants in the healthcare ecosystem. Each portal offers specialized tools, dashboards, 
            and functionality tailored to the unique needs of that user type.
          </p>
          <p className="text-muted-foreground">
            As a comprehensive healthcare platform, Smart Health Hub enables seamless collaboration between 
            patients, providers, payers, employers, and technology partners. The portal system is a key 
            component in facilitating this collaboration while maintaining appropriate data access controls 
            and privacy protection.
          </p>
        </div>
      </div>
    </Layout>
  );
}