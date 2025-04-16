/**
 * External Payer Gateway
 * 
 * This service handles forwarding claims to external payers and processing their responses.
 * It supports both real-time and asynchronous claim processing with retry logic.
 */
import { v4 as uuidv4 } from 'uuid';
import { eq, and, not, asc, desc } from 'drizzle-orm';
import { claims, claimEvents, claimPayerForwards, Claim, ClaimPayerForward, InsertClaimEvent, InsertClaimPayerForward } from '@shared/claims-schema';
import logger from '../../logger';
import axios from 'axios';

interface PayerConnection {
  id: string;
  name: string;
  apiEndpoint?: string;
  apiAuthType?: 'basic' | 'bearer' | 'api-key';
  apiUsername?: string;
  apiPassword?: string;
  apiToken?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  supportsRealTime: boolean;
  retryInterval: number; // in milliseconds
  maxRetries: number;
}

interface PayerResponse {
  success: boolean;
  responseData?: any;
  errorDetails?: any;
  status?: string;
}

export class ExternalPayerGateway {
  private db: any; // Replace with proper type when available
  private payerConnections: Map<string, PayerConnection>;
  private retryQueue: Map<string, NodeJS.Timeout>;

  constructor(db: any) {
    this.db = db;
    this.payerConnections = new Map();
    this.retryQueue = new Map();
    
    // Initialize payer connections
    this.loadPayerConnections();
  }

  /**
   * Load payer connections from configuration
   * In a real implementation, this would load from a database
   */
  private async loadPayerConnections() {
    // This is a simplified version for the prototype
    // In a real system, we would load from a database table
    const defaultPayerConfig: PayerConnection = {
      id: 'default',
      name: 'Default Payer',
      apiEndpoint: 'https://api.defaultpayer.example.com/claims',
      apiAuthType: 'bearer',
      apiToken: process.env.DEFAULT_PAYER_TOKEN,
      supportsRealTime: false,
      retryInterval: 30 * 60 * 1000, // 30 minutes
      maxRetries: 5
    };

    // Add a default payer connection for demo purposes
    this.payerConnections.set('default', defaultPayerConfig);

    // In a real system, we would load from a database:
    /*
    const payerConnections = await this.db.select().from(payerConnections);
    for (const connection of payerConnections) {
      this.payerConnections.set(connection.id, connection);
    }
    */

    logger.info(`Loaded ${this.payerConnections.size} payer connections`);
  }

  /**
   * Submit a claim to an external payer
   * @param claimId The ID of the claim to submit
   * @returns A status indicating whether the claim was successfully submitted
   */
  async submitClaim(claimId: string): Promise<{
    success: boolean;
    forwardId?: string;
    status: string;
    message: string;
    nextAttempt?: Date;
  }> {
    try {
      logger.info(`Submitting claim ${claimId} to external payer`);
      
      // Get the claim
      const [claim] = await this.db
        .select()
        .from(claims)
        .where(eq(claims.id, claimId));
      
      if (!claim) {
        logger.error(`Claim ${claimId} not found`);
        return {
          success: false,
          status: 'ERROR',
          message: `Claim ${claimId} not found`
        };
      }
      
      // Get the payer connection
      const payerId = claim.payerId || 'default';
      const payerConnection = this.payerConnections.get(payerId);
      
      if (!payerConnection) {
        logger.error(`No payer connection found for payer ${payerId}`);
        
        // Update claim status
        await this.db
          .update(claims)
          .set({
            status: 'ERROR',
            lastStatusUpdate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(claims.id, claimId));
        
        // Log error event
        await this.logClaimEvent(claimId, 'ERROR', 'EXTERNAL_PAYER_ERROR', {
          error: `No payer connection found for payer ${payerId}`
        });
        
        return {
          success: false,
          status: 'ERROR',
          message: `No payer connection found for payer ${payerId}`
        };
      }
      
      // Create a forwarding attempt record
      const forwardId = uuidv4();
      const now = new Date();
      
      // Calculate the next attempt time
      const nextAttempt = new Date(now.getTime() + payerConnection.retryInterval);
      
      const forwardingAttempt: InsertClaimPayerForward = {
        id: forwardId,
        claimId,
        payerId,
        attemptCount: 1,
        status: 'QUEUED',
        createdAt: now,
        updatedAt: now,
        nextAttempt
      };
      
      await this.db
        .insert(claimPayerForwards)
        .values(forwardingAttempt);
      
      // Update claim status
      await this.db
        .update(claims)
        .set({
          status: 'SUBMITTED',
          lastStatusUpdate: now,
          updatedAt: now
        })
        .where(eq(claims.id, claimId));
      
      // Log event
      await this.logClaimEvent(claimId, 'SUBMITTED', 'EXTERNAL_PAYER_QUEUED', {
        forwardId,
        payerId
      });
      
      // Queue the actual submission (asynchronous)
      if (payerConnection.supportsRealTime) {
        // For real-time payers, try to send immediately
        this.sendClaimToPayer(forwardId).catch(error => {
          logger.error(`Failed to send claim to payer (real-time): ${error.message}`, { error });
        });
      } else {
        // For async payers, queue for later processing
        const timeoutId = setTimeout(() => {
          this.sendClaimToPayer(forwardId).catch(error => {
            logger.error(`Failed to send claim to payer (async): ${error.message}`, { error });
          });
          this.retryQueue.delete(forwardId);
        }, 5000); // Small delay for demo purposes
        
        this.retryQueue.set(forwardId, timeoutId);
      }
      
      return {
        success: true,
        forwardId,
        status: 'QUEUED',
        message: `Claim ${claimId} queued for submission to payer ${payerId}`,
        nextAttempt
      };
    } catch (error) {
      logger.error(`Error submitting claim ${claimId} to external payer`, { error });
      
      // Update claim status to error
      if (claimId) {
        await this.db
          .update(claims)
          .set({
            status: 'ERROR',
            lastStatusUpdate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(claims.id, claimId));
        
        // Log the error event
        await this.logClaimEvent(claimId, 'ERROR', 'EXTERNAL_PAYER_ERROR', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      return {
        success: false,
        status: 'ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Send a claim to the external payer
   * @param forwardId The ID of the forwarding attempt
   */
  async sendClaimToPayer(forwardId: string): Promise<void> {
    try {
      // Get the forwarding attempt
      const [forwardingAttempt] = await this.db
        .select()
        .from(claimPayerForwards)
        .where(eq(claimPayerForwards.id, forwardId));
      
      if (!forwardingAttempt) {
        logger.error(`Forwarding attempt ${forwardId} not found`);
        return;
      }
      
      // Get the claim
      const [claim] = await this.db
        .select()
        .from(claims)
        .where(eq(claims.id, forwardingAttempt.claimId));
      
      if (!claim) {
        logger.error(`Claim ${forwardingAttempt.claimId} not found`);
        
        // Update forwarding attempt
        await this.db
          .update(claimPayerForwards)
          .set({
            status: 'ERROR',
            errorDetails: { error: `Claim ${forwardingAttempt.claimId} not found` },
            updatedAt: new Date()
          })
          .where(eq(claimPayerForwards.id, forwardId));
        
        return;
      }
      
      // Get the line items
      const lineItems = await this.db
        .select()
        .from(claimLineItems)
        .where(eq(claimLineItems.claimId, claim.id));
      
      // Get the payer connection
      const payerId = forwardingAttempt.payerId || 'default';
      const payerConnection = this.payerConnections.get(payerId);
      
      if (!payerConnection) {
        logger.error(`No payer connection found for payer ${payerId}`);
        
        // Update forwarding attempt
        await this.db
          .update(claimPayerForwards)
          .set({
            status: 'ERROR',
            errorDetails: { error: `No payer connection found for payer ${payerId}` },
            updatedAt: new Date()
          })
          .where(eq(claimPayerForwards.id, forwardId));
        
        // Update claim status
        await this.db
          .update(claims)
          .set({
            status: 'ERROR',
            lastStatusUpdate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(claims.id, claim.id));
        
        // Log error event
        await this.logClaimEvent(claim.id, 'ERROR', 'EXTERNAL_PAYER_ERROR', {
          forwardId,
          error: `No payer connection found for payer ${payerId}`
        });
        
        return;
      }
      
      // Update forwarding attempt to SENDING status
      await this.db
        .update(claimPayerForwards)
        .set({
          status: 'SENDING',
          updatedAt: new Date()
        })
        .where(eq(claimPayerForwards.id, forwardId));
      
      logger.info(`Sending claim ${claim.id} to payer ${payerId} (attempt ${forwardingAttempt.attemptCount})`);
      
      // Prepare the claim for the payer
      // In a real system, this would transform to the required format (X12, FHIR, etc.)
      const claimData = {
        claimId: claim.id,
        patientId: claim.patientId,
        providerId: claim.providerId,
        organizationId: claim.organizationId,
        type: claim.type,
        serviceDate: claim.serviceDate,
        submissionDate: new Date(),
        totalAmount: lineItems.reduce((sum, item) => sum + (item.amount || 0), 0),
        lineItems: lineItems.map(item => ({
          serviceCode: item.serviceCode,
          description: item.description,
          amount: item.amount,
          quantity: item.quantity,
          serviceDate: item.serviceDate
        }))
      };
      
      // Send to payer
      // In a real system, this would use the appropriate protocol (API, SFTP, etc.)
      const payerResponse = await this.callPayerApi(payerConnection, claimData);
      
      // Update forwarding attempt based on response
      if (payerResponse.success) {
        await this.db
          .update(claimPayerForwards)
          .set({
            status: payerResponse.status || 'SENT',
            responseData: payerResponse.responseData,
            sentDate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(claimPayerForwards.id, forwardId));
        
        // Update claim status
        await this.db
          .update(claims)
          .set({
            status: 'PENDING',
            lastStatusUpdate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(claims.id, claim.id));
        
        // Log success event
        await this.logClaimEvent(claim.id, 'PENDING', 'EXTERNAL_PAYER_SENT', {
          forwardId,
          payerId
        });
        
        // Schedule checking for response
        this.scheduleResponseCheck(forwardId, payerConnection);
      } else {
        const now = new Date();
        const nextAttempt = forwardingAttempt.attemptCount >= payerConnection.maxRetries
          ? undefined
          : new Date(now.getTime() + payerConnection.retryInterval);
        
        const status = forwardingAttempt.attemptCount >= payerConnection.maxRetries
          ? 'FAILED'
          : 'FAILED_RETRY';
        
        await this.db
          .update(claimPayerForwards)
          .set({
            status,
            errorDetails: payerResponse.errorDetails,
            attemptCount: forwardingAttempt.attemptCount + 1,
            nextAttempt,
            updatedAt: now
          })
          .where(eq(claimPayerForwards.id, forwardId));
        
        // Update claim status if max retries reached
        if (forwardingAttempt.attemptCount >= payerConnection.maxRetries) {
          await this.db
            .update(claims)
            .set({
              status: 'FAILED',
              lastStatusUpdate: now,
              updatedAt: now
            })
            .where(eq(claims.id, claim.id));
          
          // Log failure event
          await this.logClaimEvent(claim.id, 'FAILED', 'EXTERNAL_PAYER_FAILED', {
            forwardId,
            payerId,
            attemptCount: forwardingAttempt.attemptCount,
            error: payerResponse.errorDetails
          });
        } else {
          // Schedule retry
          this.scheduleRetry(forwardId, payerConnection, forwardingAttempt.attemptCount);
          
          // Log retry event
          await this.logClaimEvent(claim.id, 'PENDING', 'EXTERNAL_PAYER_RETRY_SCHEDULED', {
            forwardId,
            payerId,
            attemptCount: forwardingAttempt.attemptCount,
            nextAttempt
          });
        }
      }
      
    } catch (error) {
      logger.error(`Error sending claim to payer (forward ID: ${forwardId})`, { error });
      
      // Get the forwarding attempt again (in case it changed)
      const [forwardingAttempt] = await this.db
        .select()
        .from(claimPayerForwards)
        .where(eq(claimPayerForwards.id, forwardId));
      
      if (!forwardingAttempt) return;
      
      // Get payer connection
      const payerId = forwardingAttempt.payerId || 'default';
      const payerConnection = this.payerConnections.get(payerId);
      
      if (!payerConnection) return;
      
      const now = new Date();
      const nextAttempt = forwardingAttempt.attemptCount >= payerConnection.maxRetries
        ? undefined
        : new Date(now.getTime() + payerConnection.retryInterval);
      
      const status = forwardingAttempt.attemptCount >= payerConnection.maxRetries
        ? 'FAILED'
        : 'FAILED_RETRY';
      
      // Update forwarding attempt
      await this.db
        .update(claimPayerForwards)
        .set({
          status,
          errorDetails: { error: error instanceof Error ? error.message : String(error) },
          attemptCount: forwardingAttempt.attemptCount + 1,
          nextAttempt,
          updatedAt: now
        })
        .where(eq(claimPayerForwards.id, forwardId));
      
      // If reaching max retries, update claim status
      if (forwardingAttempt.attemptCount >= payerConnection.maxRetries) {
        await this.db
          .update(claims)
          .set({
            status: 'FAILED',
            lastStatusUpdate: now,
            updatedAt: now
          })
          .where(eq(claims.id, forwardingAttempt.claimId));
        
        // Log failure event
        await this.logClaimEvent(forwardingAttempt.claimId, 'FAILED', 'EXTERNAL_PAYER_FAILED', {
          forwardId,
          payerId,
          attemptCount: forwardingAttempt.attemptCount,
          error: error instanceof Error ? error.message : String(error)
        });
      } else {
        // Schedule retry
        this.scheduleRetry(forwardId, payerConnection, forwardingAttempt.attemptCount);
        
        // Log retry event
        await this.logClaimEvent(forwardingAttempt.claimId, 'PENDING', 'EXTERNAL_PAYER_RETRY_SCHEDULED', {
          forwardId,
          payerId,
          attemptCount: forwardingAttempt.attemptCount,
          nextAttempt,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Call the payer's API to submit a claim
   * @param payerConnection The payer connection details
   * @param claimData The claim data to send
   * @returns The response from the payer
   */
  private async callPayerApi(
    payerConnection: PayerConnection,
    claimData: any
  ): Promise<PayerResponse> {
    try {
      // This is a simplified version for the prototype
      // In a real system, this would use the appropriate API or integration method
      
      // If no API endpoint is configured, simulate a response for demo purposes
      if (!payerConnection.apiEndpoint) {
        // Simulate success with 80% probability
        const simulatedSuccess = Math.random() < 0.8;
        
        if (simulatedSuccess) {
          return {
            success: true,
            status: 'SENT',
            responseData: {
              acknowledgment: 'SUCCESS',
              trackingId: uuidv4(),
              timestamp: new Date().toISOString()
            }
          };
        } else {
          return {
            success: false,
            status: 'FAILED',
            errorDetails: {
              errorCode: '400',
              errorMessage: 'Simulated error for testing purposes',
              timestamp: new Date().toISOString()
            }
          };
        }
      }
      
      // Configure the API request
      const headers: any = {
        'Content-Type': 'application/json'
      };
      
      // Add authentication
      if (payerConnection.apiAuthType === 'basic' && payerConnection.apiUsername && payerConnection.apiPassword) {
        const auth = Buffer.from(`${payerConnection.apiUsername}:${payerConnection.apiPassword}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      } else if (payerConnection.apiAuthType === 'bearer' && payerConnection.apiToken) {
        headers['Authorization'] = `Bearer ${payerConnection.apiToken}`;
      } else if (payerConnection.apiAuthType === 'api-key' && payerConnection.apiKeyName && payerConnection.apiKeyValue) {
        headers[payerConnection.apiKeyName] = payerConnection.apiKeyValue;
      }
      
      // Send the request to the payer
      const response = await axios.post(payerConnection.apiEndpoint, claimData, { headers });
      
      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          status: 'SENT',
          responseData: response.data
        };
      } else {
        return {
          success: false,
          status: 'FAILED',
          errorDetails: {
            statusCode: response.status,
            statusText: response.statusText,
            data: response.data
          }
        };
      }
    } catch (error) {
      logger.error(`Error calling payer API for ${payerConnection.name}`, { error });
      
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          status: 'FAILED',
          errorDetails: {
            statusCode: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
          }
        };
      } else {
        return {
          success: false,
          status: 'FAILED',
          errorDetails: {
            message: error instanceof Error ? error.message : String(error)
          }
        };
      }
    }
  }

  /**
   * Schedule a retry for a failed claim submission
   * @param forwardId The ID of the forwarding attempt
   * @param payerConnection The payer connection
   * @param attemptCount The current attempt count
   */
  private scheduleRetry(
    forwardId: string,
    payerConnection: PayerConnection,
    attemptCount: number
  ): void {
    // Calculate backoff interval (exponential for demo)
    const backoff = Math.min(
      30 * 60 * 1000, // 30 minutes max
      payerConnection.retryInterval * Math.pow(1.5, attemptCount - 1)
    );
    
    logger.info(`Scheduling retry for claim forwarding ${forwardId} in ${backoff / 1000} seconds`);
    
    // Clear any existing timer
    if (this.retryQueue.has(forwardId)) {
      clearTimeout(this.retryQueue.get(forwardId));
    }
    
    // Set the new timer
    const timeoutId = setTimeout(() => {
      this.sendClaimToPayer(forwardId).catch(error => {
        logger.error(`Failed to retry claim submission: ${error.message}`, { error });
      });
      this.retryQueue.delete(forwardId);
    }, backoff);
    
    this.retryQueue.set(forwardId, timeoutId);
  }

  /**
   * Schedule checking for a response to a claim submission
   * @param forwardId The ID of the forwarding attempt
   * @param payerConnection The payer connection
   */
  private scheduleResponseCheck(
    forwardId: string,
    payerConnection: PayerConnection
  ): void {
    // For demo purposes, use a short interval
    const checkInterval = 60 * 1000; // 1 minute
    
    logger.info(`Scheduling response check for claim forwarding ${forwardId} in ${checkInterval / 1000} seconds`);
    
    // Clear any existing timer
    if (this.retryQueue.has(`check_${forwardId}`)) {
      clearTimeout(this.retryQueue.get(`check_${forwardId}`));
    }
    
    // Set the new timer
    const timeoutId = setTimeout(() => {
      this.checkClaimStatus(forwardId).catch(error => {
        logger.error(`Failed to check claim status: ${error.message}`, { error });
      });
      this.retryQueue.delete(`check_${forwardId}`);
    }, checkInterval);
    
    this.retryQueue.set(`check_${forwardId}`, timeoutId);
  }

  /**
   * Check the status of a claim submission
   * @param forwardId The ID of the forwarding attempt
   */
  async checkClaimStatus(forwardId: string): Promise<void> {
    try {
      // Get the forwarding attempt
      const [forwardingAttempt] = await this.db
        .select()
        .from(claimPayerForwards)
        .where(eq(claimPayerForwards.id, forwardId));
      
      if (!forwardingAttempt) {
        logger.error(`Forwarding attempt ${forwardId} not found`);
        return;
      }
      
      // Skip if not in a sent state
      if (!['SENT', 'ACKNOWLEDGED'].includes(forwardingAttempt.status)) {
        return;
      }
      
      // Get the claim
      const [claim] = await this.db
        .select()
        .from(claims)
        .where(eq(claims.id, forwardingAttempt.claimId));
      
      if (!claim) {
        logger.error(`Claim ${forwardingAttempt.claimId} not found`);
        return;
      }
      
      // Get payer connection
      const payerId = forwardingAttempt.payerId || 'default';
      const payerConnection = this.payerConnections.get(payerId);
      
      if (!payerConnection) {
        logger.error(`No payer connection found for payer ${payerId}`);
        return;
      }
      
      logger.info(`Checking status for claim ${claim.id} with payer ${payerId}`);
      
      // Call payer API to check status
      // This is simplified for the prototype
      const statusResponse = await this.checkPayerClaimStatus(
        payerConnection,
        claim.id,
        forwardingAttempt.responseData?.trackingId
      );
      
      // Update status based on response
      if (statusResponse.success) {
        const status = statusResponse.status || 'ACKNOWLEDGED';
        
        await this.db
          .update(claimPayerForwards)
          .set({
            status,
            responseData: statusResponse.responseData,
            updatedAt: new Date()
          })
          .where(eq(claimPayerForwards.id, forwardId));
        
        // Update claim status
        let claimStatus = 'PENDING';
        
        if (status === 'COMPLETED') {
          claimStatus = 'COMPLETE';
        } else if (status === 'REJECTED') {
          claimStatus = 'REJECTED';
        }
        
        await this.db
          .update(claims)
          .set({
            status: claimStatus,
            lastStatusUpdate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(claims.id, claim.id));
        
        // Log event
        await this.logClaimEvent(claim.id, claimStatus, `EXTERNAL_PAYER_${status}`, {
          forwardId,
          payerId,
          statusData: statusResponse.responseData
        });
        
        // If not final status, schedule another check
        if (!['COMPLETED', 'REJECTED'].includes(status)) {
          this.scheduleResponseCheck(forwardId, payerConnection);
        }
      } else {
        // Schedule another check
        this.scheduleResponseCheck(forwardId, payerConnection);
      }
    } catch (error) {
      logger.error(`Error checking claim status for forwarding ${forwardId}`, { error });
      
      // Get the forwarding attempt again
      const [forwardingAttempt] = await this.db
        .select()
        .from(claimPayerForwards)
        .where(eq(claimPayerForwards.id, forwardId));
      
      if (!forwardingAttempt) return;
      
      // Get payer connection
      const payerId = forwardingAttempt.payerId || 'default';
      const payerConnection = this.payerConnections.get(payerId);
      
      if (!payerConnection) return;
      
      // Schedule another check
      this.scheduleResponseCheck(forwardId, payerConnection);
    }
  }

  /**
   * Check the status of a claim with the payer
   * @param payerConnection The payer connection
   * @param claimId The ID of the claim
   * @param trackingId The tracking ID from the payer
   * @returns The response from the payer
   */
  private async checkPayerClaimStatus(
    payerConnection: PayerConnection,
    claimId: string,
    trackingId?: string
  ): Promise<PayerResponse> {
    try {
      // This is a simplified version for the prototype
      // In a real system, this would call the payer's API to check the status
      
      // If no API endpoint, simulate a response for demo purposes
      if (!payerConnection.apiEndpoint) {
        // For demo, return a random status
        const statusOptions = ['ACKNOWLEDGED', 'IN_PROCESS', 'COMPLETED', 'REJECTED'];
        const randomIndex = Math.floor(Math.random() * statusOptions.length);
        const simulatedStatus = statusOptions[randomIndex];
        
        return {
          success: true,
          status: simulatedStatus,
          responseData: {
            status: simulatedStatus,
            trackingId: trackingId || uuidv4(),
            timestamp: new Date().toISOString(),
            payerId: payerConnection.id,
            claimId
          }
        };
      }
      
      // In a real system, we would call the payer's API here
      return {
        success: true,
        status: 'ACKNOWLEDGED', // Default for prototype
        responseData: {
          status: 'ACKNOWLEDGED',
          trackingId: trackingId || uuidv4(),
          timestamp: new Date().toISOString(),
          payerId: payerConnection.id,
          claimId
        }
      };
    } catch (error) {
      logger.error(`Error checking payer claim status for ${payerConnection.name}`, { error });
      
      return {
        success: false,
        status: 'ERROR',
        errorDetails: {
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Get pending forwarding attempts that need retry or status check
   */
  async getQueuedAndPendingForwards(): Promise<ClaimPayerForward[]> {
    try {
      const now = new Date();
      
      // Get forwarding attempts that need action
      const pendingForwards = await this.db
        .select()
        .from(claimPayerForwards)
        .where(
          and(
            // Get QUEUED and FAILED_RETRY with nextAttempt <= now
            or(
              and(
                eq(claimPayerForwards.status, 'QUEUED'),
                not(eq(claimPayerForwards.status, 'COMPLETED')),
                not(eq(claimPayerForwards.status, 'FAILED')),
                not(eq(claimPayerForwards.status, 'REJECTED'))
              ),
              and(
                eq(claimPayerForwards.status, 'FAILED_RETRY'),
                or(
                  eq(claimPayerForwards.nextAttempt, null),
                  sql`${claimPayerForwards.nextAttempt} <= ${now}`
                )
              )
            )
          )
        )
        .orderBy(asc(claimPayerForwards.nextAttempt), asc(claimPayerForwards.updatedAt));
      
      return pendingForwards;
    } catch (error) {
      logger.error('Error getting pending forwarding attempts', { error });
      return [];
    }
  }

  /**
   * Process any pending forwarding attempts
   */
  async processPendingForwards(): Promise<void> {
    try {
      // Get pending forwards that need to be processed
      const pendingForwards = await this.getQueuedAndPendingForwards();
      
      logger.info(`Processing ${pendingForwards.length} pending forwarding attempts`);
      
      // Process each pending forward
      for (const forward of pendingForwards) {
        // Skip if already in retry queue
        if (
          this.retryQueue.has(forward.id) ||
          this.retryQueue.has(`check_${forward.id}`)
        ) {
          continue;
        }
        
        // Process the forward
        if (['QUEUED', 'FAILED_RETRY'].includes(forward.status)) {
          this.sendClaimToPayer(forward.id).catch(error => {
            logger.error(`Failed to process pending forward ${forward.id}: ${error.message}`, { error });
          });
        } else if (['SENT', 'ACKNOWLEDGED'].includes(forward.status)) {
          this.checkClaimStatus(forward.id).catch(error => {
            logger.error(`Failed to check status for forward ${forward.id}: ${error.message}`, { error });
          });
        }
      }
    } catch (error) {
      logger.error('Error processing pending forwarding attempts', { error });
    }
  }

  /**
   * Initialize periodic processing of pending forwards
   * @param intervalMs The interval in milliseconds
   */
  startPeriodicProcessing(intervalMs: number = 5 * 60 * 1000): void {
    // Process immediately on startup
    this.processPendingForwards().catch(error => {
      logger.error('Error in initial processing of pending forwards', { error });
    });
    
    // Then set up interval
    setInterval(() => {
      this.processPendingForwards().catch(error => {
        logger.error('Error in periodic processing of pending forwards', { error });
      });
    }, intervalMs);
  }

  /**
   * Cleanup function to clear all timers
   */
  cleanup(): void {
    // Clear all timers
    for (const timeoutId of this.retryQueue.values()) {
      clearTimeout(timeoutId);
    }
    
    this.retryQueue.clear();
  }

  /**
   * Log a claim event
   * @param claimId The claim ID
   * @param status The claim status
   * @param eventType The event type
   * @param details Additional details
   */
  private async logClaimEvent(
    claimId: string,
    status: string,
    eventType: string,
    details: any
  ): Promise<void> {
    try {
      const eventData: InsertClaimEvent = {
        id: uuidv4(),
        claimId,
        eventType,
        status,
        timestamp: new Date(),
        details
      };
      
      await this.db.insert(claimEvents).values(eventData);
    } catch (error) {
      logger.error(`Error logging claim event for claim ${claimId}`, { error });
      // Event logging errors shouldn't fail the overall processing
    }
  }
}