import React, { useState } from "react";
import { TestRun, TestSuite, TestStatus, TestCase } from "@/lib/testing/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, XCircle, AlertTriangle, Clock, 
  ChevronDown, ChevronUp, Filter, AlertCircle,
  Loader2, RefreshCcw
} from "lucide-react";

interface TestRunDisplayProps {
  run: TestRun;
  testSuites: TestSuite[];
  showPassed: boolean;
  showFailed: boolean;
  showSkipped: boolean;
}

export function TestRunDisplay({ 
  run, 
  testSuites,
  showPassed,
  showFailed,
  showSkipped
}: TestRunDisplayProps) {
  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  
  // Get all test cases from the suites that were run
  const allTestCases: Record<string, TestCase> = {};
  testSuites.forEach(suite => {
    if (run.suiteIds?.includes(suite.id) || run.suiteId === suite.id) {
      suite.testCases.forEach(tc => {
        allTestCases[tc.id] = tc;
      });
    }
  });
  
  // Helper to toggle a test in the expanded list
  const toggleExpandTest = (testId: string) => {
    setExpandedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId) 
        : [...prev, testId]
    );
  };
  
  // Get status counts
  const counts = {
    total: Object.keys(run.results).length,
    passed: Object.values(run.results).filter(r => r.status === TestStatus.PASSED).length,
    failed: Object.values(run.results).filter(r => r.status === TestStatus.FAILED).length,
    skipped: Object.values(run.results).filter(r => r.status === TestStatus.SKIPPED).length,
    running: Object.values(run.results).filter(r => r.status === TestStatus.RUNNING).length,
    pending: Object.values(run.results).filter(r => r.status === TestStatus.PENDING).length,
    error: Object.values(run.results).filter(r => r.status === TestStatus.ERROR).length,
  };
  
  // Calculate progress percentage
  const completedTests = counts.passed + counts.failed + counts.skipped + counts.error;
  const progressPercentage = run.inProgress
    ? (completedTests / counts.total) * 100
    : 100;
  
  // Filter test results based on visibility settings
  const filteredResults = Object.entries(run.results).filter(([testId, result]) => {
    if (result.status === TestStatus.PASSED && !showPassed) return false;
    if (result.status === TestStatus.FAILED && !showFailed) return false;
    if (result.status === TestStatus.SKIPPED && !showSkipped) return false;
    return true;
  });
  
  // Get status icon
  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case TestStatus.PASSED:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case TestStatus.FAILED:
        return <XCircle className="h-5 w-5 text-red-500" />;
      case TestStatus.SKIPPED:
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case TestStatus.ERROR:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case TestStatus.RUNNING:
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case TestStatus.PENDING:
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: TestStatus) => {
    let variant: "default" | "destructive" | "outline" | "secondary" = "outline";
    let content = status;
    
    switch (status) {
      case TestStatus.PASSED:
        variant = "default";
        content = "Passed";
        break;
      case TestStatus.FAILED:
      case TestStatus.ERROR:
        variant = "destructive";
        content = status === TestStatus.FAILED ? "Failed" : "Error";
        break;
      case TestStatus.RUNNING:
        variant = "secondary";
        content = "Running";
        break;
      case TestStatus.SKIPPED:
        variant = "outline";
        content = "Skipped";
        break;
      case TestStatus.PENDING:
        variant = "outline";
        content = "Pending";
        break;
    }
    
    return <Badge variant={variant}>{content}</Badge>;
  };
  
  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">
              Test Run: {run.id}
            </h2>
            <p className="text-sm text-muted-foreground">
              Started: {new Date(run.startTime).toLocaleString()}
              {run.endTime && ` • Completed: ${new Date(run.endTime).toLocaleString()}`}
            </p>
          </div>
          
          {!run.inProgress && run.summary && (
            <div className="flex items-center space-x-2 mt-2 md:mt-0">
              <span className="text-green-500 font-semibold">{run.summary.passed} passed</span>
              <span className="text-red-500 font-semibold">{run.summary.failed} failed</span>
              <span className="text-muted-foreground">
                in {(run.summary.duration / 1000).toFixed(1)}s
              </span>
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              {run.inProgress ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-500" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              )}
              <span className="text-sm">
                {run.inProgress
                  ? `Running tests: ${completedTests} of ${counts.total} complete`
                  : 'Test run complete'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {progressPercentage.toFixed(0)}%
            </div>
          </div>
          
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs"
          >
            {showDetails ? "Hide Details" : "Show Details"}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedTests(
              expandedTests.length === Object.keys(run.results).length
                ? []
                : Object.keys(run.results)
            )}
            className="text-xs"
          >
            {expandedTests.length === Object.keys(run.results).length
              ? "Collapse All"
              : "Expand All"}
          </Button>
        </div>
      </div>
      
      {filteredResults.length > 0 ? (
        <div className="space-y-3">
          {filteredResults.map(([testId, result]) => {
            const testCase = allTestCases[testId];
            const isExpanded = expandedTests.includes(testId);
            
            if (!testCase) {
              return (
                <Card key={testId} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getStatusIcon(result.status)}
                        <span className="ml-2 font-medium">Unknown Test: {testId}</span>
                      </div>
                      {getStatusBadge(result.status)}
                    </div>
                  </CardContent>
                </Card>
              );
            }
            
            return (
              <Card key={testId} className="border">
                <CardContent className="p-4">
                  <div 
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => toggleExpandTest(testId)}
                  >
                    <div className="flex items-start">
                      <div className="pt-1 mr-3">
                        {getStatusIcon(result.status)}
                      </div>
                      
                      <div>
                        <h3 className="font-medium">
                          {testCase.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {testCase.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {testCase.component}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {testCase.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {testCase.severity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(result.status)}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-4 border-t pt-4">
                      <div className="flex justify-between mb-2">
                        <div className="text-sm">
                          <span className="font-medium">Status:</span>{' '}
                          {result.status}
                        </div>
                        
                        {result.duration !== undefined && (
                          <div className="text-sm text-muted-foreground">
                            Duration: {(result.duration / 1000).toFixed(2)}s
                          </div>
                        )}
                      </div>
                      
                      {result.message && (
                        <div className="mb-2 text-sm">
                          <span className="font-medium">Message:</span>{' '}
                          {result.message}
                        </div>
                      )}
                      
                      {result.assertionsTotal !== undefined && (
                        <div className="mb-2 text-sm">
                          <span className="font-medium">Assertions:</span>{' '}
                          <span className="text-green-500">
                            {result.assertionsPassed} passed
                          </span>
                          {result.assertionsFailed > 0 && (
                            <span className="text-red-500 ml-2">
                              {result.assertionsFailed} failed
                            </span>
                          )}
                          <span className="text-muted-foreground ml-2">
                            (total: {result.assertionsTotal})
                          </span>
                        </div>
                      )}
                      
                      {showDetails && result.details && (
                        <div className="mt-3 p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                          <pre>{JSON.stringify(result.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Filter className="h-12 w-12 mx-auto mb-4" />
          <p>No test results match the current filters</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              // Reset filter settings
            }}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
}