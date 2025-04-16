import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  PlayCircle, 
  FileSpreadsheet, 
  PencilLine,
  Trash2,
  Tag,
  Layers,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TestSuite, TestStatus } from '@/lib/testing/types';
import { cn } from '@/lib/utils';

interface TestSuiteCardProps {
  suite: TestSuite;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRunSuite?: () => void;
  onViewResults?: () => void;
  onEditSuite?: () => void;
  onDeleteSuite?: () => void;
  lastRunStatus?: Record<string, TestStatus>;
}

export function TestSuiteCard({ 
  suite, 
  isSelected, 
  onToggleSelect,
  onRunSuite,
  onViewResults,
  onEditSuite,
  onDeleteSuite,
  lastRunStatus 
}: TestSuiteCardProps) {
  const { id, name, description, tags = [], testCases, createdAt } = suite;
  
  // Calculate test case stats
  const totalTests = testCases.length;
  const automatedTests = testCases.filter(test => test.automated).length;
  const automationRate = totalTests > 0 ? Math.round((automatedTests / totalTests) * 100) : 0;
  
  // Calculate execution status if available
  const showResults = lastRunStatus && Object.keys(lastRunStatus).length > 0;
  let passedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  if (showResults) {
    testCases.forEach(test => {
      const status = lastRunStatus?.[test.id];
      if (status === TestStatus.PASSED) passedCount++;
      else if (status === TestStatus.FAILED) failedCount++;
      else if (status === TestStatus.PENDING) pendingCount++;
      else if (status === TestStatus.SKIPPED) skippedCount++;
      else if (status === TestStatus.ERROR) errorCount++;
    });
  }
  
  const hasExecutionStats = passedCount > 0 || failedCount > 0 || pendingCount > 0 || skippedCount > 0 || errorCount > 0;
  const passRate = totalTests > 0 ? Math.round((passedCount / totalTests) * 100) : 0;
  
  // Determine border color based on execution results
  let borderColorClass = '';
  if (isSelected) {
    borderColorClass = 'border-primary';
  } else if (hasExecutionStats) {
    if (failedCount > 0 || errorCount > 0) {
      borderColorClass = 'border-red-300';
    } else if (passedCount === totalTests) {
      borderColorClass = 'border-green-300';
    } else if (pendingCount > 0) {
      borderColorClass = 'border-amber-300';
    }
  }
  
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md", 
        borderColorClass,
        isSelected && "ring-2 ring-primary"
      )} 
      onClick={onToggleSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {name}
              {automatedTests > 0 && (
                <Bot className="h-4 w-4 text-primary" title={`${automatedTests} automated tests`} />
              )}
            </CardTitle>
            <CardDescription className="line-clamp-2 mt-1">{description}</CardDescription>
          </div>
          
          {isSelected && (
            <Badge variant="outline" className="bg-primary/10">Selected</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Test Cases:</span>
            </div>
            <span className="font-medium">{totalTests}</span>
          </div>
          
          {totalTests > 0 && (
            <div>
              <div className="flex justify-between mb-1 text-xs">
                <div className="flex items-center gap-1">
                  <Bot className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">Automation Rate</span>
                </div>
                <span>{automationRate}%</span>
              </div>
              <Progress 
                value={automationRate} 
                className="h-1.5 bg-secondary" 
                indicatorClassName="bg-primary" 
              />
            </div>
          )}
          
          {hasExecutionStats && (
            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-xs">
                <div className="space-x-4 flex">
                  {passedCount > 0 && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {passedCount}
                    </span>
                  )}
                  
                  {failedCount > 0 && (
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      {failedCount}
                    </span>
                  )}
                  
                  {pendingCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-500" />
                      {pendingCount}
                    </span>
                  )}
                  
                  {skippedCount > 0 && (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-blue-500" />
                      {skippedCount}
                    </span>
                  )}
                </div>
                
                <span className="text-muted-foreground">
                  Pass rate: {passRate}%
                </span>
              </div>
              
              <Progress 
                value={passRate} 
                className="h-1.5 bg-secondary" 
                indicatorClassName={cn(
                  passRate >= 90 ? "bg-green-500" : 
                  passRate >= 70 ? "bg-amber-500" : 
                  "bg-red-500"
                )} 
              />
            </div>
          )}
          
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs py-0 h-5">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
              
              {tags.length > 3 && (
                <Badge variant="secondary" className="text-xs py-0 h-5">
                  +{tags.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2">
        <div className="flex gap-1.5">
          {onRunSuite && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => { 
                e.stopPropagation(); 
                onRunSuite();
              }}
              className="h-8 px-2.5 text-xs"
            >
              <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
              Run
            </Button>
          )}
          
          {onViewResults && showResults && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => { 
                e.stopPropagation(); 
                onViewResults();
              }}
              className="h-8 px-2.5 text-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Results
            </Button>
          )}
        </div>
        
        <div className="flex gap-1.5">
          {onEditSuite && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { 
                e.stopPropagation(); 
                onEditSuite();
              }}
              className="h-8 w-8 p-0"
            >
              <PencilLine className="h-3.5 w-3.5" />
            </Button>
          )}
          
          {onDeleteSuite && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { 
                e.stopPropagation(); 
                onDeleteSuite();
              }}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}