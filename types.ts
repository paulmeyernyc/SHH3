/**
 * Smart Health Hub Testing Framework Types
 */

export enum TestComponent {
  FHIR = "FHIR",
  PHR = "PHR",
  PATIENT_DIRECTORY = "Patient Directory",
  PROVIDER_DIRECTORY = "Provider Directory",
  USER_DIRECTORY = "User Directory",
  ORGANIZATION_DIRECTORY = "Organization Directory",
  CARE_EVENT = "Care Event",
  CLAIMS = "Claims",
  PRIOR_AUTH = "Prior Authorization",
  CONSENT = "Consent",
  BILLING = "Billing",
  ANALYTICS = "Analytics",
  INTEGRATION = "Integration",
  NETWORK = "Network",
  SECURITY = "Security",
  COMPLIANCE = "Compliance"
}

export enum TestCategory {
  FUNCTIONAL = "Functional",
  INTEGRATION = "Integration",
  PERFORMANCE = "Performance",
  SECURITY = "Security",
  COMPLIANCE = "Compliance",
  UI = "UI",
  ACCESSIBILITY = "Accessibility",
  API = "API",
  DATABASE = "Database"
}

export enum TestSeverity {
  CRITICAL = "Critical",
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low"
}

export enum TestStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  PASSED = "PASSED",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
  ERROR = "ERROR"
}

/**
 * Represents an individual test case
 */
export interface TestCase {
  id: string;
  name: string;
  description: string;
  component: TestComponent | string;
  category: TestCategory | string;
  severity: TestSeverity | string;
  tags?: string[];
  prerequisites?: string[];
  dependencies?: string[];
  steps?: string[];
  expectedResults?: string[];
  automated: boolean;
  estimatedDuration?: number; // in milliseconds
}

/**
 * Represents a collection of related test cases
 */
export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  testCases: TestCase[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Results of a specific test case
 */
export interface TestResult {
  status: TestStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
  message?: string;
  assertionsTotal?: number;
  assertionsPassed?: number;
  assertionsFailed?: number;
  details?: any;
  logs?: string[];
  error?: Error;
}

/**
 * Summary of a test run
 */
export interface TestRunSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number; // in milliseconds
  startTime: number;
  endTime: number;
}

/**
 * Represents the execution of test suites
 */
export interface TestRun {
  id: string;
  suiteId?: string; // For single suite run
  suiteIds?: string[]; // For multiple suite run
  startTime: number;
  endTime?: number;
  inProgress: boolean;
  results: Record<string, TestResult>; // Maps test case ID to result
  summary?: TestRunSummary;
  metadata?: Record<string, any>;
  tags?: string[];
}

/**
 * Configuration for a test run
 */
export interface TestRunConfig {
  suiteIds?: string[];
  suiteId?: string;
  testCaseIds?: string[];
  parallel?: boolean;
  maxConcurrency?: number;
  stopOnFailure?: boolean;
  timeout?: number; // in milliseconds
  retryCount?: number;
  tags?: string[];
  environment?: string;
  metadata?: Record<string, any>;
}

/**
 * Test assertions to validate test conditions
 */
export interface TestAssertion {
  condition: boolean;
  message: string;
  details?: any;
}

/**
 * Response from a test runner
 */
export interface TestRunnerResponse {
  success: boolean;
  testRunId: string;
  message?: string;
  error?: Error;
}