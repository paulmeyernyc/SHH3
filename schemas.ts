/**
 * API Schema Definitions
 * 
 * This file contains OpenAPI schema definitions for the Smart Health Hub API.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Patient:
 *       type: object
 *       description: Patient information
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the patient
 *           example: 1
 *         firstName:
 *           type: string
 *           description: Patient's first name
 *           example: John
 *         lastName:
 *           type: string
 *           description: Patient's last name
 *           example: Doe
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: Patient's date of birth
 *           example: 1980-01-01
 *         gender:
 *           type: string
 *           description: Patient's gender
 *           enum: [male, female, other, unknown]
 *           example: male
 *         address:
 *           type: string
 *           description: Patient's address
 *           example: 123 Main St, Anytown, USA
 *         contactNumber:
 *           type: string
 *           description: Patient's contact number
 *           example: (555) 123-4567
 *         email:
 *           type: string
 *           format: email
 *           description: Patient's email address
 *           example: john.doe@example.com
 *         insuranceId:
 *           type: string
 *           description: Patient's insurance ID
 *           example: INS-12345
 *       required:
 *         - firstName
 *         - lastName
 *         - dateOfBirth
 * 
 *     Provider:
 *       type: object
 *       description: Healthcare provider information
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the provider
 *           example: 1
 *         name:
 *           type: string
 *           description: Provider's name
 *           example: Dr. Jane Smith
 *         specialty:
 *           type: string
 *           description: Provider's medical specialty
 *           example: Cardiology
 *         npi:
 *           type: string
 *           description: National Provider Identifier
 *           example: 1234567890
 *         address:
 *           type: string
 *           description: Provider's address
 *           example: 456 Hospital Dr, Anytown, USA
 *         contactNumber:
 *           type: string
 *           description: Provider's contact number
 *           example: (555) 987-6543
 *         email:
 *           type: string
 *           format: email
 *           description: Provider's email address
 *           example: dr.smith@example.com
 *       required:
 *         - name
 *         - specialty
 *         - npi
 * 
 *     Claim:
 *       type: object
 *       description: Insurance claim information
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the claim
 *           example: 1
 *         patientId:
 *           type: integer
 *           description: ID of the patient associated with the claim
 *           example: 1
 *         providerId:
 *           type: integer
 *           description: ID of the provider associated with the claim
 *           example: 1
 *         claimNumber:
 *           type: string
 *           description: Unique claim number
 *           example: CLM-12345
 *         serviceDate:
 *           type: string
 *           format: date
 *           description: Date of service
 *           example: 2023-01-15
 *         submissionDate:
 *           type: string
 *           format: date
 *           description: Date the claim was submitted
 *           example: 2023-01-20
 *         status:
 *           type: string
 *           description: Status of the claim
 *           enum: [Pending, In Review, Approved, Denied]
 *           example: Pending
 *         totalAmount:
 *           type: number
 *           format: float
 *           description: Total amount of the claim
 *           example: 1250.50
 *         description:
 *           type: string
 *           description: Description of services provided
 *           example: Annual physical examination with lab work
 *       required:
 *         - patientId
 *         - providerId
 *         - serviceDate
 *         - totalAmount
 * 
 *     FhirResource:
 *       type: object
 *       description: FHIR resource information
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the FHIR resource
 *           example: 1
 *         resourceType:
 *           type: string
 *           description: Type of FHIR resource
 *           enum: [Patient, Practitioner, Observation, MedicationRequest, Condition]
 *           example: Patient
 *         resourceId:
 *           type: string
 *           description: ID of the resource within the FHIR system
 *           example: patient-123
 *         patientId:
 *           type: integer
 *           description: ID of the patient associated with the resource
 *           example: 1
 *         version:
 *           type: string
 *           description: Version of the FHIR resource
 *           example: 1.0.0
 *         data:
 *           type: object
 *           description: The FHIR resource data in JSON format
 *       required:
 *         - resourceType
 *         - resourceId
 *         - patientId
 *         - data
 * 
 *     StatsResponse:
 *       type: object
 *       description: Dashboard statistics
 *       properties:
 *         activePatients:
 *           type: integer
 *           description: Number of active patients
 *           example: 150
 *         pendingClaims:
 *           type: integer
 *           description: Number of pending claims
 *           example: 25
 *         providers:
 *           type: integer
 *           description: Number of providers
 *           example: 35
 *         approvedAuth:
 *           type: string
 *           description: Percentage of approved authorizations
 *           example: 89%
 * 
 *     ChartData:
 *       type: object
 *       description: Chart data for visualization
 *       properties:
 *         labels:
 *           type: array
 *           description: Labels for the chart
 *           items:
 *             type: string
 *           example: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
 *         datasets:
 *           type: array
 *           description: Datasets for the chart
 *           items:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *                 description: Label for the dataset
 *                 example: Submitted Claims
 *               data:
 *                 type: array
 *                 description: Data points for the dataset
 *                 items:
 *                   type: number
 *                 example: [65, 78, 90, 85, 95, 110, 125]
 * 
 *     Error:
 *       type: object
 *       description: Error response
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 *           example: Resource not found
 *         errors:
 *           type: array
 *           description: Detailed error information (for validation errors)
 *           items:
 *             type: object
 */