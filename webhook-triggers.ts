/**
 * Webhook Triggers
 * 
 * This module provides helper functions for triggering webhook events from different
 * parts of the application.
 */

import { webhookService, WebhookEventPayload } from './webhook-service';
import { logger } from '../observability';

/**
 * Trigger a webhook event
 * @param eventPayload The event payload
 */
export async function triggerWebhook(eventPayload: WebhookEventPayload): Promise<void> {
  try {
    await webhookService.triggerEvent(eventPayload);
  } catch (error) {
    logger.error('Error triggering webhook event', {
      error: (error as Error).message,
      eventName: eventPayload.eventName
    });
    // Don't throw the error - webhook failures should not affect the main application flow
  }
}

// Patient-related webhook triggers
export const patientWebhooks = {
  /**
   * Trigger webhook when a patient is created
   */
  async created(patientId: string, patientData: any): Promise<void> {
    await triggerWebhook({
      eventName: 'patient.created',
      payload: {
        id: patientId,
        ...patientData,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Trigger webhook when a patient is updated
   */
  async updated(patientId: string, patientData: any): Promise<void> {
    await triggerWebhook({
      eventName: 'patient.updated',
      payload: {
        id: patientId,
        ...patientData,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Trigger webhook when a patient is deleted
   */
  async deleted(patientId: string): Promise<void> {
    await triggerWebhook({
      eventName: 'patient.deleted',
      payload: {
        id: patientId,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Claim-related webhook triggers
export const claimWebhooks = {
  /**
   * Trigger webhook when a claim is submitted
   */
  async submitted(claimId: string, claimData: any): Promise<void> {
    await triggerWebhook({
      eventName: 'claim.submitted',
      payload: {
        id: claimId,
        ...claimData,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Trigger webhook when a claim status changes
   */
  async statusChanged(claimId: string, claimData: any, oldStatus: string, newStatus: string): Promise<void> {
    await triggerWebhook({
      eventName: 'claim.status_changed',
      payload: {
        id: claimId,
        oldStatus,
        newStatus,
        ...claimData,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Trigger webhook when a claim is approved
   */
  async approved(claimId: string, claimData: any): Promise<void> {
    await triggerWebhook({
      eventName: 'claim.approved',
      payload: {
        id: claimId,
        ...claimData,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Trigger webhook when a claim is denied
   */
  async denied(claimId: string, claimData: any, reason: string): Promise<void> {
    await triggerWebhook({
      eventName: 'claim.denied',
      payload: {
        id: claimId,
        reason,
        ...claimData,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Encounter-related webhook triggers
export const encounterWebhooks = {
  /**
   * Trigger webhook when an encounter is created
   */
  async created(encounterId: string, encounterData: any): Promise<void> {
    await triggerWebhook({
      eventName: 'encounter.created',
      payload: {
        id: encounterId,
        ...encounterData,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Trigger webhook when an encounter status changes
   */
  async statusChanged(encounterId: string, encounterData: any, oldStatus: string, newStatus: string): Promise<void> {
    await triggerWebhook({
      eventName: 'encounter.status_changed',
      payload: {
        id: encounterId,
        oldStatus,
        newStatus,
        ...encounterData,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Trigger webhook when an encounter is completed
   */
  async completed(encounterId: string, encounterData: any): Promise<void> {
    await triggerWebhook({
      eventName: 'encounter.completed',
      payload: {
        id: encounterId,
        ...encounterData,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Auth-related webhook triggers
export const authWebhooks = {
  /**
   * Trigger webhook when a user is registered
   */
  async userRegistered(userId: string, userData: any): Promise<void> {
    await triggerWebhook({
      eventName: 'auth.user_registered',
      payload: {
        id: userId,
        // Be careful not to include sensitive info like passwords
        username: userData.username,
        email: userData.email,
        role: userData.role,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Trigger webhook when a user logs in
   */
  async userLoggedIn(userId: string, userData: any): Promise<void> {
    await triggerWebhook({
      eventName: 'auth.user_logged_in',
      payload: {
        id: userId,
        username: userData.username,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Trigger webhook when a user logs out
   */
  async userLoggedOut(userId: string, userData: any): Promise<void> {
    await triggerWebhook({
      eventName: 'auth.user_logged_out',
      payload: {
        id: userId,
        username: userData.username,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// FHIR-related webhook triggers
export const fhirWebhooks = {
  /**
   * Trigger webhook when a FHIR resource is created
   */
  async resourceCreated(resourceType: string, resourceId: string, resourceData: any): Promise<void> {
    await triggerWebhook({
      eventName: `fhir.${resourceType.toLowerCase()}.created`,
      payload: {
        resourceType,
        id: resourceId,
        data: resourceData,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Trigger webhook when a FHIR resource is updated
   */
  async resourceUpdated(resourceType: string, resourceId: string, resourceData: any): Promise<void> {
    await triggerWebhook({
      eventName: `fhir.${resourceType.toLowerCase()}.updated`,
      payload: {
        resourceType,
        id: resourceId,
        data: resourceData,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Trigger webhook when a FHIR resource is deleted
   */
  async resourceDeleted(resourceType: string, resourceId: string): Promise<void> {
    await triggerWebhook({
      eventName: `fhir.${resourceType.toLowerCase()}.deleted`,
      payload: {
        resourceType,
        id: resourceId,
        timestamp: new Date().toISOString()
      }
    });
  }
};