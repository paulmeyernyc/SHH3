/**
 * Schema Test Utility
 * 
 * This module provides utilities for testing validation schemas.
 */

import { ValidationSchema, ValidationContext, ValidationResult } from '../common/types';

/**
 * Test case for schema validation
 */
interface SchemaTestCase<T = any> {
  description: string;
  input: any;
  shouldPass: boolean;
  expectedErrors?: string[];
  context?: ValidationContext;
}

/**
 * Results of running schema tests
 */
interface SchemaTestResults {
  passed: number;
  failed: number;
  total: number;
  testCases: Array<{
    description: string;
    passed: boolean;
    errors?: string[];
  }>;
}

/**
 * Test a validation schema with a set of test cases
 */
export function testSchema<T>(
  schema: ValidationSchema<T>,
  testCases: SchemaTestCase<T>[]
): SchemaTestResults {
  const results: SchemaTestResults = {
    passed: 0,
    failed: 0,
    total: testCases.length,
    testCases: []
  };
  
  for (const testCase of testCases) {
    const result = schema.validate(testCase.input, testCase.context);
    
    const testPassed = result.success === testCase.shouldPass && (
      !testCase.expectedErrors || 
      testCase.expectedErrors.every(expectedError => 
        result.errors?.some(error => error.message.includes(expectedError))
      )
    );
    
    if (testPassed) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    results.testCases.push({
      description: testCase.description,
      passed: testPassed,
      errors: result.errors?.map(e => e.message)
    });
  }
  
  return results;
}

/**
 * Print test results to the console
 */
export function printTestResults(
  schemaName: string,
  results: SchemaTestResults
): void {
  console.log(`\n=== Test Results for ${schemaName} ===`);
  console.log(`Passed: ${results.passed}/${results.total}`);
  console.log(`Failed: ${results.failed}/${results.total}`);
  
  if (results.failed > 0) {
    console.log('\nFailed Test Cases:');
    results.testCases.forEach((testCase, index) => {
      if (!testCase.passed) {
        console.log(`\n${index + 1}. ${testCase.description}`);
        console.log('   Errors:', testCase.errors || 'None');
      }
    });
  }
  
  console.log('\n');
}

/**
 * Generate a test report
 */
export function generateTestReport(
  schemaName: string,
  results: SchemaTestResults
): string {
  let report = `# Validation Schema Test Report: ${schemaName}\n\n`;
  
  report += `## Summary\n`;
  report += `- **Total Tests**: ${results.total}\n`;
  report += `- **Passed**: ${results.passed}\n`;
  report += `- **Failed**: ${results.failed}\n`;
  report += `- **Pass Rate**: ${Math.round((results.passed / results.total) * 100)}%\n\n`;
  
  report += `## Test Cases\n\n`;
  
  results.testCases.forEach((testCase, index) => {
    report += `### ${index + 1}. ${testCase.description}\n`;
    report += `- **Result**: ${testCase.passed ? '✅ Passed' : '❌ Failed'}\n`;
    
    if (!testCase.passed && testCase.errors) {
      report += `- **Errors**:\n`;
      testCase.errors.forEach(error => {
        report += `  - ${error}\n`;
      });
    }
    
    report += '\n';
  });
  
  return report;
}