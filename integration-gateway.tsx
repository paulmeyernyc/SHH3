import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiKeyManager } from "@/components/integration/api-key-manager";
import { SmartAppManager } from "@/components/integration/smart-app-manager";
import { ConnectionStats } from "@/components/integration/connection-stats";
import { ConnectionTester } from "@/components/integration/connection-tester";
import { Key, LucideActivity, Rocket, BarChart } from "lucide-react";

export default function IntegrationGatewayPage() {
  const [activeTab, setActiveTab] = useState("api-keys");
  
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-3">Integration Gateway</h1>
          <p className="text-muted-foreground">
            Manage and monitor integrations between Smart Health Hub and external systems
          </p>
        </div>
        
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid grid-cols-1 md:grid-cols-4 h-auto bg-transparent border-b border-border rounded-none p-0">
            <TabsTrigger
              value="api-keys"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 flex gap-2 items-center"
            >
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger
              value="smart-apps"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 flex gap-2 items-center"
            >
              <Rocket className="h-4 w-4" />
              SMART Applications
            </TabsTrigger>
            <TabsTrigger
              value="connection-stats"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 flex gap-2 items-center"
            >
              <BarChart className="h-4 w-4" />
              Connection Stats
            </TabsTrigger>
            <TabsTrigger
              value="connection-tester"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 flex gap-2 items-center"
            >
              <LucideActivity className="h-4 w-4" />
              Connection Tester
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="api-keys" className="mt-6">
            <ApiKeyManager />
          </TabsContent>
          
          <TabsContent value="smart-apps" className="mt-6">
            <SmartAppManager />
          </TabsContent>
          
          <TabsContent value="connection-stats" className="mt-6">
            <ConnectionStats />
          </TabsContent>
          
          <TabsContent value="connection-tester" className="mt-6">
            <ConnectionTester />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}