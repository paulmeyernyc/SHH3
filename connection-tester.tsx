import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Copy, Database, FileJson, Info, LucideActivity, Server, Wrench } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ConnectionType = "fhir" | "hl7v2" | "x12";

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp?: string;
}

export function ConnectionTester() {
  const [activeTab, setActiveTab] = useState<ConnectionType>("fhir");
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  
  // FHIR form state
  const [fhirConfig, setFhirConfig] = useState({
    serverUrl: "https://api.example.com/fhir",
    authType: "none",
    token: "",
    resourceType: "Patient"
  });
  
  // HL7v2 form state
  const [hl7Config, setHl7Config] = useState({
    host: "mllp.example.com",
    port: "5000",
    messageType: "ADT",
    testMessage: "MSH|^~\\&|SENDING_APPLICATION|SENDING_FACILITY|RECEIVING_APPLICATION|RECEIVING_FACILITY|20231015000000||ADT^A01|1234567890|P|2.5.1\nEVN|A01|20231015000000\nPID|1||123456^^^ADT1^^MRN~12345^^^FACILITY^^CMRN||DOE^JOHN^^^^^L||19800101|M||^WHITE^HL70005|123 MAIN ST^^ANYTOWN^CA^12345^USA^^H||(111)222-3333^^^johndoe@email.com",
  });
  
  // X12 form state
  const [x12Config, setX12Config] = useState({
    endpoint: "https://x12.example.com/endpoint",
    transactionType: "270",
    authType: "none",
    token: "",
    testMessage: "ISA*00*          *00*          *ZZ*SUBMITTERID    *ZZ*RECEIVERID     *230101*1200*^*00501*000000001*0*P*:~\nGS*HS*SENDERCODE*RECEIVERCODE*20230101*1200*1*X*005010X279A1~\nST*270*0001*005010X279A1~\nBHT*0022*13*TRANID*20230101*1200~\nHL*1**20*1~\nNM1*PR*2*PAYER NAME*****PI*PAYERID~\nHL*2*1*21*1~\nNM1*1P*2*PROVIDER NAME*****XX*1234567890~\nHL*3*2*22*0~\nNM1*IL*1*DOE*JOHN****MI*12345678901~\nDMG*D8*19800101~\nEQ*30~\nSE*13*0001~\nGE*1*1~\nIEA*1*000000001~",
  });
  
  const { toast } = useToast();
  
  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async ({ type, config }: { type: ConnectionType; config: any }) => {
      const response = await apiRequest("POST", "/api/integration/test-connection", {
        type,
        config
      });
      return response.json();
    },
    onSuccess: (data: TestResult) => {
      setTestResult(data);
      setIsLoading(false);
      
      toast({
        title: data.success ? "Connection Successful" : "Connection Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error: Error) => {
      setIsLoading(false);
      setTestResult({
        success: false,
        message: `Error testing connection: ${error.message}`
      });
      
      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleFhirInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFhirConfig(prev => ({ ...prev, [name]: value }));
  };
  
  const handleHL7InputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setHl7Config(prev => ({ ...prev, [name]: value }));
  };
  
  const handleX12InputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setX12Config(prev => ({ ...prev, [name]: value }));
  };
  
  const handleTestConnection = () => {
    setIsLoading(true);
    setTestResult(null);
    
    let config;
    if (activeTab === "fhir") {
      config = fhirConfig;
    } else if (activeTab === "hl7v2") {
      config = hl7Config;
    } else if (activeTab === "x12") {
      config = x12Config;
    }
    
    testConnectionMutation.mutate({ type: activeTab, config });
  };
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: `${label} has been copied to your clipboard.`,
        variant: "default"
      });
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Connection Tester</CardTitle>
        <CardDescription>
          Test your integration connections before deploying to production
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ConnectionType)}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fhir" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              FHIR Connection
            </TabsTrigger>
            <TabsTrigger value="hl7v2" className="flex items-center gap-2">
              <LucideActivity className="h-4 w-4" />
              HL7v2 Connection
            </TabsTrigger>
            <TabsTrigger value="x12" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              X12 EDI Connection
            </TabsTrigger>
          </TabsList>
          
          {/* FHIR Test Tab */}
          <TabsContent value="fhir" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="serverUrl">FHIR Server URL</Label>
                  <Input
                    id="serverUrl"
                    name="serverUrl"
                    placeholder="https://api.example.com/fhir"
                    value={fhirConfig.serverUrl}
                    onChange={handleFhirInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="authType">Authentication Type</Label>
                  <Select 
                    value={fhirConfig.authType} 
                    onValueChange={(value) => setFhirConfig(prev => ({ ...prev, authType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select authentication type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Authentication</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {fhirConfig.authType !== "none" && (
                  <div className="space-y-2">
                    <Label htmlFor="token">
                      {fhirConfig.authType === "bearer" ? "Bearer Token" : "Basic Auth Token"}
                    </Label>
                    <Input
                      id="token"
                      name="token"
                      type="password"
                      placeholder={fhirConfig.authType === "bearer" ? "Bearer token" : "username:password"}
                      value={fhirConfig.token}
                      onChange={handleFhirInputChange}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="resourceType">Resource Type to Test</Label>
                  <Select 
                    value={fhirConfig.resourceType} 
                    onValueChange={(value) => setFhirConfig(prev => ({ ...prev, resourceType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select resource type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Patient">Patient</SelectItem>
                      <SelectItem value="Encounter">Encounter</SelectItem>
                      <SelectItem value="Observation">Observation</SelectItem>
                      <SelectItem value="Condition">Condition</SelectItem>
                      <SelectItem value="Procedure">Procedure</SelectItem>
                      <SelectItem value="MedicationRequest">MedicationRequest</SelectItem>
                      <SelectItem value="AllergyIntolerance">AllergyIntolerance</SelectItem>
                      <SelectItem value="Immunization">Immunization</SelectItem>
                      <SelectItem value="DiagnosticReport">DiagnosticReport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>FHIR Connection Testing</AlertTitle>
                  <AlertDescription>
                    This tool will attempt to connect to your FHIR server and run a metadata query followed by a search on the selected resource type.
                  </AlertDescription>
                </Alert>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Example Request</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <code className="text-xs block bg-secondary p-2 rounded overflow-x-auto">
                      GET {fhirConfig.serverUrl}/metadata<br />
                      Accept: application/fhir+json<br />
                      {fhirConfig.authType === "bearer" && `Authorization: Bearer ${fhirConfig.token ? "..." : "[your-token]"}`}
                      {fhirConfig.authType === "basic" && `Authorization: Basic ${fhirConfig.token ? "..." : "[encoded-credentials]"}`}
                    </code>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* HL7v2 Test Tab */}
          <TabsContent value="hl7v2" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="host">HL7 Host</Label>
                    <Input
                      id="host"
                      name="host"
                      placeholder="mllp.example.com"
                      value={hl7Config.host}
                      onChange={handleHL7InputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      name="port"
                      placeholder="5000"
                      value={hl7Config.port}
                      onChange={handleHL7InputChange}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="messageType">Message Type</Label>
                  <Select 
                    value={hl7Config.messageType} 
                    onValueChange={(value) => setHl7Config(prev => ({ ...prev, messageType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select message type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADT">ADT (Admission/Discharge/Transfer)</SelectItem>
                      <SelectItem value="ORM">ORM (Order Message)</SelectItem>
                      <SelectItem value="ORU">ORU (Observation Result)</SelectItem>
                      <SelectItem value="SIU">SIU (Scheduling Information)</SelectItem>
                      <SelectItem value="MDM">MDM (Medical Document Management)</SelectItem>
                      <SelectItem value="DFT">DFT (Detailed Financial Transaction)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="testMessage">Test Message (HL7)</Label>
                  <Textarea
                    id="testMessage"
                    name="testMessage"
                    placeholder="MSH|^~\&|..."
                    value={hl7Config.testMessage}
                    onChange={handleHL7InputChange}
                    rows={8}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>HL7v2 Connection Testing</AlertTitle>
                  <AlertDescription>
                    This tool will attempt to send a test message to your HL7 endpoint via an MLLP connection and parse the response.
                  </AlertDescription>
                </Alert>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Sample Messages</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs">ADT-A01 (Admission)</Label>
                      <div className="flex">
                        <code className="bg-secondary flex-1 px-2 py-1 rounded-l-md font-mono text-xs overflow-x-auto">
                          MSH|^~\\&|SENDING_APP|FACILITY|RECEIVING_APP|FACILITY|202310150000||ADT^A01|123456|P|2.5.1
                        </code>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="rounded-l-none h-auto"
                          onClick={() => copyToClipboard("MSH|^~\\&|SENDING_APP|FACILITY|RECEIVING_APP|FACILITY|202310150000||ADT^A01|123456|P|2.5.1", "Sample HL7 Message")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs">ORM-O01 (Order Message)</Label>
                      <div className="flex">
                        <code className="bg-secondary flex-1 px-2 py-1 rounded-l-md font-mono text-xs overflow-x-auto">
                          MSH|^~\\&|SENDING_APP|FACILITY|RECEIVING_APP|FACILITY|202310150000||ORM^O01|123456|P|2.5.1
                        </code>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="rounded-l-none h-auto"
                          onClick={() => copyToClipboard("MSH|^~\\&|SENDING_APP|FACILITY|RECEIVING_APP|FACILITY|202310150000||ORM^O01|123456|P|2.5.1", "Sample HL7 Message")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* X12 Test Tab */}
          <TabsContent value="x12" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="endpoint">X12 Endpoint URL</Label>
                  <Input
                    id="endpoint"
                    name="endpoint"
                    placeholder="https://x12.example.com/endpoint"
                    value={x12Config.endpoint}
                    onChange={handleX12InputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="transactionType">Transaction Type</Label>
                  <Select 
                    value={x12Config.transactionType} 
                    onValueChange={(value) => setX12Config(prev => ({ ...prev, transactionType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="270">270 (Eligibility Inquiry)</SelectItem>
                      <SelectItem value="271">271 (Eligibility Response)</SelectItem>
                      <SelectItem value="276">276 (Claim Status Inquiry)</SelectItem>
                      <SelectItem value="277">277 (Claim Status Response)</SelectItem>
                      <SelectItem value="278">278 (Prior Authorization)</SelectItem>
                      <SelectItem value="837">837 (Claim Submission)</SelectItem>
                      <SelectItem value="835">835 (Claim Payment/Remittance)</SelectItem>
                      <SelectItem value="834">834 (Benefit Enrollment)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="authType">Authentication Type</Label>
                  <Select 
                    value={x12Config.authType} 
                    onValueChange={(value) => setX12Config(prev => ({ ...prev, authType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select authentication type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Authentication</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {x12Config.authType !== "none" && (
                  <div className="space-y-2">
                    <Label htmlFor="token">
                      {x12Config.authType === "bearer" ? "Bearer Token" : "Basic Auth Token"}
                    </Label>
                    <Input
                      id="token"
                      name="token"
                      type="password"
                      placeholder={x12Config.authType === "bearer" ? "Bearer token" : "username:password"}
                      value={x12Config.token}
                      onChange={handleX12InputChange}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="testMessage">Test Message (X12)</Label>
                  <Textarea
                    id="testMessage"
                    name="testMessage"
                    placeholder="ISA*00*..."
                    value={x12Config.testMessage}
                    onChange={handleX12InputChange}
                    rows={8}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>X12 EDI Connection Testing</AlertTitle>
                  <AlertDescription>
                    This tool will attempt to send a test X12 EDI message to your endpoint and parse the response. 
                    Specify the transaction type to help with proper message validation.
                  </AlertDescription>
                </Alert>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Sample EDI Messages</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs">270 (Eligibility Inquiry)</Label>
                      <div className="flex">
                        <code className="bg-secondary flex-1 px-2 py-1 rounded-l-md font-mono text-xs overflow-x-auto">
                          ISA*00*          *00*          *ZZ*SUBMITTERID    *ZZ*RECEIVERID     *230101*1200*^*00501*000000001*0*P*:~
                        </code>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="rounded-l-none h-auto"
                          onClick={() => copyToClipboard("ISA*00*          *00*          *ZZ*SUBMITTERID    *ZZ*RECEIVERID     *230101*1200*^*00501*000000001*0*P*:~\nGS*HS*SENDERCODE*RECEIVERCODE*20230101*1200*1*X*005010X279A1~\nST*270*0001*005010X279A1~\nBHT*0022*13*TRANID*20230101*1200~\nHL*1**20*1~\nNM1*PR*2*PAYER NAME*****PI*PAYERID~\nHL*2*1*21*1~\nNM1*1P*2*PROVIDER NAME*****XX*1234567890~\nHL*3*2*22*0~\nNM1*IL*1*DOE*JOHN****MI*12345678901~\nDMG*D8*19800101~\nEQ*30~\nSE*13*0001~\nGE*1*1~\nIEA*1*000000001~", "270 Eligibility Inquiry")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs">837 (Healthcare Claim)</Label>
                      <div className="flex">
                        <code className="bg-secondary flex-1 px-2 py-1 rounded-l-md font-mono text-xs overflow-x-auto">
                          ISA*00*          *00*          *ZZ*SUBMITTERID    *ZZ*RECEIVERID     *230101*1200*^*00501*000000001*0*P*:~
                        </code>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="rounded-l-none h-auto"
                          onClick={() => copyToClipboard("ISA*00*          *00*          *ZZ*SUBMITTERID    *ZZ*RECEIVERID     *230101*1200*^*00501*000000001*0*P*:~\nGS*HC*SENDERCODE*RECEIVERCODE*20230101*1200*1*X*005010X222A1~\nST*837*0001*005010X222A1~\nBHT*0019*00*CLAIMID*20230101*1200*CH~\nNM1*41*2*PROVIDER NAME*****46*PROVIDER NPI~\nPER*IC*CONTACT NAME*TE*5551234567~\nNM1*40*2*RECEIVER NAME*****46*RECEIVER ID~\nHL*1**20*1~\nNM1*85*2*BILLING PROVIDER*****XX*1234567890~\nN3*123 MAIN STREET~\nN4*ANYTOWN*CA*12345~\nREF*EI*123456789~\nHL*2*1*22*0~\nSBR*P*18*******MC~\nNM1*IL*1*DOE*JOHN****MI*12345678901~\nN3*456 OAK AVE~\nN4*SOMECITY*CA*54321~\nDMG*D8*19800101*M~\nCLM*CLAIM12345*500***11:B:1*Y*A*Y*Y~\nHI*BK:J209~\nLX*1~\nSV1*HC:99213*150*UN*1***1~\nDTP*472*D8*20230101~\nSE*24*0001~\nGE*1*1~\nIEA*1*000000001~", "837 Healthcare Claim")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Test Results */}
        {testResult && (
          <div className="mt-6">
            <Card className={testResult.success ? "border-green-500" : "border-red-500"}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  {testResult.success ? "Connection Successful" : "Connection Failed"}
                </CardTitle>
                <CardDescription>
                  {testResult.message}
                </CardDescription>
              </CardHeader>
              
              {testResult.details && (
                <CardContent>
                  <div className="bg-secondary p-3 rounded-md">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(testResult.details, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              )}
              
              {testResult.timestamp && (
                <CardFooter className="text-xs text-muted-foreground">
                  Test completed at {new Date(testResult.timestamp).toLocaleString()}
                </CardFooter>
              )}
            </Card>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end border-t pt-6">
        <Button
          onClick={handleTestConnection}
          disabled={isLoading}
          className="gap-2"
        >
          <Wrench className="h-4 w-4" />
          {isLoading ? "Testing Connection..." : "Test Connection"}
        </Button>
      </CardFooter>
    </Card>
  );
}