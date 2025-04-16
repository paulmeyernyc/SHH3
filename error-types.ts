/**
 * Error Types
 * 
 * Defines error codes and types used throughout the application.
 */

/**
 * Error codes for application errors
 */
export enum ErrorCode {
  // General errors (1xx)
  UNKNOWN_ERROR = '100',
  INTERNAL_SERVER_ERROR = '101',
  SERVICE_UNAVAILABLE = '102',
  BAD_REQUEST = '103',
  VALIDATION_ERROR = '104',
  RESOURCE_NOT_FOUND = '105',
  RESOURCE_ALREADY_EXISTS = '106',
  RESOURCE_CONFLICT = '107',
  TOO_MANY_REQUESTS = '108',
  
  // Authentication/Authorization errors (2xx)
  UNAUTHORIZED = '200',
  FORBIDDEN = '201',
  INVALID_CREDENTIALS = '202',
  ACCOUNT_LOCKED = '203',
  TOKEN_EXPIRED = '204',
  INVALID_TOKEN = '205',
  INSUFFICIENT_PERMISSIONS = '206',
  SESSION_EXPIRED = '207',
  MFA_REQUIRED = '208',
  MFA_INVALID = '209',
  
  // Data errors (3xx)
  DATA_INTEGRITY_ERROR = '300',
  DATA_VALIDATION_ERROR = '301',
  DUPLICATE_ENTITY = '302',
  FOREIGN_KEY_VIOLATION = '303',
  UNIQUE_CONSTRAINT_VIOLATION = '304',
  DATA_FORMAT_ERROR = '305',
  
  // External service errors (4xx)
  EXTERNAL_SERVICE_ERROR = '400',
  EXTERNAL_SERVICE_TIMEOUT = '401',
  EXTERNAL_SERVICE_UNAVAILABLE = '402',
  EXTERNAL_SERVICE_RESPONSE_ERROR = '403',
  API_LIMIT_EXCEEDED = '404',
  INVALID_API_KEY = '405',
  
  // Business logic errors (5xx)
  BUSINESS_RULE_VIOLATION = '500',
  BUSINESS_LOGIC_RULE_VIOLATION = '501',
  WORKFLOW_ERROR = '502',
  OPERATION_NOT_ALLOWED = '503',
  PRECONDITION_FAILED = '504',
  OPERATION_TIMEOUT = '505',
  
  // Healthcare specific errors (6xx)
  CLINICAL_VALIDATION_ERROR = '600',
  CLINICAL_WORKFLOW_ERROR = '601',
  CLINICAL_CONTRAINDICATION = '602',
  CLINICAL_DECISION_SUPPORT_ERROR = '603',
  FHIR_VALIDATION_ERROR = '604',
  CODING_SYSTEM_ERROR = '605',
  PHI_ACCESS_VIOLATION = '606',
  
  // Integration errors (7xx)
  INTEGRATION_ERROR = '700',
  INTEGRATION_CONFIGURATION_ERROR = '701',
  INTEGRATION_CONNECTION_ERROR = '702',
  INTEGRATION_AUTHENTICATION_ERROR = '703',
  INTEGRATION_RESPONSE_ERROR = '704',
  DATA_MAPPING_ERROR = '705',
  SCHEMA_MISMATCH_ERROR = '706',
  
  // Configuration errors (8xx)
  CONFIGURATION_ERROR = '800',
  ENVIRONMENT_ERROR = '801',
  FEATURE_FLAG_ERROR = '802',
  SETTING_NOT_FOUND = '803',
  INVALID_CONFIGURATION = '804',
  
  // System errors (9xx)
  SYSTEM_ERROR = '900',
  NETWORK_ERROR = '901',
  DATABASE_ERROR = '902',
  FILE_SYSTEM_ERROR = '903',
  MEMORY_ERROR = '904',
  CPU_ERROR = '905',
  DISK_ERROR = '906',
  IO_ERROR = '907',
  OS_ERROR = '908'
}

/**
 * Validation error codes
 */
export enum ValidationErrorCode {
  // Type validation errors
  INVALID_TYPE = 'invalid_type',
  REQUIRED = 'required',
  
  // String validation errors
  TOO_SHORT = 'too_short',
  TOO_LONG = 'too_long',
  INVALID_STRING = 'invalid_string',
  NOT_EMAIL = 'not_email',
  NOT_URL = 'not_url',
  NOT_UUID = 'not_uuid',
  PATTERN_MISMATCH = 'pattern_mismatch',
  
  // Number validation errors
  TOO_SMALL = 'too_small',
  TOO_BIG = 'too_big',
  NOT_INTEGER = 'not_integer',
  NOT_FINITE = 'not_finite',
  OUT_OF_RANGE = 'out_of_range',
  
  // Date validation errors
  INVALID_DATE = 'invalid_date',
  DATE_TOO_EARLY = 'date_too_early',
  DATE_TOO_LATE = 'date_too_late',
  
  // Array validation errors
  INVALID_ARRAY = 'invalid_array',
  ARRAY_TOO_SHORT = 'array_too_short',
  ARRAY_TOO_LONG = 'array_too_long',
  
  // Object validation errors
  INVALID_OBJECT = 'invalid_object',
  UNRECOGNIZED_KEYS = 'unrecognized_keys',
  MISSING_KEYS = 'missing_keys',
  
  // Domain-specific validation errors
  INVALID_ENUM_VALUE = 'invalid_enum_value',
  INVALID_ARGUMENTS = 'invalid_arguments',
  INVALID_RETURN_TYPE = 'invalid_return_type',
  INVALID_DATE_FORMAT = 'invalid_date_format',
  
  // Healthcare-specific validation errors
  INVALID_SSN = 'invalid_ssn',
  INVALID_NPI = 'invalid_npi',
  INVALID_ICD_CODE = 'invalid_icd_code',
  INVALID_CPT_CODE = 'invalid_cpt_code',
  INVALID_NDC_CODE = 'invalid_ndc_code',
  
  // Business rule validation errors
  BUSINESS_RULE_VIOLATION = 'business_rule_violation',
  
  // Custom validation errors
  CUSTOM = 'custom'
}