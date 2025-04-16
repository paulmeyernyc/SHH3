/**
 * Schema Test Example
 * 
 * This file demonstrates how to use the schema test utility to test validation schemas.
 */

import { testSchema, printTestResults, generateTestReport } from './schema-test-utility';
import { 
  patientRecordSchema, 
  diagnosisSchema, 
  providerSchema 
} from '../schemas/healthcare-schemas';
import { validateNPI } from '../rules';

// Example: Test the provider schema
const providerTestCases = [
  {
    description: 'Valid provider data should pass validation',
    input: {
      npi: '1234567893', // Valid NPI with correct check digit
      firstName: 'John',
      lastName: 'Smith',
      credentials: ['MD', 'PhD'],
      specialty: 'Cardiology',
      contactInfo: {
        phoneHome: '555-123-4567',
        email: 'john.smith@hospital.org',
        address: {
          line1: '123 Medical Center Dr',
          city: 'Healthville',
          state: 'CA',
          postalCode: '90210',
          country: 'US'
        }
      }
    },
    shouldPass: true
  },
  {
    description: 'Provider with invalid NPI should fail validation',
    input: {
      npi: '1234567890', // Invalid NPI (check digit wrong)
      firstName: 'Jane',
      lastName: 'Doe',
      specialty: 'Neurology'
    },
    shouldPass: false,
    expectedErrors: ['Invalid NPI format or check digit']
  },
  {
    description: 'Provider missing required fields should fail validation',
    input: {
      npi: '1234567893',
      firstName: 'James'
      // Missing lastName and specialty
    },
    shouldPass: false,
    expectedErrors: ['lastName', 'specialty']
  },
  {
    description: 'Provider with invalid email should fail validation',
    input: {
      npi: '1234567893',
      firstName: 'Robert',
      lastName: 'Johnson',
      specialty: 'Radiology',
      contactInfo: {
        email: 'not-a-valid-email'
      }
    },
    shouldPass: false,
    expectedErrors: ['email']
  }
];

// Example: Test the diagnosis schema
const diagnosisTestCases = [
  {
    description: 'Valid diagnosis should pass validation',
    input: {
      code: 'I25.10', // Valid ICD-10 code
      description: 'Atherosclerotic heart disease of native coronary artery without angina pectoris',
      diagnosisDate: '2023-05-15',
      diagnosedBy: '1234567893', // Valid NPI
      status: 'active'
    },
    shouldPass: true
  },
  {
    description: 'Diagnosis with invalid ICD-10 code should fail validation',
    input: {
      code: 'X123', // Invalid ICD-10 code format
      description: 'Test diagnosis',
      diagnosisDate: '2023-05-15'
    },
    shouldPass: false,
    expectedErrors: ['Invalid ICD-10 code format']
  },
  {
    description: 'Diagnosis with invalid status should fail validation',
    input: {
      code: 'I10',
      description: 'Essential (primary) hypertension',
      status: 'invalid-status' // Not a valid status value
    },
    shouldPass: false,
    expectedErrors: ['status']
  }
];

// Example: Run the tests
export function runValidationTests() {
  // Test provider schema
  console.log('Testing Provider Schema...');
  const providerResults = testSchema(providerSchema, providerTestCases);
  printTestResults('Provider Schema', providerResults);
  
  // Test diagnosis schema
  console.log('Testing Diagnosis Schema...');
  const diagnosisResults = testSchema(diagnosisSchema, diagnosisTestCases);
  printTestResults('Diagnosis Schema', diagnosisResults);
  
  // Generate and save a report (in a real implementation)
  const report = generateTestReport('Healthcare Schemas', {
    passed: providerResults.passed + diagnosisResults.passed,
    failed: providerResults.failed + diagnosisResults.failed,
    total: providerResults.total + diagnosisResults.total,
    testCases: [...providerResults.testCases, ...diagnosisResults.testCases]
  });
  
  console.log('Test report generated:', report.substring(0, 100) + '...');
  
  // In a real implementation, would save the report to a file
  // fs.writeFileSync('validation-test-report.md', report);
  
  return {
    providerResults,
    diagnosisResults
  };
}

// Example: Run the tests if this file is executed directly
if (require.main === module) {
  runValidationTests();
}