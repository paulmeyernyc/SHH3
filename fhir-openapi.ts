/**
 * FHIR OpenAPI Documentation Generator
 * 
 * This module provides functionality to generate OpenAPI documentation
 * specifically for FHIR resources.
 */

/**
 * Generate OpenAPI components for FHIR resources
 */
export function generateFhirResourceComponents(resourceTypes: string[]): Record<string, any> {
  const schemas: Record<string, any> = {};
  
  // Common identifier structure used across resources
  schemas.Identifier = {
    type: 'object',
    properties: {
      use: {
        type: 'string',
        enum: ['usual', 'official', 'temp', 'secondary', 'old'],
        description: 'The purpose of this identifier',
      },
      type: {
        type: 'object',
        description: 'Type for this identifier',
      },
      system: {
        type: 'string',
        description: 'The namespace for the identifier value',
      },
      value: {
        type: 'string',
        description: 'The value that is unique within the system',
      },
      period: {
        type: 'object',
        description: 'Time period when id is/was valid for use',
      },
      assigner: {
        type: 'object',
        description: 'Organization that issued id',
      },
    },
  };
  
  // Common coding structure
  schemas.Coding = {
    type: 'object',
    properties: {
      system: {
        type: 'string',
        description: 'Identity of the terminology system',
      },
      version: {
        type: 'string',
        description: 'Version of the system',
      },
      code: {
        type: 'string',
        description: 'Symbol in syntax defined by the system',
      },
      display: {
        type: 'string',
        description: 'Representation defined by the system',
      },
      userSelected: {
        type: 'boolean',
        description: 'If this coding was chosen directly by the user',
      },
    },
  };
  
  // Common CodeableConcept structure
  schemas.CodeableConcept = {
    type: 'object',
    properties: {
      coding: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Coding',
        },
        description: 'Code defined by a terminology system',
      },
      text: {
        type: 'string',
        description: 'Plain text representation of the concept',
      },
    },
  };
  
  // Human Name structure
  schemas.HumanName = {
    type: 'object',
    properties: {
      use: {
        type: 'string',
        enum: ['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden'],
        description: 'The purpose of this name',
      },
      text: {
        type: 'string',
        description: 'Text representation of the full name',
      },
      family: {
        type: 'string',
        description: 'Family name (often called "Surname")',
      },
      given: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Given names (first names)',
      },
      prefix: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Parts that come before the name',
      },
      suffix: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Parts that come after the name',
      },
      period: {
        type: 'object',
        description: 'Time period when name was/is in use',
      },
    },
  };
  
  // Address structure
  schemas.Address = {
    type: 'object',
    properties: {
      use: {
        type: 'string',
        enum: ['home', 'work', 'temp', 'old', 'billing'],
        description: 'home | work | temp | old | billing',
      },
      type: {
        type: 'string',
        enum: ['postal', 'physical', 'both'],
        description: 'postal | physical | both',
      },
      text: {
        type: 'string',
        description: 'Text representation of the address',
      },
      line: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Street name, number, etc.',
      },
      city: {
        type: 'string',
        description: 'Name of city, town, etc.',
      },
      district: {
        type: 'string',
        description: 'District name',
      },
      state: {
        type: 'string',
        description: 'Sub-unit of country (abbreviations ok)',
      },
      postalCode: {
        type: 'string',
        description: 'Postal code for area',
      },
      country: {
        type: 'string',
        description: 'Country (e.g. can be ISO 3166 2 or 3 letter code)',
      },
      period: {
        type: 'object',
        description: 'Time period when address was/is in use',
      },
    },
  };
  
  // ContactPoint structure
  schemas.ContactPoint = {
    type: 'object',
    properties: {
      system: {
        type: 'string',
        enum: ['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'],
        description: 'Type of contact point',
      },
      value: {
        type: 'string',
        description: 'The actual contact point details',
      },
      use: {
        type: 'string',
        enum: ['home', 'work', 'temp', 'old', 'mobile'],
        description: 'Purpose of this contact point',
      },
      rank: {
        type: 'integer',
        description: 'Specify preferred order of use',
      },
      period: {
        type: 'object',
        description: 'Time period when the contact point was/is in use',
      },
    },
  };
  
  // Reference structure
  schemas.Reference = {
    type: 'object',
    properties: {
      reference: {
        type: 'string',
        description: 'Literal reference, Relative, internal or absolute URL',
      },
      type: {
        type: 'string',
        description: 'Type the reference refers to',
      },
      identifier: {
        $ref: '#/components/schemas/Identifier',
        description: 'Logical reference, when literal reference is not known',
      },
      display: {
        type: 'string',
        description: 'Text alternative for the resource',
      },
    },
  };
  
  // Period structure
  schemas.Period = {
    type: 'object',
    properties: {
      start: {
        type: 'string',
        format: 'date-time',
        description: 'Starting time with inclusive boundary',
      },
      end: {
        type: 'string',
        format: 'date-time',
        description: 'End time with inclusive boundary',
      },
    },
  };

  // Add resource-specific schemas based on the provided resource types
  resourceTypes.forEach(resourceType => {
    switch (resourceType) {
      case 'Patient':
        schemas.Patient = {
          type: 'object',
          description: 'FHIR Patient Resource',
          properties: {
            resourceType: {
              type: 'string',
              enum: ['Patient'],
              description: 'Type of resource',
            },
            id: {
              type: 'string',
              description: 'Logical id of this artifact',
            },
            meta: {
              type: 'object',
              description: 'Metadata about the resource',
            },
            identifier: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Identifier',
              },
              description: 'An identifier for this patient',
            },
            active: {
              type: 'boolean',
              description: 'Whether this patient record is in active use',
            },
            name: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/HumanName',
              },
              description: 'A name associated with the individual',
            },
            telecom: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ContactPoint',
              },
              description: 'A contact detail for the individual',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other', 'unknown'],
              description: 'male | female | other | unknown',
            },
            birthDate: {
              type: 'string',
              format: 'date',
              description: 'The date of birth for the individual',
            },
            address: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Address',
              },
              description: 'An address for the individual',
            },
          },
          required: ['resourceType'],
        };
        break;
        
      case 'Practitioner':
        schemas.Practitioner = {
          type: 'object',
          description: 'FHIR Practitioner Resource',
          properties: {
            resourceType: {
              type: 'string',
              enum: ['Practitioner'],
              description: 'Type of resource',
            },
            id: {
              type: 'string',
              description: 'Logical id of this artifact',
            },
            meta: {
              type: 'object',
              description: 'Metadata about the resource',
            },
            identifier: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Identifier',
              },
              description: 'An identifier for the practitioner',
            },
            active: {
              type: 'boolean',
              description: 'Whether this practitioner record is in active use',
            },
            name: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/HumanName',
              },
              description: 'The name(s) associated with the practitioner',
            },
            telecom: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ContactPoint',
              },
              description: 'A contact detail for the practitioner',
            },
            address: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Address',
              },
              description: 'Address(es) of the practitioner',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other', 'unknown'],
              description: 'male | female | other | unknown',
            },
            birthDate: {
              type: 'string',
              format: 'date',
              description: 'The date of birth for the practitioner',
            },
            qualification: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  identifier: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Identifier',
                    },
                    description: 'An identifier for this qualification for the practitioner',
                  },
                  code: {
                    $ref: '#/components/schemas/CodeableConcept',
                    description: 'Coded representation of the qualification',
                  },
                  period: {
                    $ref: '#/components/schemas/Period',
                    description: 'Period during which the qualification is valid',
                  },
                  issuer: {
                    $ref: '#/components/schemas/Reference',
                    description: 'Organization that issued the qualification',
                  },
                },
              },
              description: 'Qualifications obtained by training and certification',
            },
          },
          required: ['resourceType'],
        };
        break;
        
      case 'Organization':
        schemas.Organization = {
          type: 'object',
          description: 'FHIR Organization Resource',
          properties: {
            resourceType: {
              type: 'string',
              enum: ['Organization'],
              description: 'Type of resource',
            },
            id: {
              type: 'string',
              description: 'Logical id of this artifact',
            },
            meta: {
              type: 'object',
              description: 'Metadata about the resource',
            },
            identifier: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Identifier',
              },
              description: 'An identifier for the organization',
            },
            active: {
              type: 'boolean',
              description: 'Whether the organization record is in active use',
            },
            type: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CodeableConcept',
              },
              description: 'Kind of organization',
            },
            name: {
              type: 'string',
              description: 'Name used for the organization',
            },
            alias: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'A list of alternate names that the organization is known as',
            },
            telecom: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ContactPoint',
              },
              description: 'A contact detail for the organization',
            },
            address: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Address',
              },
              description: 'An address for the organization',
            },
            partOf: {
              $ref: '#/components/schemas/Reference',
              description: 'The organization of which this organization forms a part',
            },
          },
          required: ['resourceType'],
        };
        break;
        
      case 'Encounter':
        schemas.Encounter = {
          type: 'object',
          description: 'FHIR Encounter Resource',
          properties: {
            resourceType: {
              type: 'string',
              enum: ['Encounter'],
              description: 'Type of resource',
            },
            id: {
              type: 'string',
              description: 'Logical id of this artifact',
            },
            status: {
              type: 'string',
              enum: ['planned', 'arrived', 'triaged', 'in-progress', 'onleave', 'finished', 'cancelled', 'entered-in-error', 'unknown'],
              description: 'Status of the encounter',
            },
            class: {
              $ref: '#/components/schemas/Coding',
              description: 'Classification of patient encounter',
            },
            type: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CodeableConcept',
              },
              description: 'Specific type of encounter',
            },
            subject: {
              $ref: '#/components/schemas/Reference',
              description: 'The patient present at the encounter',
            },
            participant: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/CodeableConcept',
                    },
                    description: 'Role of participant in encounter',
                  },
                  period: {
                    $ref: '#/components/schemas/Period',
                    description: 'Period of time during the encounter that the participant participated',
                  },
                  individual: {
                    $ref: '#/components/schemas/Reference',
                    description: 'Persons involved in the encounter other than the patient',
                  },
                },
              },
              description: 'List of participants involved in the encounter',
            },
            period: {
              $ref: '#/components/schemas/Period',
              description: 'The start and end time of the encounter',
            },
            reasonCode: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CodeableConcept',
              },
              description: 'Coded reason the encounter takes place',
            },
            hospitalization: {
              type: 'object',
              properties: {
                admitSource: {
                  $ref: '#/components/schemas/CodeableConcept',
                  description: 'From where patient was admitted',
                },
                dischargeDisposition: {
                  $ref: '#/components/schemas/CodeableConcept',
                  description: 'Category or kind of location after discharge',
                },
              },
              description: 'Details about the admission to a healthcare service',
            },
            location: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  location: {
                    $ref: '#/components/schemas/Reference',
                    description: 'Location the encounter takes place',
                  },
                  status: {
                    type: 'string',
                    enum: ['planned', 'active', 'reserved', 'completed'],
                    description: 'Status of the location',
                  },
                  period: {
                    $ref: '#/components/schemas/Period',
                    description: 'Time period during which the patient was present at the location',
                  },
                },
              },
              description: 'List of locations where the patient has been',
            },
          },
          required: ['resourceType', 'status'],
        };
        break;
        
      case 'Observation':
        schemas.Observation = {
          type: 'object',
          description: 'FHIR Observation Resource',
          properties: {
            resourceType: {
              type: 'string',
              enum: ['Observation'],
              description: 'Type of resource',
            },
            id: {
              type: 'string',
              description: 'Logical id of this artifact',
            },
            status: {
              type: 'string',
              enum: ['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown'],
              description: 'Status of the observation',
            },
            category: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CodeableConcept',
              },
              description: 'Classification of type of observation',
            },
            code: {
              $ref: '#/components/schemas/CodeableConcept',
              description: 'Type of observation',
            },
            subject: {
              $ref: '#/components/schemas/Reference',
              description: 'Who and/or what the observation is about',
            },
            encounter: {
              $ref: '#/components/schemas/Reference',
              description: 'Healthcare event during which this observation was made',
            },
            effectiveDateTime: {
              type: 'string',
              format: 'date-time',
              description: 'Clinically relevant time/time-period for observation',
            },
            effectivePeriod: {
              $ref: '#/components/schemas/Period',
              description: 'Clinically relevant time/time-period for observation',
            },
            issued: {
              type: 'string',
              format: 'date-time',
              description: 'Date/Time this version was made available',
            },
            performer: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Reference',
              },
              description: 'Who is responsible for the observation',
            },
            valueQuantity: {
              type: 'object',
              properties: {
                value: {
                  type: 'number',
                  description: 'Numerical value',
                },
                unit: {
                  type: 'string',
                  description: 'Unit representation',
                },
                system: {
                  type: 'string',
                  description: 'System that defines coded unit form',
                },
                code: {
                  type: 'string',
                  description: 'Coded form of the unit',
                },
              },
              description: 'Actual result as quantity',
            },
            valueString: {
              type: 'string',
              description: 'Actual result as text',
            },
            valueBoolean: {
              type: 'boolean',
              description: 'Actual result as boolean',
            },
            valueCodeableConcept: {
              $ref: '#/components/schemas/CodeableConcept',
              description: 'Actual result as coded value',
            },
            interpretation: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CodeableConcept',
              },
              description: 'High, low, normal, etc.',
            },
            note: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string',
                    description: 'The note text',
                  },
                },
              },
              description: 'Comments about the observation',
            },
            bodySite: {
              $ref: '#/components/schemas/CodeableConcept',
              description: 'Observed body part',
            },
            method: {
              $ref: '#/components/schemas/CodeableConcept',
              description: 'How it was done',
            },
            specimen: {
              $ref: '#/components/schemas/Reference',
              description: 'Specimen used for this observation',
            },
            device: {
              $ref: '#/components/schemas/Reference',
              description: 'Device used to generate the observation data',
            },
            referenceRange: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  low: {
                    type: 'object',
                    description: 'Low Range',
                  },
                  high: {
                    type: 'object',
                    description: 'High Range',
                  },
                  type: {
                    $ref: '#/components/schemas/CodeableConcept',
                    description: 'Type of reference range',
                  },
                  appliesTo: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/CodeableConcept',
                    },
                    description: 'Reference range population',
                  },
                  age: {
                    type: 'object',
                    description: 'Applicable age range, if relevant',
                  },
                  text: {
                    type: 'string',
                    description: 'Text based reference range',
                  },
                },
              },
              description: 'Provides guide for interpretation',
            },
          },
          required: ['resourceType', 'status', 'code'],
        };
        break;
        
      case 'MedicationRequest':
        schemas.MedicationRequest = {
          type: 'object',
          description: 'FHIR MedicationRequest Resource',
          properties: {
            resourceType: {
              type: 'string',
              enum: ['MedicationRequest'],
              description: 'Type of resource',
            },
            id: {
              type: 'string',
              description: 'Logical id of this artifact',
            },
            status: {
              type: 'string',
              enum: ['active', 'on-hold', 'cancelled', 'completed', 'entered-in-error', 'stopped', 'draft', 'unknown'],
              description: 'Status of the prescription',
            },
            intent: {
              type: 'string',
              enum: ['proposal', 'plan', 'order', 'original-order', 'reflex-order', 'filler-order', 'instance-order', 'option'],
              description: 'Whether the request is a proposal, plan, order, etc.',
            },
            medicationCodeableConcept: {
              $ref: '#/components/schemas/CodeableConcept',
              description: 'Medication to be taken',
            },
            medicationReference: {
              $ref: '#/components/schemas/Reference',
              description: 'Medication to be taken',
            },
            subject: {
              $ref: '#/components/schemas/Reference',
              description: 'Who the medication is for',
            },
            encounter: {
              $ref: '#/components/schemas/Reference',
              description: 'Encounter created as part of encounter/admission/stay',
            },
            authoredOn: {
              type: 'string',
              format: 'date-time',
              description: 'When request was initially authored',
            },
            requester: {
              $ref: '#/components/schemas/Reference',
              description: 'Who/What initiated the request',
            },
            performer: {
              $ref: '#/components/schemas/Reference',
              description: 'Intended performer of administration',
            },
            reasonCode: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CodeableConcept',
              },
              description: 'Reason for ordering medication',
            },
            reasonReference: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Reference',
              },
              description: 'Condition or observation that supports why the medication was ordered',
            },
            note: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string',
                    description: 'The note text',
                  },
                },
              },
              description: 'Information about the prescription',
            },
            dosageInstruction: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string',
                    description: 'Free text dosage instructions',
                  },
                  timing: {
                    type: 'object',
                    description: 'When medication should be taken',
                  },
                  route: {
                    $ref: '#/components/schemas/CodeableConcept',
                    description: 'How drug should enter body',
                  },
                  doseAndRate: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        doseQuantity: {
                          type: 'object',
                          description: 'Amount of medication per dose',
                        },
                      },
                    },
                    description: 'Dose and rate',
                  },
                },
              },
              description: 'How the medication should be taken',
            },
            dispenseRequest: {
              type: 'object',
              properties: {
                validityPeriod: {
                  $ref: '#/components/schemas/Period',
                  description: 'Time period prescription is valid for',
                },
                numberOfRepeatsAllowed: {
                  type: 'integer',
                  description: 'Number of refills authorized',
                },
                quantity: {
                  type: 'object',
                  description: 'Amount of medication to supply per dispense',
                },
                expectedSupplyDuration: {
                  type: 'object',
                  description: 'Number of days supply per dispense',
                },
              },
              description: 'Medication supply authorization',
            },
            substitution: {
              type: 'object',
              properties: {
                allowedBoolean: {
                  type: 'boolean',
                  description: 'Whether substitution is allowed',
                },
                allowedCodeableConcept: {
                  $ref: '#/components/schemas/CodeableConcept',
                  description: 'Whether substitution is allowed',
                },
                reason: {
                  $ref: '#/components/schemas/CodeableConcept',
                  description: 'Why should (not) substitution be made',
                },
              },
              description: 'Any restrictions on substitution',
            },
          },
          required: ['resourceType', 'status', 'intent'],
        };
        break;
        
      default:
        // For any other resource types, add a generic schema
        schemas[resourceType] = {
          type: 'object',
          description: `FHIR ${resourceType} Resource`,
          properties: {
            resourceType: {
              type: 'string',
              enum: [resourceType],
              description: 'Type of resource',
            },
            id: {
              type: 'string',
              description: 'Logical id of this artifact',
            },
            meta: {
              type: 'object',
              description: 'Metadata about the resource',
            },
          },
          required: ['resourceType'],
        };
        break;
    }
  });
  
  return { schemas };
}

/**
 * Generate FHIR search parameters for OpenAPI documentation
 */
export function generateFhirSearchParameters(): Record<string, any> {
  return {
    parameters: {
      fhirCommonSearchParameters: {
        name: '_include',
        in: 'query',
        description: 'Include referenced resources',
        schema: {
          type: 'string',
        },
      },
      resourceIdParameter: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Resource ID',
        schema: {
          type: 'string',
        },
      },
      patientSearchParameter: {
        name: 'patient',
        in: 'query',
        description: 'Patient reference',
        schema: {
          type: 'string',
        },
      },
      dateSearchParameter: {
        name: 'date',
        in: 'query',
        description: 'Date range (format: ge2023-01-01 or le2023-12-31)',
        schema: {
          type: 'string',
        },
      },
      statusSearchParameter: {
        name: 'status',
        in: 'query',
        description: 'Resource status',
        schema: {
          type: 'string',
        },
      },
      codeSearchParameter: {
        name: 'code',
        in: 'query',
        description: 'Code value',
        schema: {
          type: 'string',
        },
      },
      identifierSearchParameter: {
        name: 'identifier',
        in: 'query',
        description: 'Search by identifier (system|value)',
        schema: {
          type: 'string',
        },
      },
    },
  };
}