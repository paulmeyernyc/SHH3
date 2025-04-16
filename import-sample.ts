/**
 * Sample Script for Importing Terminology Data
 * 
 * This demonstrates how to import terminology data into the Canonical Dataset Service.
 * In a production environment, this would be more sophisticated with:
 * - Bulk import capabilities for large datasets (like SNOMED CT with millions of concepts)
 * - Handling of specific format requirements for each terminology
 * - Version management and backward compatibility
 * - Delta updates for incremental releases
 */

import { db } from '../../server/db';
import { 
  codeSystems, 
  codeSystemConcepts, 
  codeSystemDesignations,
  valueSets,
  valueSetIncludes,
  conceptMaps,
  conceptMapElements,
  feeSchedules,
  feeScheduleItems,
  licenses
} from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Import a sample LOINC code system with a few codes
 */
async function importSampleLoinc() {
  console.log('Importing sample LOINC codes...');
  
  // Check if LOINC already exists
  const [existingLoinc] = await db
    .select()
    .from(codeSystems)
    .where(eq(codeSystems.codeSystemId, 'loinc'));
    
  if (existingLoinc) {
    console.log('LOINC already exists, skipping import.');
    return;
  }
  
  // Insert LOINC code system
  await db.insert(codeSystems).values({
    codeSystemId: 'loinc',
    uri: 'http://loinc.org',
    name: 'LOINC',
    version: '2.73',
    description: 'Logical Observation Identifiers Names and Codes',
    publisher: 'Regenstrief Institute, Inc.',
    copyright: 'This content is from LOINC® (http://loinc.org), which is copyright © 1995-2022, Regenstrief Institute, Inc.',
    contentType: 'complete',
    isHierarchical: false,
    hasSubsumption: false,
    licenseRequired: true,
    isProprietary: true,
    active: true,
    releaseDate: new Date('2022-12-15'),
    importDate: new Date(),
    importedBy: 'system',
    sourceUrl: 'https://loinc.org/downloads/',
    metadata: JSON.stringify({
      contactName: 'LOINC Support',
      contactEmail: 'loinc@regenstrief.org',
      licenseUrl: 'https://loinc.org/license/'
    })
  });
  
  // Insert some sample LOINC codes
  const loincCodes = [
    {
      code: '8480-6',
      display: 'Systolic blood pressure',
      definition: 'The maximum blood pressure measured during a cardiac contraction.',
      status: 'active',
      properties: JSON.stringify({
        component: 'Systolic blood pressure',
        property: 'Pressure',
        timeAspect: 'Point in time',
        system: 'Arterial blood',
        scale: 'Qn',
        method: ''
      })
    },
    {
      code: '8462-4',
      display: 'Diastolic blood pressure',
      definition: 'The minimum blood pressure measured during cardiac relaxation.',
      status: 'active',
      properties: JSON.stringify({
        component: 'Diastolic blood pressure',
        property: 'Pressure',
        timeAspect: 'Point in time',
        system: 'Arterial blood',
        scale: 'Qn',
        method: ''
      })
    },
    {
      code: '8867-4',
      display: 'Heart rate',
      definition: 'The frequency of cardiac contractions expressed as beats per minute.',
      status: 'active',
      properties: JSON.stringify({
        component: 'Heart rate',
        property: 'Frequency',
        timeAspect: 'Point in time',
        system: 'Heart',
        scale: 'Qn',
        method: ''
      })
    },
    {
      code: '2093-3',
      display: 'Cholesterol [Mass/volume] in Serum or Plasma',
      definition: 'The amount of cholesterol measured in a sample of serum or plasma.',
      status: 'active',
      properties: JSON.stringify({
        component: 'Cholesterol',
        property: 'Mass',
        timeAspect: 'Point in time',
        system: 'Serum/Plasma',
        scale: 'Qn',
        method: ''
      })
    },
    {
      code: '2160-0',
      display: 'Creatinine [Mass/volume] in Serum or Plasma',
      definition: 'The amount of creatinine measured in a sample of serum or plasma.',
      status: 'active',
      properties: JSON.stringify({
        component: 'Creatinine',
        property: 'Mass',
        timeAspect: 'Point in time',
        system: 'Serum/Plasma',
        scale: 'Qn',
        method: ''
      })
    }
  ];
  
  // Insert each code
  for (const code of loincCodes) {
    await db.insert(codeSystemConcepts).values({
      codeSystemId: 'loinc',
      ...code
    });
    
    // Add Spanish translations for each code
    const spanishDisplays: Record<string, string> = {
      '8480-6': 'Presión arterial sistólica',
      '8462-4': 'Presión arterial diastólica',
      '8867-4': 'Frecuencia cardíaca',
      '2093-3': 'Colesterol [Masa/volumen] en Suero o Plasma',
      '2160-0': 'Creatinina [Masa/volumen] en Suero o Plasma'
    };
    
    await db.insert(codeSystemDesignations).values({
      codeSystemId: 'loinc',
      code: code.code,
      language: 'es',
      useCode: 'display',
      value: spanishDisplays[code.code],
      preferred: true
    });
  }
  
  console.log('Sample LOINC codes imported successfully.');
}

/**
 * Import a sample ICD-10 code system with a few codes
 */
async function importSampleIcd10() {
  console.log('Importing sample ICD-10 codes...');
  
  // Check if ICD-10 already exists
  const [existingIcd10] = await db
    .select()
    .from(codeSystems)
    .where(eq(codeSystems.codeSystemId, 'icd10'));
    
  if (existingIcd10) {
    console.log('ICD-10 already exists, skipping import.');
    return;
  }
  
  // Insert ICD-10 code system
  await db.insert(codeSystems).values({
    codeSystemId: 'icd10',
    uri: 'http://hl7.org/fhir/sid/icd-10',
    name: 'ICD-10',
    version: '2023',
    description: 'International Classification of Diseases, 10th Revision',
    publisher: 'World Health Organization',
    copyright: 'Copyright © World Health Organization 2023',
    contentType: 'complete',
    isHierarchical: true,
    hasSubsumption: true,
    licenseRequired: false,
    isProprietary: false,
    active: true,
    releaseDate: new Date('2022-01-01'),
    importDate: new Date(),
    importedBy: 'system',
    sourceUrl: 'https://www.who.int/standards/classifications/classification-of-diseases',
    metadata: JSON.stringify({
      contactName: 'WHO Classifications',
      contactEmail: 'classifications@who.int'
    })
  });
  
  // Insert some sample ICD-10 codes
  const icd10Codes = [
    {
      code: 'I10',
      display: 'Essential (primary) hypertension',
      definition: 'High blood pressure with no identifiable cause.',
      status: 'active',
      isAbstract: false,
      hierarchyLevel: 2,
      parentCodes: JSON.stringify(['I00-I99']),
      properties: JSON.stringify({
        category: 'Diseases of the circulatory system'
      })
    },
    {
      code: 'E11',
      display: 'Type 2 diabetes mellitus',
      definition: 'Diabetes mellitus characterized by insulin resistance.',
      status: 'active',
      isAbstract: false,
      hierarchyLevel: 2,
      parentCodes: JSON.stringify(['E00-E89']),
      properties: JSON.stringify({
        category: 'Endocrine, nutritional and metabolic diseases'
      })
    },
    {
      code: 'J45',
      display: 'Asthma',
      definition: 'Chronic inflammatory disease of the airways characterized by variable and recurring symptoms, reversible airflow obstruction, and bronchospasm.',
      status: 'active',
      isAbstract: false,
      hierarchyLevel: 2,
      parentCodes: JSON.stringify(['J00-J99']),
      properties: JSON.stringify({
        category: 'Diseases of the respiratory system'
      })
    },
    {
      code: 'F32',
      display: 'Major depressive disorder, single episode',
      definition: 'Depression characterized by low mood, low self-esteem, and loss of interest in normally enjoyable activities.',
      status: 'active',
      isAbstract: false,
      hierarchyLevel: 2,
      parentCodes: JSON.stringify(['F01-F99']),
      properties: JSON.stringify({
        category: 'Mental and behavioral disorders'
      })
    },
    {
      code: 'M54.5',
      display: 'Low back pain',
      definition: 'Pain in the lower back, which can originate from various structures including bones, joints, muscles, ligaments, or nerves.',
      status: 'active',
      isAbstract: false,
      hierarchyLevel: 3,
      parentCodes: JSON.stringify(['M50-M54', 'M54']),
      properties: JSON.stringify({
        category: 'Diseases of the musculoskeletal system and connective tissue'
      })
    }
  ];
  
  // Insert each code
  for (const code of icd10Codes) {
    await db.insert(codeSystemConcepts).values({
      codeSystemId: 'icd10',
      ...code
    });
  }
  
  console.log('Sample ICD-10 codes imported successfully.');
}

/**
 * Import a sample CPT code system with a few codes
 */
async function importSampleCpt() {
  console.log('Importing sample CPT codes...');
  
  // Check if CPT already exists
  const [existingCpt] = await db
    .select()
    .from(codeSystems)
    .where(eq(codeSystems.codeSystemId, 'cpt'));
    
  if (existingCpt) {
    console.log('CPT already exists, skipping import.');
    return;
  }
  
  // Insert CPT code system
  await db.insert(codeSystems).values({
    codeSystemId: 'cpt',
    uri: 'http://www.ama-assn.org/go/cpt',
    name: 'Current Procedural Terminology',
    version: '2023',
    description: 'American Medical Association Current Procedural Terminology',
    publisher: 'American Medical Association',
    copyright: 'Copyright © 2023 American Medical Association. All rights reserved.',
    contentType: 'complete',
    isHierarchical: true,
    hasSubsumption: false,
    licenseRequired: true,
    isProprietary: true,
    active: true,
    releaseDate: new Date('2023-01-01'),
    importDate: new Date(),
    importedBy: 'system',
    sourceUrl: 'https://www.ama-assn.org/practice-management/cpt',
    metadata: JSON.stringify({
      contactName: 'AMA CPT Licensing',
      contactEmail: 'cpt@ama-assn.org',
      licenseUrl: 'https://www.ama-assn.org/practice-management/cpt/cpt-license-applications'
    })
  });
  
  // Insert some sample CPT codes
  const cptCodes = [
    {
      code: '99203',
      display: 'Office or other outpatient visit for the evaluation and management of a new patient',
      definition: 'Office or other outpatient visit for the evaluation and management of a new patient, which requires a medically appropriate history and/or examination and low level of medical decision making.',
      status: 'active',
      isAbstract: false,
      properties: JSON.stringify({
        category: 'Evaluation and Management',
        timeRVU: 0.93,
        workRVU: 1.42
      })
    },
    {
      code: '99213',
      display: 'Office or other outpatient visit for the evaluation and management of an established patient',
      definition: 'Office or other outpatient visit for the evaluation and management of an established patient, which requires a medically appropriate history and/or examination and low level of medical decision making.',
      status: 'active',
      isAbstract: false,
      properties: JSON.stringify({
        category: 'Evaluation and Management',
        timeRVU: 0.63,
        workRVU: 0.97
      })
    },
    {
      code: '80061',
      display: 'Lipid panel',
      definition: 'This panel must include the following: Cholesterol, serum, total, Cholesterol, high density lipoprotein (HDL), Triglycerides',
      status: 'active',
      isAbstract: false,
      properties: JSON.stringify({
        category: 'Pathology and Laboratory',
        components: ['82465', '83718', '84478']
      })
    },
    {
      code: '82947',
      display: 'Glucose; quantitative, blood (except reagent strip)',
      definition: 'Quantitative measurement of glucose in blood',
      status: 'active',
      isAbstract: false,
      properties: JSON.stringify({
        category: 'Pathology and Laboratory'
      })
    },
    {
      code: '93000',
      display: 'Electrocardiogram, routine ECG with at least 12 leads; with interpretation and report',
      definition: 'Electrocardiogram, routine ECG with at least 12 leads; with interpretation and report',
      status: 'active',
      isAbstract: false,
      properties: JSON.stringify({
        category: 'Medicine',
        components: ['93005', '93010']
      })
    }
  ];
  
  // Insert each code
  for (const code of cptCodes) {
    await db.insert(codeSystemConcepts).values({
      codeSystemId: 'cpt',
      ...code
    });
  }
  
  console.log('Sample CPT codes imported successfully.');
}

/**
 * Import a sample value set for vital signs
 */
async function importVitalSignsValueSet() {
  console.log('Importing Vital Signs value set...');
  
  // Check if value set already exists
  const [existingVS] = await db
    .select()
    .from(valueSets)
    .where(eq(valueSets.valueSetId, 'vital-signs'));
    
  if (existingVS) {
    console.log('Vital Signs value set already exists, skipping import.');
    return;
  }
  
  // Insert value set
  await db.insert(valueSets).values({
    valueSetId: 'vital-signs',
    uri: 'http://hl7.org/fhir/ValueSet/vital-signs',
    name: 'Vital Signs',
    version: '1.0.0',
    description: 'Vital Signs value set containing LOINC codes for common vital signs measurements',
    publisher: 'Smart Health Hub',
    purpose: 'This value set includes the common vital signs measurements used in clinical practice',
    status: 'active',
    experimental: false,
    isProprietary: false,
    licenseRequired: false
  });
  
  // Insert LOINC include criteria
  await db.insert(valueSetIncludes).values({
    valueSetId: 'vital-signs',
    codeSystemId: 'loinc',
    includeAll: false,
    codes: JSON.stringify([
      { code: '8480-6', display: 'Systolic blood pressure' },
      { code: '8462-4', display: 'Diastolic blood pressure' },
      { code: '8867-4', display: 'Heart rate' }
    ])
  });
  
  console.log('Vital Signs value set imported successfully.');
}

/**
 * Import a sample concept map for mapping ICD-10 to LOINC
 */
async function importIcd10ToLoincMap() {
  console.log('Importing ICD-10 to LOINC concept map...');
  
  // Check if concept map already exists
  const [existingMap] = await db
    .select()
    .from(conceptMaps)
    .where(eq(conceptMaps.conceptMapId, 'icd10-to-loinc-map'));
    
  if (existingMap) {
    console.log('ICD-10 to LOINC concept map already exists, skipping import.');
    return;
  }
  
  // Insert concept map
  await db.insert(conceptMaps).values({
    conceptMapId: 'icd10-to-loinc-map',
    uri: 'http://shh.org/fhir/ConceptMap/icd10-to-loinc-map',
    name: 'ICD-10 to LOINC Common Measurements',
    description: 'Maps common ICD-10 diagnoses to relevant LOINC measurements',
    sourceUri: 'http://hl7.org/fhir/sid/icd-10',
    targetUri: 'http://loinc.org',
    sourceCodeSystemId: 'icd10',
    targetCodeSystemId: 'loinc',
    status: 'active',
    experimental: true,
    isProprietary: false,
    licenseRequired: false,
    publisher: 'Smart Health Hub'
  });
  
  // Insert mapping elements
  const mappings = [
    {
      sourceCode: 'I10',
      sourceDisplay: 'Essential (primary) hypertension',
      targetCode: '8480-6',
      targetDisplay: 'Systolic blood pressure',
      relationship: 'wider'
    },
    {
      sourceCode: 'I10',
      sourceDisplay: 'Essential (primary) hypertension',
      targetCode: '8462-4',
      targetDisplay: 'Diastolic blood pressure',
      relationship: 'wider'
    },
    {
      sourceCode: 'I10',
      sourceDisplay: 'Essential (primary) hypertension',
      targetCode: '8867-4',
      targetDisplay: 'Heart rate',
      relationship: 'related-to'
    },
    {
      sourceCode: 'E11',
      sourceDisplay: 'Type 2 diabetes mellitus',
      targetCode: '2093-3',
      targetDisplay: 'Cholesterol [Mass/volume] in Serum or Plasma',
      relationship: 'related-to'
    }
  ];
  
  for (const mapping of mappings) {
    await db.insert(conceptMapElements).values({
      conceptMapId: 'icd10-to-loinc-map',
      ...mapping
    });
  }
  
  console.log('ICD-10 to LOINC concept map imported successfully.');
}

/**
 * Import a sample Medicare Physician Fee Schedule
 */
async function importMedicareFeeSchedule() {
  console.log('Importing sample Medicare Physician Fee Schedule...');
  
  // Check if fee schedule already exists
  const [existingFS] = await db
    .select()
    .from(feeSchedules)
    .where(eq(feeSchedules.feeScheduleId, 'medicare-pfs-2023'));
    
  if (existingFS) {
    console.log('Medicare Physician Fee Schedule already exists, skipping import.');
    return;
  }
  
  // Insert fee schedule
  await db.insert(feeSchedules).values({
    feeScheduleId: 'medicare-pfs-2023',
    name: 'Medicare Physician Fee Schedule',
    source: 'CMS',
    region: 'USA',
    version: '2023',
    effectiveDate: new Date('2023-01-01'),
    expirationDate: new Date('2023-12-31'),
    status: 'active',
    currency: 'USD',
    isProprietary: false,
    licenseRequired: false,
    description: 'Centers for Medicare & Medicaid Services (CMS) Physician Fee Schedule for 2023',
    publisher: 'CMS'
  });
  
  // Insert fee schedule items for CPT codes
  const feeItems = [
    {
      codeSystemId: 'cpt',
      code: '99203',
      description: 'Office or other outpatient visit for the evaluation and management of a new patient',
      amount: 89.24,
      facilityRate: 67.09,
      nonFacilityRate: 89.24
    },
    {
      codeSystemId: 'cpt',
      code: '99213',
      description: 'Office or other outpatient visit for the evaluation and management of an established patient',
      amount: 60.31,
      facilityRate: 49.78,
      nonFacilityRate: 60.31
    },
    {
      codeSystemId: 'cpt',
      code: '80061',
      description: 'Lipid panel',
      amount: 13.39,
      facilityRate: 13.39,
      nonFacilityRate: 13.39
    },
    {
      codeSystemId: 'cpt',
      code: '82947',
      description: 'Glucose; quantitative, blood (except reagent strip)',
      amount: 4.64,
      facilityRate: 4.64,
      nonFacilityRate: 4.64
    },
    {
      codeSystemId: 'cpt',
      code: '93000',
      description: 'Electrocardiogram, routine ECG with at least 12 leads; with interpretation and report',
      amount: 16.71,
      facilityRate: 16.71,
      nonFacilityRate: 16.71
    }
  ];
  
  for (const item of feeItems) {
    await db.insert(feeScheduleItems).values({
      feeScheduleId: 'medicare-pfs-2023',
      ...item
    });
  }
  
  console.log('Sample Medicare Physician Fee Schedule imported successfully.');
}

/**
 * Import a sample license for a tenant
 */
async function importSampleLicense() {
  console.log('Importing sample license...');
  
  // Check if license already exists
  const [existingLicense] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.tenantId, 'tenant-1'));
    
  if (existingLicense) {
    console.log('License already exists for tenant-1, skipping import.');
    return;
  }
  
  // Insert licenses
  const sampleLicenses = [
    {
      tenantId: 'tenant-1',
      licenseType: 'loinc',
      licenseKey: 'LOINC-123456-DEMO',
      status: 'active',
      effectiveDate: new Date('2023-01-01'),
      expirationDate: new Date('2024-12-31'),
      scope: 'full',
      usersLimit: 100,
      issuedBy: 'Regenstrief Institute',
      contactName: 'John Doe',
      contactEmail: 'john.doe@example.com',
      notes: 'Demo license for LOINC terminology'
    },
    {
      tenantId: 'tenant-1',
      licenseType: 'cpt',
      licenseKey: 'CPT-789012-DEMO',
      status: 'active',
      effectiveDate: new Date('2023-01-01'),
      expirationDate: new Date('2023-12-31'),
      scope: 'descriptive',
      usersLimit: 50,
      issuedBy: 'American Medical Association',
      contactName: 'Jane Smith',
      contactEmail: 'jane.smith@example.com',
      notes: 'Demo license for CPT terminology, descriptive use only'
    },
    {
      tenantId: 'tenant-2',
      licenseType: 'loinc',
      licenseKey: 'LOINC-345678-DEMO',
      status: 'active',
      effectiveDate: new Date('2023-01-01'),
      expirationDate: new Date('2024-12-31'),
      scope: 'full',
      usersLimit: 200,
      issuedBy: 'Regenstrief Institute',
      contactName: 'Robert Brown',
      contactEmail: 'robert.brown@example.com',
      notes: 'Demo license for LOINC terminology'
    }
  ];
  
  for (const license of sampleLicenses) {
    await db.insert(licenses).values(license);
  }
  
  console.log('Sample licenses imported successfully.');
}

/**
 * Main import function
 */
export async function runImport() {
  try {
    console.log('Starting sample data import...');
    
    // Import code systems
    await importSampleLoinc();
    await importSampleIcd10();
    await importSampleCpt();
    
    // Import value sets
    await importVitalSignsValueSet();
    
    // Import concept maps
    await importIcd10ToLoincMap();
    
    // Import fee schedules
    await importMedicareFeeSchedule();
    
    // Import licenses
    await importSampleLicense();
    
    console.log('Sample data import completed successfully.');
  } catch (error) {
    console.error('Error importing sample data:', error);
  }
}

// Uncomment to run the import
// runImport();