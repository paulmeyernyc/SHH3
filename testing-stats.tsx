import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Layers,
  Bot
} from "lucide-react";
import { cn } from '@/lib/utils';

interface TestingStatsProps {
  totalSuites: number;
  totalTests: number;
  automatedTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  pendingTests: number;
}

export function TestingStats({
  totalSuites,
  totalTests,
  automatedTests,
  passedTests,
  failedTests,
  skippedTests,
  pendingTests
}: TestingStatsProps) {
  const automationRate = totalTests > 0 ? Math.round((automatedTests / totalTests) * 100) : 0;
  const passRate = (passedTests + failedTests) > 0 ? Math.round((passedTests / (passedTests + failedTests)) * 100) : 0;
  
  // Calculate tests with execution status (tests that have been run)
  const executedTests = passedTests + failedTests + skippedTests;
  const executionRate = totalTests > 0 ? Math.round((executedTests / totalTests) * 100) : 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-muted-foreground">Test Suites</h3>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold">{totalSuites}</span>
              <span className="text-sm text-muted-foreground">
                {totalTests} Test Cases
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-muted-foreground">Automation Rate</h3>
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold">{automationRate}%</span>
              <span className="text-sm text-muted-foreground">
                {automatedTests} / {totalTests} Automated
              </span>
            </div>
            <div className="w-full bg-secondary h-1.5 rounded-full mt-2">
              <div 
                className="bg-primary h-1.5 rounded-full" 
                style={{ width: `${automationRate}%` }} 
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-muted-foreground">Pass Rate</h3>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex justify-between items-baseline">
              <span className={cn(
                "text-2xl font-bold",
                passRate >= 90 ? "text-green-500" :
                passRate >= 70 ? "text-amber-500" :
                passRate > 0 ? "text-red-500" : ""
              )}>
                {passRate}%
              </span>
              <span className="text-sm text-muted-foreground">
                {executedTests} / {totalTests} Executed
              </span>
            </div>
            <div className="w-full bg-secondary h-1.5 rounded-full mt-2">
              <div 
                className={cn(
                  "h-1.5 rounded-full",
                  passRate >= 90 ? "bg-green-500" :
                  passRate >= 70 ? "bg-amber-500" :
                  "bg-red-500"
                )} 
                style={{ width: `${passRate}%` }} 
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-muted-foreground">Test Results</h3>
              <span className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{passedTests}</span>
                  <span className="text-xs text-muted-foreground">Passed</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{failedTests}</span>
                  <span className="text-xs text-muted-foreground">Failed</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{skippedTests}</span>
                  <span className="text-xs text-muted-foreground">Skipped</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{pendingTests}</span>
                  <span className="text-xs text-muted-foreground">Pending</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}