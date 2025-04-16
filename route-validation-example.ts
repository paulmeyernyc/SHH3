/**
 * Route Validation Example
 * 
 * This file demonstrates how to use the validation framework in Express routes.
 */

import { Router } from 'express';
import { validateBody, validateParams, validateQuery, createAuthContextFactory } from '../middleware/validation-middleware';
import { patientRecordSchema, providerSchema } from '../schemas/healthcare-schemas';
import { string, object, number, optional } from '../common/validators';
import { AppError } from '../../../microservices/common/error/app-error';
import { zodErrorToAppError } from '../../../microservices/common/error/zod-validation';
import { z } from 'zod';

// Create a router
const router = Router();

// Create an authentication context factory
const authContextFactory = createAuthContextFactory();

// Example: Simple ID parameter validation
const idParamSchema = object(
  {
    id: z.string().regex(/^\d+$/, 'ID must be numeric')
  },
  {
    id: 'id-param',
    name: 'ID Parameter',
    description: 'Validates a numeric ID parameter'
  }
);

// Example: Pagination query parameters validation
const paginationQuerySchema = object(
  {
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional().default('asc')
  },
  {
    id: 'pagination-query',
    name: 'Pagination Query',
    description: 'Validates pagination query parameters'
  }
);

// Example: Patient search query parameters
const patientSearchSchema = object(
  {
    name: z.string().optional(),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
    mrn: z.string().optional(),
    status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
    // Include pagination parameters
    ...paginationQuerySchema.zodSchema.shape
  },
  {
    id: 'patient-search-query',
    name: 'Patient Search Query',
    description: 'Validates patient search query parameters'
  }
);

/**
 * Example: Get Patient by ID
 * GET /patients/:id
 */
router.get(
  '/patients/:id',
  validateParams(idParamSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Example database query
      // const patient = await patientService.getPatientById(id);
      const patient = { id, name: 'Test Patient' }; // Placeholder
      
      if (!patient) {
        return next(AppError.resourceNotFound('Patient', id));
      }
      
      res.json(patient);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Example: Search Patients
 * GET /patients?name=&dob=&mrn=&status=&page=&limit=&sort=&order=
 */
router.get(
  '/patients',
  validateQuery(patientSearchSchema),
  async (req, res, next) => {
    try {
      const { name, dob, mrn, status, page, limit, sort, order } = req.query;
      
      // Example database query
      // const result = await patientService.searchPatients({ name, dob, mrn, status, page, limit, sort, order });
      const result = {
        data: [{ id: '1', name: 'Test Patient' }],
        pagination: { page, limit, total: 1, pages: 1 }
      }; // Placeholder
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Example: Create Patient
 * POST /patients
 */
router.post(
  '/patients',
  validateBody(patientRecordSchema, { contextFactory: authContextFactory }),
  async (req, res, next) => {
    try {
      const patientData = req.body;
      
      // Example database operation
      // const patient = await patientService.createPatient(patientData);
      const patient = { ...patientData, id: '123' }; // Placeholder
      
      res.status(201).json(patient);
    } catch (error) {
      // Handle specific errors
      if (error instanceof z.ZodError) {
        return next(zodErrorToAppError(error, 'Invalid patient data'));
      }
      next(error);
    }
  }
);

/**
 * Example: Update Patient
 * PUT /patients/:id
 */
router.put(
  '/patients/:id',
  validateParams(idParamSchema),
  validateBody(patientRecordSchema, { contextFactory: authContextFactory }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const patientData = req.body;
      
      // Example database operation
      // const patient = await patientService.updatePatient(id, patientData);
      const patient = { ...patientData, id }; // Placeholder
      
      res.json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(zodErrorToAppError(error, 'Invalid patient data'));
      }
      next(error);
    }
  }
);

/**
 * Example: Create Provider
 * POST /providers
 */
router.post(
  '/providers',
  validateBody(providerSchema, { contextFactory: authContextFactory }),
  async (req, res, next) => {
    try {
      const providerData = req.body;
      
      // Example database operation
      // const provider = await providerService.createProvider(providerData);
      const provider = { ...providerData, id: '123' }; // Placeholder
      
      res.status(201).json(provider);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(zodErrorToAppError(error, 'Invalid provider data'));
      }
      next(error);
    }
  }
);

export default router;