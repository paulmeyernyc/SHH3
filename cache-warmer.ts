import { CacheManager, CacheLevel, CacheOptions } from './cache-manager';
import { storage } from '../storage';

/**
 * Cache Warmer
 * 
 * Proactively warms the cache with frequently accessed data to improve
 * response times for users. This is particularly useful after cache
 * invalidations or service restarts.
 */
export class CacheWarmer {
  /**
   * Initialize the cache warmer
   */
  constructor(private cacheManager: CacheManager) {}

  /**
   * Warm up common API responses
   */
  async warmApiCache(): Promise<void> {
    console.log('Warming API cache...');
    
    try {
      // Warm up common entities
      await Promise.all([
        this.warmProviders(),
        this.warmPatients(),
        this.warmClaims(),
        this.warmFhirResources()
      ]);
      
      console.log('API cache warming completed');
    } catch (error) {
      console.error('Error warming API cache:', error);
    }
  }
  
  /**
   * Warm up provider data
   */
  private async warmProviders(): Promise<void> {
    try {
      // Get all providers
      const providers = await storage.getProviders();
      
      // Cache the list
      await this.cacheManager.set(
        'api:providers',
        providers,
        {
          ttl: 3600, // 1 hour
          level: CacheLevel.REDIS,
          tags: ['providers']
        }
      );
      
      // Cache individual providers
      for (const provider of providers) {
        await this.cacheManager.set(
          `api:provider:${provider.id}`,
          provider,
          {
            ttl: 3600, // 1 hour
            level: CacheLevel.REDIS,
            tags: ['providers', `provider:${provider.id}`]
          }
        );
      }
      
      console.log(`Warmed cache for ${providers.length} providers`);
    } catch (error) {
      console.error('Error warming provider cache:', error);
    }
  }
  
  /**
   * Warm up patient data
   */
  private async warmPatients(): Promise<void> {
    try {
      // Get all patients
      const patients = await storage.getPatients();
      
      // Cache the list
      await this.cacheManager.set(
        'api:patients',
        patients,
        {
          ttl: 1800, // 30 minutes
          level: CacheLevel.REDIS,
          tags: ['patients']
        }
      );
      
      // Cache individual patients
      for (const patient of patients) {
        await this.cacheManager.set(
          `api:patient:${patient.id}`,
          patient,
          {
            ttl: 1800, // 30 minutes
            level: CacheLevel.REDIS,
            tags: ['patients', `patient:${patient.id}`]
          }
        );
      }
      
      console.log(`Warmed cache for ${patients.length} patients`);
    } catch (error) {
      console.error('Error warming patient cache:', error);
    }
  }
  
  /**
   * Warm up claims data
   */
  private async warmClaims(): Promise<void> {
    try {
      // Get all claims
      const claims = await storage.getClaims();
      
      // Cache the list
      await this.cacheManager.set(
        'api:claims',
        claims,
        {
          ttl: 900, // 15 minutes
          level: CacheLevel.REDIS,
          tags: ['claims']
        }
      );
      
      console.log(`Warmed cache for ${claims.length} claims`);
    } catch (error) {
      console.error('Error warming claims cache:', error);
    }
  }
  
  /**
   * Warm up FHIR resources
   */
  private async warmFhirResources(): Promise<void> {
    try {
      // Get all FHIR resources
      const resources = await storage.getFhirResources();
      
      // Cache the list
      await this.cacheManager.set(
        'api:fhir_resources',
        resources,
        {
          ttl: 3600, // 1 hour
          level: CacheLevel.REDIS,
          tags: ['fhir_resources']
        }
      );
      
      console.log(`Warmed cache for ${resources.length} FHIR resources`);
    } catch (error) {
      console.error('Error warming FHIR resources cache:', error);
    }
  }
  
  /**
   * Schedule periodic cache warming
   * 
   * @param interval Interval in milliseconds (default: 5 minutes)
   */
  scheduleWarmUp(interval: number = 5 * 60 * 1000): NodeJS.Timeout {
    console.log(`Scheduling cache warming every ${interval/1000} seconds`);
    
    // Immediately warm up
    this.warmApiCache().catch(err => {
      console.error('Initial cache warming failed:', err);
    });
    
    // Schedule periodic warming
    return setInterval(() => {
      this.warmApiCache().catch(err => {
        console.error('Scheduled cache warming failed:', err);
      });
    }, interval);
  }
}