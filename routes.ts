/**
 * API Route Definitions
 * 
 * This file contains OpenAPI route definitions for the Smart Health Hub API.
 */

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and session management
 *   - name: Patients
 *     description: Patient management operations
 *   - name: Providers
 *     description: Healthcare provider management operations
 *   - name: Claims
 *     description: Insurance claim processing operations
 *   - name: FHIR
 *     description: FHIR resource management operations
 *   - name: Dashboard
 *     description: Dashboard statistics and visualization data
 *   - name: Cache
 *     description: Cache management operations
 *   - name: MCP
 *     description: Model Context Protocol operations
 *   - name: Service
 *     description: Service subscription management operations
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     sessionAuth:
 *       type: apiKey
 *       in: cookie
 *       name: connect.sid
 *       description: Session cookie for authentication
 */

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully returned user information
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Authenticate a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - username
 *               - password
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/logout:
 *   post:
 *     summary: Log out the current user
 *     tags: [Authentication]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 */

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully returned dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Get all patients
 *     tags: [Patients]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully returned patients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Patient'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a new patient
 *     tags: [Patients]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Patient'
 *     responses:
 *       201:
 *         description: Successfully created patient
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       400:
 *         description: Invalid patient data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Get patient by ID
 *     tags: [Patients]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Successfully returned patient
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Patient not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/providers:
 *   get:
 *     summary: Get all providers
 *     tags: [Providers]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully returned providers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Provider'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a new provider
 *     tags: [Providers]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Provider'
 *     responses:
 *       201:
 *         description: Successfully created provider
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Provider'
 *       400:
 *         description: Invalid provider data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/providers/search:
 *   get:
 *     summary: Search providers
 *     tags: [Providers]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Successfully returned providers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Provider'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/claims:
 *   get:
 *     summary: Get all claims
 *     tags: [Claims]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully returned claims
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Claim'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a new claim
 *     tags: [Claims]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Claim'
 *     responses:
 *       201:
 *         description: Successfully created claim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Claim'
 *       400:
 *         description: Invalid claim data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/claims/{id}:
 *   get:
 *     summary: Get claim by ID
 *     tags: [Claims]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Claim ID
 *     responses:
 *       200:
 *         description: Successfully returned claim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Claim'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Claim not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/fhir:
 *   get:
 *     summary: Get all FHIR resources
 *     tags: [FHIR]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully returned FHIR resources
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FhirResource'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a new FHIR resource
 *     tags: [FHIR]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FhirResource'
 *     responses:
 *       201:
 *         description: Successfully created FHIR resource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FhirResource'
 *       400:
 *         description: Invalid FHIR resource data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/fhir/with-patients:
 *   get:
 *     summary: Get FHIR resources with their linked patients
 *     tags: [FHIR]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully returned FHIR resources with patients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   resource:
 *                     $ref: '#/components/schemas/FhirResource'
 *                   patient:
 *                     $ref: '#/components/schemas/Patient'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/fhir/{id}:
 *   get:
 *     summary: Get FHIR resource by ID
 *     tags: [FHIR]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: FHIR resource ID
 *     responses:
 *       200:
 *         description: Successfully returned FHIR resource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FhirResource'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: FHIR resource not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/charts/claims:
 *   get:
 *     summary: Get claims chart data
 *     tags: [Dashboard]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully returned chart data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChartData'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/cache/clear:
 *   post:
 *     summary: Clear all caches (memory and Redis)
 *     tags: [Cache]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully cleared caches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/cache/redis-status:
 *   get:
 *     summary: Get Redis connection status and info
 *     tags: [Cache]
 *     responses:
 *       200:
 *         description: Successfully returned Redis status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 redisAvailable:
 *                   type: boolean
 *                 success:
 *                   type: boolean
 *                 redisEnabled:
 *                   type: boolean
 *                 redisUrl:
 *                   type: string
 *                 redisConfig:
 *                   type: object
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/fhir/r4:
 *   get:
 *     summary: FHIR R4 API
 *     description: FHIR R4 compatible API for healthcare data exchange
 *     tags: [FHIR]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully returned FHIR R4 resources
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/mcp:
 *   get:
 *     summary: Model Context Protocol API
 *     description: Integration framework for model context protocol
 *     tags: [MCP]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully returned MCP resources
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/service:
 *   get:
 *     summary: Service Subscription API
 *     description: Service management and connectivity
 *     tags: [Service]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully returned service resources
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */