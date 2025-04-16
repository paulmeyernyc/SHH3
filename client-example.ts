/**
 * Example Client for the Canonical Dataset Service
 * 
 * This file demonstrates how other microservices would interact with
 * the Canonical Dataset Service through its API endpoints.
 */

import axios from 'axios';

// Base URL for the Canonical Dataset Service
// In a real deployment, this would come from environment variables or service discovery
const BASE_URL = 'http://localhost:3001'; // Adjust to the actual service port

// Sample tenant ID for license checks
const TENANT_ID = 'tenant-1';

/**
 * Client class for interacting with the Canonical Dataset Service
 */
class CanonicalDatasetClient {
  private baseUrl: string;
  private tenantId: string;
  
  constructor(baseUrl: string, tenantId: string) {
    this.baseUrl = baseUrl;
    this.tenantId = tenantId;
  }
  
  /**
   * Get the service status
   */
  async getStatus(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/status`);
      return response.data;
    } catch (error) {
      console.error('Error checking service status:', error);
      throw error;
    }
  }
  
  /**
   * Get list of available code systems
   */
  async getCodeSystems(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/code-systems`, {
        headers: {
          'x-tenant-id': this.tenantId
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching code systems:', error);
      throw error;
    }
  }
  
  /**
   * Get details for a specific code system
   */
  async getCodeSystem(codeSystemId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/code-systems/${codeSystemId}`, {
        headers: {
          'x-tenant-id': this.tenantId
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching code system ${codeSystemId}:`, error);
      throw error;
    }
  }
  
  /**
   * Look up a concept by code
   */
  async lookupCode(codeSystemId: string, code: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/code-systems/${codeSystemId}/concepts/${code}`, {
        headers: {
          'x-tenant-id': this.tenantId
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error looking up code ${code} in ${codeSystemId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get value sets
   */
  async getValueSets(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/value-sets`, {
        headers: {
          'x-tenant-id': this.tenantId
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching value sets:', error);
      throw error;
    }
  }
  
  /**
   * Expand a value set
   */
  async expandValueSet(valueSetId: string, filter?: string): Promise<any> {
    try {
      const url = filter 
        ? `${this.baseUrl}/value-sets/${valueSetId}/expansion?filter=${encodeURIComponent(filter)}`
        : `${this.baseUrl}/value-sets/${valueSetId}/expansion`;
        
      const response = await axios.get(url, {
        headers: {
          'x-tenant-id': this.tenantId
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error expanding value set ${valueSetId}:`, error);
      throw error;
    }
  }
  
  /**
   * Translate a code using a concept map
   */
  async translateCode(conceptMapId: string, code: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/concept-maps/${conceptMapId}/translate?code=${code}`, {
        headers: {
          'x-tenant-id': this.tenantId
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error translating code ${code} using map ${conceptMapId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a fee schedule
   */
  async getFeeSchedule(feeScheduleId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/fee-schedules/${feeScheduleId}`, {
        headers: {
          'x-tenant-id': this.tenantId
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching fee schedule ${feeScheduleId}:`, error);
      throw error;
    }
  }
  
  /**
   * Look up a fee schedule item
   */
  async lookupFeeScheduleItem(feeScheduleId: string, code: string, codeSystem: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/fee-schedules/${feeScheduleId}/items/${code}?codeSystem=${codeSystem}`, 
        {
          headers: {
            'x-tenant-id': this.tenantId
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error looking up fee for ${code} in ${feeScheduleId}:`, error);
      throw error;
    }
  }
  
  /**
   * Check if the tenant has a specific license
   */
  async checkLicense(licenseType: string): Promise<{ hasLicense: boolean, license?: any }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/licenses/check?tenantId=${this.tenantId}&licenseType=${licenseType}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error checking license for ${licenseType}:`, error);
      throw error;
    }
  }
  
  /**
   * FHIR-compatible terminology lookup
   */
  async fhirLookupCode(system: string, code: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/fhir/CodeSystem/$lookup?system=${encodeURIComponent(system)}&code=${code}`,
        {
          headers: {
            'x-tenant-id': this.tenantId
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error performing FHIR lookup for ${code} in ${system}:`, error);
      throw error;
    }
  }
  
  /**
   * FHIR-compatible code validation
   */
  async fhirValidateCode(system: string, code: string, display?: string): Promise<any> {
    try {
      let url = `${this.baseUrl}/fhir/CodeSystem/$validate-code?system=${encodeURIComponent(system)}&code=${code}`;
      
      if (display) {
        url += `&display=${encodeURIComponent(display)}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'x-tenant-id': this.tenantId
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error performing FHIR validation for ${code} in ${system}:`, error);
      throw error;
    }
  }
  
  /**
   * FHIR-compatible value set expansion
   */
  async fhirExpandValueSet(url: string, filter?: string): Promise<any> {
    try {
      let apiUrl = `${this.baseUrl}/fhir/ValueSet/$expand?url=${encodeURIComponent(url)}`;
      
      if (filter) {
        apiUrl += `&filter=${encodeURIComponent(filter)}`;
      }
      
      const response = await axios.get(apiUrl, {
        headers: {
          'x-tenant-id': this.tenantId
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error performing FHIR value set expansion for ${url}:`, error);
      throw error;
    }
  }
}

/**
 * Example usage of the client
 */
async function runClientExample() {
  const client = new CanonicalDatasetClient(BASE_URL, TENANT_ID);
  
  try {
    // Check service status
    console.log('\n=== Service Status ===');
    const status = await client.getStatus();
    console.log(status);
    
    // Get list of code systems
    console.log('\n=== Available Code Systems ===');
    const codeSystems = await client.getCodeSystems();
    console.log(`Found ${codeSystems.length} code systems`);
    codeSystems.forEach((cs: any) => {
      console.log(`- ${cs.name} (${cs.codeSystemId}): ${cs.description}`);
    });
    
    // Get details for a specific code system (LOINC)
    console.log('\n=== LOINC Code System Details ===');
    const loinc = await client.getCodeSystem('loinc');
    console.log(`Name: ${loinc.name}`);
    console.log(`URI: ${loinc.uri}`);
    console.log(`Version: ${loinc.version}`);
    console.log(`License Required: ${loinc.licenseRequired ? 'Yes' : 'No'}`);
    
    // Look up a code
    console.log('\n=== Looking up LOINC code for Systolic BP ===');
    const bpCode = await client.lookupCode('loinc', '8480-6');
    console.log(`Code: ${bpCode.code}`);
    console.log(`Display: ${bpCode.display}`);
    console.log(`Definition: ${bpCode.definition}`);
    if (bpCode.designations && bpCode.designations.length > 0) {
      console.log('Designations:');
      bpCode.designations.forEach((d: any) => {
        console.log(`- ${d.language}: ${d.value}`);
      });
    }
    
    // Check if we have LOINC license
    console.log('\n=== Checking LOINC License ===');
    const licenseCheck = await client.checkLicense('loinc');
    console.log(`Has LOINC License: ${licenseCheck.hasLicense}`);
    if (licenseCheck.hasLicense && licenseCheck.license) {
      console.log(`License Key: ${licenseCheck.license.licenseKey}`);
      console.log(`Expiration: ${licenseCheck.license.expirationDate}`);
    }
    
    // Get value sets
    console.log('\n=== Available Value Sets ===');
    const valueSets = await client.getValueSets();
    console.log(`Found ${valueSets.length} value sets`);
    valueSets.forEach((vs: any) => {
      console.log(`- ${vs.name} (${vs.valueSetId}): ${vs.description}`);
    });
    
    // Expand a value set
    console.log('\n=== Expanding Vital Signs Value Set ===');
    const expansion = await client.expandValueSet('vital-signs');
    console.log(`Value Set: ${expansion.valueSet.name}`);
    console.log(`Total codes: ${expansion.expansion.total}`);
    console.log('Codes:');
    expansion.expansion.contains.forEach((code: any) => {
      console.log(`- ${code.code}: ${code.display} (${code.system})`);
    });
    
    // Translate a code using concept map
    console.log('\n=== Translating ICD-10 code for Hypertension to LOINC ===');
    const translation = await client.translateCode('icd10-to-loinc-map', 'I10');
    if (translation.result) {
      console.log(`Translation succeeded with ${translation.matches.length} matches`);
      translation.matches.forEach((match: any) => {
        console.log(`- ${match.concept.code}: ${match.concept.display} (${match.equivalence})`);
      });
    } else {
      console.log('Translation failed: ' + translation.message);
    }
    
    // Look up a fee
    console.log('\n=== Medicare Fee Schedule Lookup ===');
    const fee = await client.lookupFeeScheduleItem('medicare-pfs-2023', '99213', 'cpt');
    console.log(`Code: ${fee.code} (${fee.description})`);
    console.log(`Amount: $${fee.amount}`);
    console.log(`Facility Rate: $${fee.facilityRate}`);
    console.log(`Non-Facility Rate: $${fee.nonFacilityRate}`);
    
    // FHIR operations
    
    // FHIR code lookup
    console.log('\n=== FHIR Code Lookup ===');
    const fhirLookup = await client.fhirLookupCode('http://loinc.org', '8480-6');
    console.log(`Result: ${fhirLookup.parameter.find((p: any) => p.name === 'result').valueBoolean}`);
    console.log(`Display: ${fhirLookup.parameter.find((p: any) => p.name === 'display').valueString}`);
    
    // FHIR code validation
    console.log('\n=== FHIR Code Validation ===');
    const fhirValidation = await client.fhirValidateCode('http://loinc.org', '8480-6', 'Systolic blood pressure');
    console.log(`Result: ${fhirValidation.parameter.find((p: any) => p.name === 'result').valueBoolean}`);
    console.log(`Display: ${fhirValidation.parameter.find((p: any) => p.name === 'display').valueString}`);
    
    // FHIR value set expansion
    console.log('\n=== FHIR Value Set Expansion ===');
    const fhirExpansion = await client.fhirExpandValueSet('http://hl7.org/fhir/ValueSet/vital-signs');
    console.log(`Value Set: ${fhirExpansion.name}`);
    console.log(`Total: ${fhirExpansion.expansion.total}`);
    console.log('Codes:');
    fhirExpansion.expansion.contains.forEach((code: any) => {
      console.log(`- ${code.code}: ${code.display} (${code.system})`);
    });
    
    console.log('\nClient example completed successfully.');
  } catch (error) {
    console.error('Error running client example:', error);
  }
}

// Uncomment to run the client example
// runClientExample();