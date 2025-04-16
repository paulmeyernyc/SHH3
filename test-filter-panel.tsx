import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Search, 
  RefreshCw, 
  Filter, 
  CaseSensitive, 
  Tags,
  ArrowDownAZ
} from "lucide-react";
import { TestComponent, TestCategory, TestSeverity } from '@/lib/testing/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface TestFilterPanelProps {
  testSuites: any[];
  selectedSuites: string[];
  setSelectedSuites: (suites: string[]) => void;
  selectedComponent: string | null;
  setSelectedComponent: (component: string | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedSeverity: string | null;
  setSelectedSeverity: (severity: string | null) => void;
  showPassed: boolean;
  setShowPassed: (show: boolean) => void;
  showFailed: boolean;
  setShowFailed: (show: boolean) => void;
  showSkipped: boolean;
  setShowSkipped: (show: boolean) => void;
  onlyAutomated: boolean;
  setOnlyAutomated: (automated: boolean) => void;
}

export function TestFilterPanel({ 
  testSuites,
  selectedSuites,
  setSelectedSuites,
  selectedComponent,
  setSelectedComponent,
  selectedCategory,
  setSelectedCategory,
  selectedSeverity,
  setSelectedSeverity,
  showPassed,
  setShowPassed,
  showFailed,
  setShowFailed,
  showSkipped,
  setShowSkipped,
  onlyAutomated,
  setOnlyAutomated
}: TestFilterPanelProps) {
  // Internal state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Extract available components, categories, and severities from test suites
  const availableComponents = new Set<string>();
  const availableCategories = new Set<string>();
  const availableSeverities = new Set<string>();
  
  testSuites.forEach(suite => {
    suite.testCases.forEach((testCase: any) => {
      if (testCase.component) availableComponents.add(testCase.component);
      if (testCase.category) availableCategories.add(testCase.category);
      if (testCase.severity) availableSeverities.add(testCase.severity);
    });
  });
  
  // Use enum values as fallback if no values are extracted from test suites
  const components = availableComponents.size > 0 
    ? Array.from(availableComponents) 
    : Object.values(TestComponent);
  
  const categories = availableCategories.size > 0 
    ? Array.from(availableCategories) 
    : Object.values(TestCategory);
  
  const severities = availableSeverities.size > 0 
    ? Array.from(availableSeverities) 
    : Object.values(TestSeverity);
  
  // Filter handling
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedComponent(null);
    setSelectedCategory(null);
    setSelectedSeverity(null);
    setOnlyAutomated(false);
    setShowPassed(true);
    setShowFailed(true);
    setShowSkipped(true);
  };
  
  const refreshTests = () => {
    // Just a placeholder - in real implementation this would trigger a refresh
    console.log("Refreshing tests...");
  };
  // Helper methods
  const handleComponentToggle = (component: string) => {
    setSelectedComponent(selectedComponent === component ? null : component);
  };
  
  const handleCategoryToggle = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };
  
  const handleSeverityToggle = (severity: string) => {
    setSelectedSeverity(selectedSeverity === severity ? null : severity);
  };
  
  const handleSuiteToggle = (suiteId: string) => {
    if (selectedSuites.includes(suiteId)) {
      setSelectedSuites(selectedSuites.filter(id => id !== suiteId));
    } else {
      setSelectedSuites([...selectedSuites, suiteId]);
    }
  };
  
  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tests by name or description..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={refreshTests} 
            variant="outline" 
            size="icon" 
            className="h-10 w-10"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button 
            onClick={handleResetFilters} 
            variant="outline" 
            size="sm" 
            className="h-10"
          >
            Clear Filters
          </Button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center space-x-2 mr-4">
          <Switch
            id="automation-filter"
            checked={onlyAutomated}
            onCheckedChange={setOnlyAutomated}
          />
          <Label htmlFor="automation-filter">Automated only</Label>
        </div>
        
        <div className="flex items-center space-x-2 mr-4">
          <Switch
            id="passed-filter"
            checked={showPassed}
            onCheckedChange={setShowPassed}
          />
          <Label htmlFor="passed-filter">Show Passed</Label>
        </div>
        
        <div className="flex items-center space-x-2 mr-4">
          <Switch
            id="failed-filter"
            checked={showFailed}
            onCheckedChange={setShowFailed}
          />
          <Label htmlFor="failed-filter">Show Failed</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="skipped-filter"
            checked={showSkipped}
            onCheckedChange={setShowSkipped}
          />
          <Label htmlFor="skipped-filter">Show Skipped</Label>
        </div>
      </div>
      
      <Accordion type="multiple" className="w-full">
        <AccordionItem value="suites">
          <AccordionTrigger className="text-sm font-medium py-2">
            <div className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Test Suites
              {selectedSuites.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {selectedSuites.length}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 gap-2 pt-2">
              {testSuites.map((suite) => (
                <div key={suite.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`suite-${suite.id}`}
                    checked={selectedSuites.includes(suite.id)}
                    onCheckedChange={() => handleSuiteToggle(suite.id)}
                  />
                  <Label
                    htmlFor={`suite-${suite.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {suite.name}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="components">
          <AccordionTrigger className="text-sm font-medium py-2">
            <div className="flex items-center gap-2">
              <CaseSensitive className="h-4 w-4" />
              Filter by Component
              {selectedComponent && (
                <Badge variant="outline" className="ml-2">1</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
              {components.map((component) => (
                <div key={component} className="flex items-center space-x-2">
                  <Checkbox
                    id={`component-${component}`}
                    checked={selectedComponent === component}
                    onCheckedChange={() => handleComponentToggle(component)}
                  />
                  <Label
                    htmlFor={`component-${component}`}
                    className="text-sm cursor-pointer"
                  >
                    {component}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="categories">
          <AccordionTrigger className="text-sm font-medium py-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter by Category
              {selectedCategory && (
                <Badge variant="outline" className="ml-2">1</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
              {categories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={selectedCategory === category}
                    onCheckedChange={() => handleCategoryToggle(category)}
                  />
                  <Label
                    htmlFor={`category-${category}`}
                    className="text-sm cursor-pointer"
                  >
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="severities">
          <AccordionTrigger className="text-sm font-medium py-2">
            <div className="flex items-center gap-2">
              <ArrowDownAZ className="h-4 w-4" />
              Filter by Severity
              {selectedSeverity && (
                <Badge variant="outline" className="ml-2">1</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-2 pt-2">
              {severities.map((severity) => {
                const isSelected = selectedSeverity === severity;
                let badgeClass = "bg-secondary text-secondary-foreground hover:bg-secondary/80";
                
                if (isSelected) {
                  switch (severity) {
                    case 'Critical':
                      badgeClass = "bg-red-500 text-white hover:bg-red-600";
                      break;
                    case 'High':
                      badgeClass = "bg-orange-500 text-white hover:bg-orange-600";
                      break;
                    case 'Medium':
                      badgeClass = "bg-amber-500 text-white hover:bg-amber-600";
                      break;
                    case 'Low':
                      badgeClass = "bg-blue-500 text-white hover:bg-blue-600";
                      break;
                  }
                }
                
                return (
                  <Badge
                    key={severity}
                    className={`cursor-pointer ${badgeClass}`}
                    onClick={() => handleSeverityToggle(severity)}
                  >
                    {severity}
                  </Badge>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      {(selectedComponent || selectedCategory || selectedSeverity || onlyAutomated || 
        !showPassed || !showFailed || !showSkipped || selectedSuites.length > 0) && (
        <div className="pt-2">
          <div className="text-sm font-medium mb-2 flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Active Filters:
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedSuites.map(suiteId => {
              const suite = testSuites.find(s => s.id === suiteId);
              return (
                <Badge key={suiteId} variant="secondary" className="flex gap-1 items-center">
                  Suite: {suite?.name || suiteId}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                    onClick={() => handleSuiteToggle(suiteId)}
                  >
                    ×
                  </Button>
                </Badge>
              );
            })}
            
            {selectedComponent && (
              <Badge variant="secondary" className="flex gap-1 items-center">
                Component: {selectedComponent}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedComponent(null)}
                >
                  ×
                </Button>
              </Badge>
            )}
            
            {selectedCategory && (
              <Badge variant="secondary" className="flex gap-1 items-center">
                Category: {selectedCategory}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedCategory(null)}
                >
                  ×
                </Button>
              </Badge>
            )}
            
            {selectedSeverity && (
              <Badge variant="secondary" className="flex gap-1 items-center">
                Severity: {selectedSeverity}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedSeverity(null)}
                >
                  ×
                </Button>
              </Badge>
            )}
            
            {onlyAutomated && (
              <Badge variant="secondary" className="flex gap-1 items-center">
                Automated Only
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setOnlyAutomated(false)}
                >
                  ×
                </Button>
              </Badge>
            )}
            
            {!showPassed && (
              <Badge variant="secondary" className="flex gap-1 items-center">
                Hide Passed
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassed(true)}
                >
                  ×
                </Button>
              </Badge>
            )}
            
            {!showFailed && (
              <Badge variant="secondary" className="flex gap-1 items-center">
                Hide Failed
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowFailed(true)}
                >
                  ×
                </Button>
              </Badge>
            )}
            
            {!showSkipped && (
              <Badge variant="secondary" className="flex gap-1 items-center">
                Hide Skipped
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSkipped(true)}
                >
                  ×
                </Button>
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}