import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { TestSuiteCard } from '../components/testing/test-suite-card';
import { TestFilterPanel } from '../components/testing/test-filter-panel';
import { TestRunDisplay } from '../components/testing/test-run-display';
import { TestingStats } from '../components/testing/testing-stats';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlayIcon, History, BarChart3 } from 'lucide-react';
import { TestSuite, TestRun, TestStatus } from '@/lib/testing/types';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../lib/queryClient';

// Mock data for initial setup
const mockTestSuites: TestSuite[] = [
  {
    id: "fhir-test-suite",
    name: "FHIR Compatibility Tests",
    description: "Tests for FHIR R4 compatibility across all resources",
    tags: ["FHIR", "API", "Integration"],
    testCases: [
      {
        id: "fhir-001",
        name: "Patient Resource Validation",
        description: "Validates the Patient resource against FHIR R4 profiles",
        component: "FHIR",
        category: "API",
        severity: "Critical",
        automated: true,
        tags: ["FHIR", "Patient", "Validation"]
      },
      {
        id: "fhir-002",
        name: "FHIR Search Implementation",
        description: "Tests the search capabilities across all FHIR resources",
        component: "FHIR",
        category: "API",
        severity: "High",
        automated: true,
        tags: ["FHIR", "Search", "Query"]
      },
      {
        id: "fhir-003",
        name: "FHIR Extensions Validation",
        description: "Validates all custom FHIR extensions",
        component: "FHIR",
        category: "Compliance",
        severity: "Medium",
        automated: true,
        tags: ["FHIR", "Extensions", "Compliance"]
      }
    ]
  },
  {
    id: "phr-test-suite",
    name: "PHR Service Tests",
    description: "Tests for Personal Health Record service functionality",
    tags: ["PHR", "Integration", "Patient"],
    testCases: [
      {
        id: "phr-001",
        name: "PHR Record Creation",
        description: "Tests creation of PHR records",
        component: "PHR",
        category: "Functional",
        severity: "High",
        automated: true,
        tags: ["PHR", "Create"]
      },
      {
        id: "phr-002",
        name: "PHR Access Control",
        description: "Verifies PHR access control permissions",
        component: "PHR",
        category: "Security",
        severity: "Critical",
        automated: true,
        tags: ["PHR", "Security", "Access Control"]
      }
    ]
  },
  {
    id: "consent-test-suite",
    name: "Consent Service Tests",
    description: "Tests for the Universal Consent Service",
    tags: ["Consent", "Integration", "Security"],
    testCases: [
      {
        id: "consent-001",
        name: "Consent Recording",
        description: "Tests recording of patient consent",
        component: "Consent",
        category: "Functional",
        severity: "Critical",
        automated: true,
        tags: ["Consent", "Create"]
      },
      {
        id: "consent-002",
        name: "Consent Validation",
        description: "Tests consent validation during data access",
        component: "Consent",
        category: "Security",
        severity: "Critical",
        automated: true,
        tags: ["Consent", "Validation", "Security"]
      },
      {
        id: "consent-003",
        name: "Consent Revocation",
        description: "Tests revocation of previously granted consent",
        component: "Consent",
        category: "Functional",
        severity: "High",
        automated: true,
        tags: ["Consent", "Revoke"]
      }
    ]
  },
  {
    id: "claims-test-suite",
    name: "Claims Processing Tests",
    description: "Tests for the Claims Submission and Processing system",
    tags: ["Claims", "Integration", "Billing"],
    testCases: [
      {
        id: "claims-001",
        name: "Claim Submission",
        description: "Tests submission of new claims",
        component: "Claims",
        category: "Functional",
        severity: "High",
        automated: true,
        tags: ["Claims", "Submit"]
      },
      {
        id: "claims-002",
        name: "Claim Status Check",
        description: "Tests claim status checking functionality",
        component: "Claims",
        category: "API",
        severity: "Medium",
        automated: true,
        tags: ["Claims", "Status"]
      }
    ]
  }
];

// Mock test run history
const mockTestRuns: TestRun[] = [
  {
    id: "run-001",
    suiteIds: ["fhir-test-suite", "phr-test-suite"],
    startTime: Date.now() - 3600000, // 1 hour ago
    endTime: Date.now() - 3580000,
    inProgress: false,
    results: {
      "fhir-001": {
        status: TestStatus.PASSED,
        startTime: Date.now() - 3600000,
        endTime: Date.now() - 3599000,
        duration: 1000,
        assertionsTotal: 15,
        assertionsPassed: 15,
        assertionsFailed: 0,
        message: "All Patient resource validations passed"
      },
      "fhir-002": {
        status: TestStatus.PASSED,
        startTime: Date.now() - 3599000,
        endTime: Date.now() - 3598000,
        duration: 1000,
        assertionsTotal: 23,
        assertionsPassed: 23,
        assertionsFailed: 0,
        message: "Search implementations validated successfully"
      },
      "fhir-003": {
        status: TestStatus.FAILED,
        startTime: Date.now() - 3598000,
        endTime: Date.now() - 3597000,
        duration: 1000,
        assertionsTotal: 8,
        assertionsPassed: 6,
        assertionsFailed: 2,
        message: "Custom extensions validation failed: 2 issues found"
      },
      "phr-001": {
        status: TestStatus.PASSED,
        startTime: Date.now() - 3597000,
        endTime: Date.now() - 3596000,
        duration: 1000,
        assertionsTotal: 12,
        assertionsPassed: 12,
        assertionsFailed: 0,
        message: "PHR record creation validated successfully"
      },
      "phr-002": {
        status: TestStatus.PASSED,
        startTime: Date.now() - 3596000,
        endTime: Date.now() - 3595000,
        duration: 1000,
        assertionsTotal: 18,
        assertionsPassed: 18,
        assertionsFailed: 0,
        message: "Access control verification complete"
      }
    },
    summary: {
      totalTests: 5,
      passed: 4,
      failed: 1,
      skipped: 0,
      duration: 5000,
      startTime: Date.now() - 3600000,
      endTime: Date.now() - 3595000
    }
  },
  {
    id: "run-002",
    suiteId: "consent-test-suite",
    startTime: Date.now() - 7200000, // 2 hours ago
    endTime: Date.now() - 7195000,
    inProgress: false,
    results: {
      "consent-001": {
        status: TestStatus.PASSED,
        startTime: Date.now() - 7200000,
        endTime: Date.now() - 7199000,
        duration: 1000,
        assertionsTotal: 10,
        assertionsPassed: 10,
        assertionsFailed: 0,
        message: "Consent recording passed"
      },
      "consent-002": {
        status: TestStatus.PASSED,
        startTime: Date.now() - 7199000,
        endTime: Date.now() - 7198000,
        duration: 1000,
        assertionsTotal: 15,
        assertionsPassed: 15,
        assertionsFailed: 0,
        message: "Consent validation during access passed"
      },
      "consent-003": {
        status: TestStatus.FAILED,
        startTime: Date.now() - 7198000,
        endTime: Date.now() - 7197000,
        duration: 1000,
        assertionsTotal: 8,
        assertionsPassed: 7,
        assertionsFailed: 1,
        message: "Consent revocation issue detected"
      }
    },
    summary: {
      totalTests: 3,
      passed: 2,
      failed: 1,
      skipped: 0,
      duration: 3000,
      startTime: Date.now() - 7200000,
      endTime: Date.now() - 7197000
    }
  }
];

export default function TestingPortalPage() {
  // State for selected test suites
  const [selectedSuites, setSelectedSuites] = useState<string[]>([]);
  // State for selected test run
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  // State for filter options
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [showPassed, setShowPassed] = useState(true);
  const [showFailed, setShowFailed] = useState(true);
  const [showSkipped, setShowSkipped] = useState(true);
  const [onlyAutomated, setOnlyAutomated] = useState(false);
  // State for active tab
  const [activeTab, setActiveTab] = useState('run-tests');
  // State for test execution
  const [isRunning, setIsRunning] = useState(false);

  // Fetch test suites from API (using mock data for now)
  const { data: testSuites = mockTestSuites, isLoading: isLoadingTestSuites } = useQuery({
    queryKey: ['/api/test-suites'],
    queryFn: async () => {
      // We'll replace this with actual API call when available
      return mockTestSuites;
    }
  });

  // Fetch test run history from API (using mock data for now)
  const { data: testHistory = mockTestRuns, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['/api/test-runs'],
    queryFn: async () => {
      // We'll replace this with actual API call when available
      return mockTestRuns;
    }
  });

  // Run tests mutation
  const runTestsMutation = useMutation({
    mutationFn: async (suiteIds: string[]) => {
      setIsRunning(true);
      // We'll replace this with actual API call when available
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a mock test run result
      const newRun: TestRun = {
        id: `run-${Date.now()}`,
        suiteIds,
        startTime: Date.now(),
        endTime: Date.now() + 5000,
        inProgress: false,
        results: {},
        summary: {
          totalTests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          duration: 5000,
          startTime: Date.now(),
          endTime: Date.now() + 5000
        }
      };
      
      // Add results for each selected suite's test cases
      let totalTests = 0;
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      
      suiteIds.forEach(suiteId => {
        const suite = testSuites.find(s => s.id === suiteId);
        if (suite) {
          suite.testCases.forEach(tc => {
            // Randomly assign status
            const rand = Math.random();
            let status;
            if (rand > 0.8) {
              status = TestStatus.FAILED;
              failed++;
            } else if (rand > 0.7) {
              status = TestStatus.SKIPPED;
              skipped++;
            } else {
              status = TestStatus.PASSED;
              passed++;
            }
            
            totalTests++;
            newRun.results[tc.id] = {
              status,
              startTime: Date.now(),
              endTime: Date.now() + 1000,
              duration: 1000,
              message: `Test ${status.toLowerCase()}`,
              assertionsTotal: Math.floor(Math.random() * 15) + 5,
              assertionsPassed: status === TestStatus.PASSED ? Math.floor(Math.random() * 15) + 5 : Math.floor(Math.random() * 5),
              assertionsFailed: status === TestStatus.FAILED ? Math.floor(Math.random() * 3) + 1 : 0
            };
          });
        }
      });
      
      if (newRun.summary) {
        newRun.summary.totalTests = totalTests;
        newRun.summary.passed = passed;
        newRun.summary.failed = failed;
        newRun.summary.skipped = skipped;
      }
      
      setIsRunning(false);
      return newRun;
    },
    onSuccess: (data) => {
      // Update test history and select the new run
      queryClient.setQueryData(['/api/test-runs'], (oldData: TestRun[] = []) => [data, ...oldData]);
      setSelectedRun(data);
      setActiveTab('test-results');
    }
  });

  // Handle running tests
  const handleRunTests = () => {
    if (selectedSuites.length === 0) {
      alert("Please select at least one test suite to run");
      return;
    }
    
    runTestsMutation.mutate(selectedSuites);
  };

  // Select most recent test run when available
  useEffect(() => {
    if (testHistory && testHistory.length > 0 && !selectedRun) {
      setSelectedRun(testHistory[0]);
    }
  }, [testHistory]);

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Testing Portal</h1>
            <p className="text-muted-foreground">
              Run tests, view test history, and monitor system health
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="secondary"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/test-suites'] })}
            >
              Refresh
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="run-tests" className="flex items-center gap-2">
              <PlayIcon className="h-4 w-4" />
              Run Tests
            </TabsTrigger>
            <TabsTrigger value="test-results" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Test Results
            </TabsTrigger>
            <TabsTrigger value="test-analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Test Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="run-tests" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-3 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Test Suites</CardTitle>
                    <CardDescription>
                      Select test suites to run and click the "Run Selected Tests" button
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTestSuites ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {testSuites.map(suite => (
                          <TestSuiteCard
                            key={suite.id}
                            suite={suite}
                            isSelected={selectedSuites.includes(suite.id)}
                            onToggleSelect={() => {
                              setSelectedSuites(prevSelected =>
                                prevSelected.includes(suite.id)
                                  ? prevSelected.filter(id => id !== suite.id)
                                  : [...prevSelected, suite.id]
                              );
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <div className="flex justify-end">
                  <Button 
                    size="lg" 
                    onClick={handleRunTests}
                    disabled={selectedSuites.length === 0 || isRunning}
                  >
                    {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Run Selected Tests
                    {selectedSuites.length > 0 && 
                      <Badge variant="secondary" className="ml-2">
                        {selectedSuites.length}
                      </Badge>
                    }
                  </Button>
                </div>
              </div>
              
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Filters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TestFilterPanel
                      testSuites={testSuites}
                      selectedSuites={selectedSuites}
                      setSelectedSuites={setSelectedSuites}
                      selectedComponent={selectedComponent}
                      setSelectedComponent={setSelectedComponent}
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      selectedSeverity={selectedSeverity}
                      setSelectedSeverity={setSelectedSeverity}
                      showPassed={showPassed}
                      setShowPassed={setShowPassed}
                      showFailed={showFailed}
                      setShowFailed={setShowFailed}
                      showSkipped={showSkipped}
                      setShowSkipped={setShowSkipped}
                      onlyAutomated={onlyAutomated}
                      setOnlyAutomated={setOnlyAutomated}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="test-results" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Test History</CardTitle>
                    <CardDescription>
                      {testHistory.length} test runs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingHistory ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {testHistory.map(run => (
                          <div
                            key={run.id}
                            className={`p-3 border rounded-md cursor-pointer hover:bg-accent transition-colors ${
                              selectedRun?.id === run.id ? 'border-primary bg-accent/40' : ''
                            }`}
                            onClick={() => setSelectedRun(run)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium">{run.id}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(run.startTime).toLocaleString()}
                                </div>
                              </div>
                              {run.summary && (
                                <div>
                                  <Badge variant="outline">
                                    <span className="text-green-500 mr-1">✓ {run.summary.passed}</span>
                                    <span className="text-red-500">✗ {run.summary.failed}</span>
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="md:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Test Results</CardTitle>
                    {selectedRun && (
                      <CardDescription>
                        Run ID: {selectedRun.id}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!selectedRun ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Select a test run to view results
                      </div>
                    ) : (
                      <TestRunDisplay
                        run={selectedRun}
                        testSuites={testSuites}
                        showPassed={showPassed}
                        showFailed={showFailed}
                        showSkipped={showSkipped}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="test-analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Analytics</CardTitle>
                <CardDescription>
                  Test statistics and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TestingStats
                  testSuites={testSuites}
                  testHistory={testHistory}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}