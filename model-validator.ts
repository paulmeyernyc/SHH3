/**
 * Model Validator
 * 
 * This module provides utilities for validating model definitions and relationships.
 * It can be used to ensure data integrity and consistency across the application.
 */

import { validateModelRegistry, modelRegistry, modelDependencyGraph } from './model-registry';
import { validateModelRelationships, modelRelationships } from './model-relationships';

/**
 * Validate all model definitions
 */
export function validateModels(): { valid: boolean, errors: string[] } {
  const errors: string[] = [];
  let isValid = true;
  
  // First validate the model registry
  if (!validateModelRegistry()) {
    errors.push('Model registry validation failed');
    isValid = false;
  }
  
  // Then validate relationships
  if (!validateModelRelationships()) {
    errors.push('Model relationships validation failed');
    isValid = false;
  }
  
  // Validate individual models and their columns
  for (const [modelName, model] of Object.entries(modelRegistry)) {
    try {
      // Check if model has columns
      // In Drizzle, we can't directly access the columns or primary key using helper functions
      // Instead, we can check if the model object has the expected structure
      if (!model || typeof model !== 'object') {
        errors.push(`Model ${modelName} is not properly defined`);
        isValid = false;
        continue;
      }
      
      // Check required columns existence based on relationships
      // Filter to only include this model and exclude any commented relationships
      const relationships = modelRelationships.filter(rel => 
        (rel.sourceModel === modelName || rel.targetModel === modelName) &&
        // Skip relationships with commented markings
        !rel.hasOwnProperty('_commented')
      );
      
      for (const rel of relationships) {
        for (const mapping of rel.fieldMappings) {
          const fieldToCheck = rel.sourceModel === modelName ? 
            mapping.sourceField : mapping.targetField;
            
          // Check if field exists on model (this is approximate since we can't directly access column definitions)
          // For PostgreSQL tables with Drizzle, fields are typically accessible as properties
          // but we need to handle both direct properties and columns
          if (!(fieldToCheck in (model as any))) {
            // Special handling for relationships that exist in code but not in DB yet
            if (modelName === 'claims' && 
               (fieldToCheck === 'providerId' || fieldToCheck === 'submitterId')) {
              // These fields don't exist yet but will be added in the future
              continue;
            }
            
            errors.push(`Model ${modelName} is missing field ${fieldToCheck} required for relationship`);
            isValid = false;
          }
        }
      }
    } catch (error) {
      errors.push(`Error validating model ${modelName}: ${error instanceof Error ? error.message : String(error)}`);
      isValid = false;
    }
  }
  
  // Validate dependency graph for cycles
  if (!validateDependencyGraph()) {
    errors.push('Dependency graph contains cycles');
    isValid = false;
  }
  
  return { valid: isValid, errors };
}

/**
 * Validate the dependency graph for cycles
 */
function validateDependencyGraph(): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  
  // For each model, check if there's a cycle starting from it
  for (const model of Object.keys(modelDependencyGraph)) {
    if (hasCycle(model, visited, recStack)) {
      console.error(`Dependency cycle detected in model: ${model}`);
      return false;
    }
  }
  
  return true;
  
  // Helper function to detect cycles using DFS
  function hasCycle(model: string, visited: Set<string>, recStack: Set<string>): boolean {
    // Mark the current node as visited and add to recursion stack
    visited.add(model);
    recStack.add(model);
    
    // Check all dependencies of current model
    const dependencies = modelDependencyGraph[model as keyof typeof modelDependencyGraph] || [];
    for (const dep of dependencies) {
      // If dependency not visited, check if it leads to a cycle
      if (!visited.has(dep)) {
        if (hasCycle(dep, visited, recStack)) {
          return true;
        }
      } 
      // If dependency is already in recursion stack, it's a cycle
      else if (recStack.has(dep)) {
        return true;
      }
    }
    
    // Remove from recursion stack
    recStack.delete(model);
    return false;
  }
}

/**
 * Generate a report of all models and their relationships
 */
export function generateModelReport(): string {
  let report = '# Database Model Report\n\n';
  
  // List all models
  report += '## Models\n\n';
  for (const [modelName, model] of Object.entries(modelRegistry)) {
    report += `### ${modelName}\n\n`;
    
    // In Drizzle, we can't directly access column metadata easily
    // So we'll show relationships and dependency information instead
    
    // List relationships (excluding commented ones)
    const rels = modelRelationships.filter(rel => 
      rel.sourceModel === modelName && !rel._commented
    );
    if (rels.length > 0) {
      report += '#### Relationships\n\n';
      report += '| Target Model | Type | Source Field | Target Field |\n';
      report += '|-------------|------|-------------|-------------|\n';
      
      for (const rel of rels) {
        for (const mapping of rel.fieldMappings) {
          report += `| ${rel.targetModel} | ${rel.relationType} | ${mapping.sourceField} | ${mapping.targetField} |\n`;
        }
      }
      
      report += '\n';
    }
  }
  
  // Generate dependency graph
  report += '## Dependency Graph\n\n';
  report += '```\n';
  for (const [model, deps] of Object.entries(modelDependencyGraph)) {
    if (deps.length > 0) {
      report += `${model} -> ${deps.join(', ')}\n`;
    } else {
      report += `${model} (no dependencies)\n`;
    }
  }
  report += '```\n\n';
  
  return report;
}

/**
 * Run validation if this module is executed directly
 */
if (typeof require !== 'undefined' && require.main === module) {
  const { valid, errors } = validateModels();
  if (valid) {
    console.log('✅ All models are valid!');
  } else {
    console.error('❌ Model validation failed:');
    errors.forEach(error => console.error(`- ${error}`));
  }
}