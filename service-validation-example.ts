/**
 * Service Validation Example
 * 
 * This file demonstrates how to use the validation framework in service layers.
 */

import { ValidationContext, ValidationResult } from '../common/types';
import { diagnosisSchema, medicationSchema } from '../schemas/healthcare-schemas';
import { createValidator, isValid, enhanceSchemaWithBusinessRules } from '../common/utils';
import { AppError } from '../../../microservices/common/error/app-error';
import { ErrorCode } from '../../../microservices/common/error/error-types';

// Example: Validate diagnosis in a service
export class DiagnosisService {
  // Standard validator based on schema
  private validateDiagnosis = createValidator(diagnosisSchema);
  
  // Enhanced schema with additional business rules
  private enhancedDiagnosisSchema = enhanceSchemaWithBusinessRules(
    diagnosisSchema,
    [
      {
        // Example business rule: Diagnosis must be appropriate for patient age
        validate: (diagnosis, context?: ValidationContext) => {
          // Get patient age from context (if available)
          if (!context?.patient?.age) return true;
          
          const patientAge = context.patient.age;
          
          // Example rule: Pediatric diagnoses shouldn't be applied to adults
          const isPediatricDiagnosis = ['F80.0', 'F80.1', 'F80.2', 'F84.0'].includes(diagnosis.code);
          if (isPediatricDiagnosis && patientAge >= 18) {
            return `Diagnosis code ${diagnosis.code} is typically used for pediatric patients`;
          }
          
          return true;
        },
        message: 'Diagnosis is not appropriate for patient age'
      },
      {
        // Example business rule: Invalid diagnosis combinations
        validate: (diagnosis, context?: ValidationContext) => {
          if (!context?.patient?.existingDiagnoses) return true;
          
          const existingDiagnoses = context.patient.existingDiagnoses as { code: string }[];
          
          // Example rule: Conflicting diagnoses
          const conflictingPairs = [
            ['I10', 'I11.0'], // Example conflicting codes
            ['E11.9', 'E10.9'] // Example conflicting codes
          ];
          
          for (const [code1, code2] of conflictingPairs) {
            if (diagnosis.code === code1 && existingDiagnoses.some(d => d.code === code2)) {
              return `Diagnosis ${code1} conflicts with existing diagnosis ${code2}`;
            }
            if (diagnosis.code === code2 && existingDiagnoses.some(d => d.code === code1)) {
              return `Diagnosis ${code2} conflicts with existing diagnosis ${code1}`;
            }
          }
          
          return true;
        },
        message: 'Conflicting diagnosis codes detected'
      }
    ]
  );
  
  // Context-aware validation
  private validateWithContext(diagnosis: any, patientContext: any): ValidationResult {
    // Create validation context with patient data
    const context: ValidationContext = {
      patient: {
        age: patientContext.age,
        gender: patientContext.gender,
        existingDiagnoses: patientContext.diagnoses || []
      },
      operation: {
        type: 'create',
        name: 'addDiagnosis'
      }
    };
    
    // Use enhanced schema with context
    return this.enhancedDiagnosisSchema.validate(diagnosis, context);
  }
  
  // Service method
  async addDiagnosis(patientId: string, diagnosis: any): Promise<any> {
    // Get patient data
    // const patient = await patientRepository.findById(patientId);
    const patient = { 
      id: patientId, 
      age: 45, 
      gender: 'female',
      diagnoses: [{ code: 'E11.9', description: 'Type 2 diabetes without complications' }]
    }; // Placeholder
    
    if (!patient) {
      throw AppError.resourceNotFound('Patient', patientId);
    }
    
    // Validate with context
    const validationResult = this.validateWithContext(diagnosis, patient);
    
    if (!validationResult.success) {
      // Create detailed validation error
      throw AppError.validation(
        validationResult.errors?.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          value: err.value
        })) || [],
        'Invalid diagnosis data'
      );
    }
    
    // Check for additional business rules (e.g., authorization rules)
    // if (!this.authorizationService.canAddDiagnosis(currentUser, patient)) {
    //   throw AppError.forbidden('You are not authorized to add diagnoses to this patient');
    // }
    
    // Process the validated diagnosis
    // const savedDiagnosis = await diagnosisRepository.create({ 
    //   patientId,
    //   ...validationResult.data
    // });
    const savedDiagnosis = { 
      id: '123', 
      patientId, 
      ...diagnosis 
    }; // Placeholder
    
    // Return the saved diagnosis
    return savedDiagnosis;
  }
}

// Example: Medication validation with cross-entity validation
export class MedicationService {
  // Create validator from schema
  private validateMedication = createValidator(medicationSchema);
  
  // Enhanced schema with additional interaction checks
  private enhancedMedicationSchema = enhanceSchemaWithBusinessRules(
    medicationSchema,
    [
      {
        // Example business rule: Check for drug-drug interactions
        validate: (medication, context?: ValidationContext) => {
          if (!context?.patient?.currentMedications) return true;
          
          const currentMedications = context.patient.currentMedications as string[];
          
          // Example interactions (simplified)
          const interactions: Record<string, string[]> = {
            'warfarin': ['aspirin', 'ibuprofen', 'naproxen'],
            'simvastatin': ['clarithromycin', 'erythromycin', 'itraconazole'],
            'methotrexate': ['trimethoprim', 'sulfamethoxazole'],
            // Add more interactions as needed
          };
          
          // Check if new medication has interactions with existing ones
          const medName = medication.name.toLowerCase();
          for (const [drug, interactsWith] of Object.entries(interactions)) {
            if (medName.includes(drug) && 
                currentMedications.some(med => 
                  interactsWith.some(interact => med.toLowerCase().includes(interact))
                )) {
              return `Potential interaction between ${drug} and existing medication detected`;
            }
            
            if (interactsWith.some(interact => medName.includes(interact)) &&
                currentMedications.some(med => med.toLowerCase().includes(drug))) {
              return `Potential interaction between ${medName} and existing ${drug} detected`;
            }
          }
          
          return true;
        },
        message: 'Potential drug interaction detected',
        code: ErrorCode.BUSINESS_LOGIC_RULE_VIOLATION
      },
      {
        // Example business rule: Check for allergies
        validate: (medication, context?: ValidationContext) => {
          if (!context?.patient?.allergies) return true;
          
          const allergies = context.patient.allergies as { substance: string, type: string }[];
          
          // Check if medication contains allergen
          const medName = medication.name.toLowerCase();
          for (const allergy of allergies) {
            if (allergy.type === 'medication' && 
                medName.includes(allergy.substance.toLowerCase())) {
              return `Patient has a documented allergy to ${allergy.substance}`;
            }
          }
          
          return true;
        },
        message: 'Medication conflicts with patient allergy',
        code: ErrorCode.CLINICAL_CONTRAINDICATION
      }
    ]
  );
  
  // Context-aware validation
  private validateWithContext(medication: any, patientContext: any): ValidationResult {
    // Create validation context with patient data
    const context: ValidationContext = {
      patient: {
        age: patientContext.age,
        gender: patientContext.gender,
        currentMedications: patientContext.activeMedications?.map((m: any) => m.name) || [],
        allergies: patientContext.allergies || []
      },
      operation: {
        type: 'create',
        name: 'prescribeMedication'
      }
    };
    
    // Use enhanced schema with context
    return this.enhancedMedicationSchema.validate(medication, context);
  }
  
  // Service method
  async prescribeMedication(patientId: string, medication: any, userId: string): Promise<any> {
    // Get patient data
    // const patient = await patientRepository.findById(patientId);
    const patient = { 
      id: patientId, 
      age: 45, 
      gender: 'female',
      activeMedications: [
        { id: '1', name: 'warfarin 5mg', dosage: '1 tablet daily' }
      ],
      allergies: [
        { substance: 'penicillin', type: 'medication', severity: 'severe' }
      ]
    }; // Placeholder
    
    if (!patient) {
      throw AppError.resourceNotFound('Patient', patientId);
    }
    
    // Get prescriber data
    // const prescriber = await providerRepository.findById(userId);
    const prescriber = { id: userId, name: 'Dr. Smith', npi: '1234567890' }; // Placeholder
    
    if (!prescriber) {
      throw AppError.resourceNotFound('Provider', userId);
    }
    
    // Validate medication with patient context
    const validationResult = this.validateWithContext(medication, patient);
    
    if (!validationResult.success) {
      // Create detailed validation error
      throw AppError.validation(
        validationResult.errors?.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          value: err.value
        })) || [],
        'Invalid medication data'
      );
    }
    
    // Process the validated medication
    // const savedMedication = await medicationRepository.create({ 
    //   patientId,
    //   prescribedBy: userId,
    //   ...validationResult.data
    // });
    const savedMedication = { 
      id: '123', 
      patientId, 
      prescribedBy: userId, 
      ...medication 
    }; // Placeholder
    
    // Return the saved medication
    return savedMedication;
  }
}