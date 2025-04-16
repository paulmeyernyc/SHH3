/**
 * Smart Health Hub - Appointment Scheduling Service
 * 
 * This service manages all aspects of appointment scheduling, from 
 * provider availability management to patient booking orchestration.
 * It follows FHIR standards while supporting SHH's specific requirements.
 */

import { v4 as uuidv4 } from 'uuid';
import { eq, and, or, between, lte, gte, desc, sql, inArray } from 'drizzle-orm';
import { db } from '../../db';
import logger from '../../../server/utils/logger';
import postgres from 'postgres';
import { 
  schedules, 
  slots,
  scheduleRecurrenceRules,
  scheduleBlackoutPeriods,
  appointments,
  appointmentHistory,
  calendarSync,
  type Schedule,
  type Slot,
  type RecurrenceRule,
  type BlackoutPeriod,
  type Appointment,
  type AppointmentHistory,
  type CalendarSync,
  type InsertSchedule,
  type InsertSlot,
  type InsertRecurrenceRule,
  type InsertBlackoutPeriod,
  type InsertAppointment,
  type InsertAppointmentHistory,
  type InsertCalendarSync
} from '../../../shared/scheduling-schema';

// Type for schedule search params
export interface ScheduleSearchParams {
  providerId?: string;
  locationId?: string;
  serviceType?: string;
  specialty?: string;
  startDate?: Date;
  endDate?: Date;
}

// Type for slot search params
export interface SlotSearchParams {
  providerId?: string;
  locationId?: string;
  serviceType?: string;
  specialty?: string;
  startDateTime?: Date;
  endDateTime?: Date;
  status?: string;
}

// Type for appointment search params
export interface AppointmentSearchParams {
  patientId?: string;
  providerId?: string;
  locationId?: string;
  appointmentType?: string;
  specialty?: string;
  status?: string;
  startDateTime?: Date;
  endDateTime?: Date;
}

// Type for eligibility check response
export interface EligibilityCheckResult {
  eligible: boolean;
  message?: string;
  details?: any;
}

// Type for prior auth check response
export interface PriorAuthCheckResult {
  required: boolean;
  approved?: boolean;
  authId?: string;
  message?: string;
  details?: any;
}

/**
 * Appointment Scheduling Service
 */
export class SchedulingService {
  /**
   * Initialize the scheduling service
   */
  constructor() {
    logger.info('Initializing Appointment Scheduling Service');
  }

  // ========== SCHEDULE MANAGEMENT ==========

  /**
   * Create a new provider schedule
   */
  async createSchedule(data: InsertSchedule): Promise<Schedule> {
    logger.debug('Creating new schedule', { 
      providerId: data.providerId, 
      serviceType: data.serviceType 
    });
    
    const [schedule] = await db.insert(schedules)
      .values({
        ...data,
        id: data.id || uuidv4(),
        updatedAt: new Date()
      })
      .returning();
    
    return schedule;
  }

  /**
   * Get a schedule by ID
   */
  async getSchedule(scheduleId: string): Promise<Schedule | undefined> {
    const [schedule] = await db.select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId));
    
    return schedule;
  }

  /**
   * Update a schedule
   */
  async updateSchedule(
    scheduleId: string, 
    data: Partial<Omit<InsertSchedule, 'id'>>
  ): Promise<Schedule | undefined> {
    const [schedule] = await db.update(schedules)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(schedules.id, scheduleId))
      .returning();
    
    return schedule;
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<boolean> {
    // First check if there are any booked appointments for this schedule
    const existingAppointments = await db.select({ count: sql<number>`count(*)` })
      .from(appointments)
      .innerJoin(slots, eq(appointments.slotId, slots.id))
      .where(
        and(
          eq(slots.scheduleId, scheduleId),
          eq(appointments.status, 'booked')
        )
      );
    
    if (existingAppointments[0]?.count > 0) {
      throw new Error(`Cannot delete schedule with existing appointments (${existingAppointments[0].count} found)`);
    }
    
    // Delete the schedule (cascades to slots, recurrence rules, and blackouts)
    const result = await db.delete(schedules)
      .where(eq(schedules.id, scheduleId))
      .returning({ id: schedules.id });
    
    return result.length > 0;
  }

  /**
   * Search for schedules based on criteria
   */
  async searchSchedules(params: ScheduleSearchParams): Promise<Schedule[]> {
    let query = db.select().from(schedules);
    
    // Apply filters
    if (params.providerId) {
      query = query.where(eq(schedules.providerId, params.providerId));
    }
    
    if (params.locationId) {
      query = query.where(eq(schedules.locationId, params.locationId));
    }
    
    if (params.serviceType) {
      query = query.where(eq(schedules.serviceType, params.serviceType));
    }
    
    if (params.specialty) {
      query = query.where(eq(schedules.specialty, params.specialty));
    }
    
    // Date range filtering
    if (params.startDate) {
      query = query.where(
        or(
          sql`${schedules.endDate} IS NULL`,
          gte(schedules.endDate, params.startDate)
        )
      );
    }
    
    if (params.endDate) {
      query = query.where(
        or(
          sql`${schedules.startDate} IS NULL`,
          lte(schedules.startDate, params.endDate)
        )
      );
    }
    
    // Status is active by default
    query = query.where(eq(schedules.status, 'active'));
    
    // Order by name
    query = query.orderBy(schedules.name);
    
    return await query;
  }

  // ========== RECURRENCE RULES MANAGEMENT ==========

  /**
   * Create a new recurrence rule for a schedule
   */
  async createRecurrenceRule(data: InsertRecurrenceRule): Promise<RecurrenceRule> {
    const [rule] = await db.insert(scheduleRecurrenceRules)
      .values({
        ...data,
        id: data.id || uuidv4(),
        updatedAt: new Date()
      })
      .returning();
    
    return rule;
  }

  /**
   * Get recurrence rules for a schedule
   */
  async getRecurrenceRules(scheduleId: string): Promise<RecurrenceRule[]> {
    return await db.select()
      .from(scheduleRecurrenceRules)
      .where(eq(scheduleRecurrenceRules.scheduleId, scheduleId));
  }

  /**
   * Update a recurrence rule
   */
  async updateRecurrenceRule(
    ruleId: string, 
    data: Partial<Omit<InsertRecurrenceRule, 'id' | 'scheduleId'>>
  ): Promise<RecurrenceRule | undefined> {
    const [rule] = await db.update(scheduleRecurrenceRules)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(scheduleRecurrenceRules.id, ruleId))
      .returning();
    
    return rule;
  }

  /**
   * Delete a recurrence rule
   */
  async deleteRecurrenceRule(ruleId: string): Promise<boolean> {
    const result = await db.delete(scheduleRecurrenceRules)
      .where(eq(scheduleRecurrenceRules.id, ruleId))
      .returning({ id: scheduleRecurrenceRules.id });
    
    return result.length > 0;
  }

  // ========== BLACKOUT PERIODS MANAGEMENT ==========

  /**
   * Create a new blackout period for a schedule
   */
  async createBlackoutPeriod(data: InsertBlackoutPeriod): Promise<BlackoutPeriod> {
    const [blackout] = await db.insert(scheduleBlackoutPeriods)
      .values({
        ...data,
        id: data.id || uuidv4(),
        updatedAt: new Date()
      })
      .returning();
    
    return blackout;
  }

  /**
   * Get blackout periods for a schedule
   */
  async getBlackoutPeriods(
    scheduleId: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<BlackoutPeriod[]> {
    let query = db.select()
      .from(scheduleBlackoutPeriods)
      .where(eq(scheduleBlackoutPeriods.scheduleId, scheduleId));
    
    // Apply date filters if provided
    if (startDate && endDate) {
      query = query.where(
        or(
          // Blackout starts within the date range
          between(scheduleBlackoutPeriods.startDateTime, startDate, endDate),
          // Blackout ends within the date range
          between(scheduleBlackoutPeriods.endDateTime, startDate, endDate),
          // Blackout spans the entire date range
          and(
            lte(scheduleBlackoutPeriods.startDateTime, startDate),
            gte(scheduleBlackoutPeriods.endDateTime, endDate)
          )
        )
      );
    } else if (startDate) {
      query = query.where(gte(scheduleBlackoutPeriods.endDateTime, startDate));
    } else if (endDate) {
      query = query.where(lte(scheduleBlackoutPeriods.startDateTime, endDate));
    }
    
    return await query;
  }

  /**
   * Update a blackout period
   */
  async updateBlackoutPeriod(
    blackoutId: string, 
    data: Partial<Omit<InsertBlackoutPeriod, 'id' | 'scheduleId'>>
  ): Promise<BlackoutPeriod | undefined> {
    const [blackout] = await db.update(scheduleBlackoutPeriods)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(scheduleBlackoutPeriods.id, blackoutId))
      .returning();
    
    return blackout;
  }

  /**
   * Delete a blackout period
   */
  async deleteBlackoutPeriod(blackoutId: string): Promise<boolean> {
    const result = await db.delete(scheduleBlackoutPeriods)
      .where(eq(scheduleBlackoutPeriods.id, blackoutId))
      .returning({ id: scheduleBlackoutPeriods.id });
    
    return result.length > 0;
  }

  // ========== SLOT MANAGEMENT ==========

  /**
   * Create a single slot
   */
  async createSlot(data: InsertSlot): Promise<Slot> {
    // Check for conflicts with existing slots
    const existingSlots = await db.select()
      .from(slots)
      .where(
        and(
          eq(slots.scheduleId, data.scheduleId),
          or(
            // Slot starts during an existing slot
            between(data.startDateTime, slots.startDateTime, slots.endDateTime),
            // Slot ends during an existing slot
            between(data.endDateTime, slots.startDateTime, slots.endDateTime),
            // Slot completely contains an existing slot
            and(
              lte(data.startDateTime, slots.startDateTime),
              gte(data.endDateTime, slots.endDateTime)
            )
          )
        )
      );
    
    if (existingSlots.length > 0 && !data.overbooked) {
      throw new Error('Slot conflicts with existing slots');
    }
    
    // Check for conflicts with blackout periods
    const blackouts = await this.getBlackoutPeriods(
      data.scheduleId, 
      data.startDateTime, 
      data.endDateTime
    );
    
    if (blackouts.length > 0) {
      throw new Error('Slot conflicts with blackout period');
    }
    
    // Create the slot
    const [slot] = await db.insert(slots)
      .values({
        ...data,
        id: data.id || uuidv4(),
        updatedAt: new Date()
      })
      .returning();
    
    return slot;
  }

  /**
   * Create multiple slots in bulk
   */
  async createSlots(slotsData: InsertSlot[]): Promise<Slot[]> {
    if (slotsData.length === 0) {
      return [];
    }
    
    // Group by schedule for more efficient validation
    const slotsBySchedule: Record<string, InsertSlot[]> = {};
    
    for (const slot of slotsData) {
      if (!slotsBySchedule[slot.scheduleId]) {
        slotsBySchedule[slot.scheduleId] = [];
      }
      slotsBySchedule[slot.scheduleId].push(slot);
    }
    
    const createdSlots: Slot[] = [];
    
    // Process each schedule's slots
    for (const scheduleId of Object.keys(slotsBySchedule)) {
      const schedulesSlots = slotsBySchedule[scheduleId];
      
      // Find date range for all slots
      const minStartDate = new Date(Math.min(
        ...schedulesSlots.map(s => s.startDateTime.getTime())
      ));
      
      const maxEndDate = new Date(Math.max(
        ...schedulesSlots.map(s => s.endDateTime.getTime())
      ));
      
      // Check for conflicts with blackout periods
      const blackouts = await this.getBlackoutPeriods(
        scheduleId, 
        minStartDate, 
        maxEndDate
      );
      
      if (blackouts.length > 0 && !schedulesSlots[0].overbooked) {
        throw new Error('Some slots conflict with blackout periods');
      }
      
      // Check for conflicts with existing slots (only if not allowing overbooking)
      if (!schedulesSlots[0].overbooked) {
        const existingSlots = await db.select()
          .from(slots)
          .where(
            and(
              eq(slots.scheduleId, scheduleId),
              between(slots.startDateTime, minStartDate, maxEndDate)
            )
          );
        
        if (existingSlots.length > 0) {
          // Check each slot for conflicts
          for (const newSlot of schedulesSlots) {
            const conflicts = existingSlots.some(existingSlot => 
              (newSlot.startDateTime < existingSlot.endDateTime && 
               newSlot.endDateTime > existingSlot.startDateTime)
            );
            
            if (conflicts) {
              throw new Error('Some slots conflict with existing slots');
            }
          }
        }
      }
      
      // Prepare all slots for insertion with IDs
      const slotsToInsert = schedulesSlots.map(slot => ({
        ...slot,
        id: slot.id || uuidv4(),
        updatedAt: new Date()
      }));
      
      // Insert all slots for this schedule
      const result = await db.insert(slots)
        .values(slotsToInsert)
        .returning();
      
      createdSlots.push(...result);
    }
    
    return createdSlots;
  }

  /**
   * Get a slot by ID
   */
  async getSlot(slotId: string): Promise<Slot | undefined> {
    const [slot] = await db.select()
      .from(slots)
      .where(eq(slots.id, slotId));
    
    return slot;
  }

  /**
   * Update a slot
   */
  async updateSlot(
    slotId: string, 
    data: Partial<Omit<InsertSlot, 'id' | 'scheduleId'>>
  ): Promise<Slot | undefined> {
    // Check if slot has an appointment
    const [slot] = await db.select()
      .from(slots)
      .where(eq(slots.id, slotId));
    
    if (!slot) {
      throw new Error('Slot not found');
    }
    
    if (slot.appointmentId && (data.startDateTime || data.endDateTime || data.status === 'free')) {
      throw new Error('Cannot update time or status of a slot with an appointment');
    }
    
    const [updatedSlot] = await db.update(slots)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(slots.id, slotId))
      .returning();
    
    return updatedSlot;
  }

  /**
   * Delete a slot
   */
  async deleteSlot(slotId: string): Promise<boolean> {
    // Check if slot has an appointment
    const [slot] = await db.select()
      .from(slots)
      .where(eq(slots.id, slotId));
    
    if (!slot) {
      return false;
    }
    
    if (slot.appointmentId) {
      throw new Error('Cannot delete a slot with an appointment');
    }
    
    const result = await db.delete(slots)
      .where(eq(slots.id, slotId))
      .returning({ id: slots.id });
    
    return result.length > 0;
  }

  /**
   * Search for available slots based on criteria
   */
  async searchAvailableSlots(params: SlotSearchParams): Promise<Slot[]> {
    // Start with a join to get schedule info
    let query = db.select({
      slot: slots
    })
    .from(slots)
    .innerJoin(schedules, eq(slots.scheduleId, schedules.id));
    
    // Apply filters related to schedule
    if (params.providerId) {
      query = query.where(eq(schedules.providerId, params.providerId));
    }
    
    if (params.locationId) {
      query = query.where(eq(schedules.locationId, params.locationId));
    }
    
    if (params.serviceType) {
      query = query.where(eq(schedules.serviceType, params.serviceType));
    }
    
    if (params.specialty) {
      query = query.where(eq(schedules.specialty, params.specialty));
    }
    
    // Apply filters related to slot
    if (params.startDateTime) {
      query = query.where(gte(slots.startDateTime, params.startDateTime));
    }
    
    if (params.endDateTime) {
      query = query.where(lte(slots.endDateTime, params.endDateTime));
    }
    
    // By default, only show free slots
    query = query.where(eq(slots.status, params.status || 'free'));
    
    // Order by date and time
    query = query.orderBy(slots.startDateTime);
    
    const results = await query;
    return results.map(r => r.slot);
  }

  /**
   * Generate slots based on recurrence rules
   */
  async generateSlotsFromRules(
    scheduleId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Slot[]> {
    // Get the schedule details
    const schedule = await this.getSchedule(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    
    // Get recurrence rules for the schedule
    const rules = await this.getRecurrenceRules(scheduleId);
    if (rules.length === 0) {
      return []; // No rules to generate slots from
    }
    
    // Get blackout periods for the date range
    const blackouts = await this.getBlackoutPeriods(scheduleId, startDate, endDate);
    
    // Get existing slots for the date range to avoid duplicates
    const existingSlots = await db.select()
      .from(slots)
      .where(
        and(
          eq(slots.scheduleId, scheduleId),
          gte(slots.startDateTime, startDate),
          lte(slots.endDateTime, endDate)
        )
      );
    
    const slotsToCreate: InsertSlot[] = [];
    
    // For each day in the date range
    const currentDate = new Date(startDate);
    const endDateValue = endDate.getTime();
    
    while (currentDate.getTime() <= endDateValue) {
      const dayOfWeek = ((currentDate.getDay() + 6) % 7) + 1; // Convert to 1-7 (Monday is 1)
      const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Find rules that apply to this day
      for (const rule of rules) {
        if (!rule.isActive) continue;
        
        // Skip if rule is not effective yet or has expired
        if (rule.effectiveFrom && new Date(rule.effectiveFrom) > currentDate) continue;
        if (rule.effectiveTo && new Date(rule.effectiveTo) < currentDate) continue;
        
        // Check if this day of week is included in the rule
        const daysArray = rule.daysOfWeek.split(',').map(d => parseInt(d.trim()));
        if (!daysArray.includes(dayOfWeek)) continue;
        
        // Calculate slot times for this day
        const [startHour, startMinute] = rule.startTime.split(':').map(n => parseInt(n));
        const [endHour, endMinute] = rule.endTime.split(':').map(n => parseInt(n));
        
        // Create a slot for each time period in the rule
        let slotStart = new Date(currentDate);
        slotStart.setHours(startHour, startMinute, 0, 0);
        
        const ruleEndTime = new Date(currentDate);
        ruleEndTime.setHours(endHour, endMinute, 0, 0);
        
        while (slotStart < ruleEndTime) {
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotStart.getMinutes() + rule.slotDurationMinutes);
          
          // Don't create slots past the rule end time
          if (slotEnd > ruleEndTime) break;
          
          // Check for conflicts with blackout periods
          const isInBlackout = blackouts.some(blackout => 
            slotStart < blackout.endDateTime && 
            slotEnd > blackout.startDateTime
          );
          
          if (!isInBlackout) {
            // Check for duplicates with existing slots
            const isDuplicate = existingSlots.some(existingSlot => 
              slotStart.getTime() === existingSlot.startDateTime.getTime() && 
              slotEnd.getTime() === existingSlot.endDateTime.getTime()
            );
            
            if (!isDuplicate) {
              slotsToCreate.push({
                id: uuidv4(),
                scheduleId,
                startDateTime: slotStart,
                endDateTime: slotEnd,
                status: 'free',
                overbooked: false,
                maxAppointments: 1,
                createdBy: 'system'
              });
            }
          }
          
          // Move to next slot start time
          slotStart = new Date(slotEnd);
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Create all the generated slots
    return await this.createSlots(slotsToCreate);
  }

  // ========== APPOINTMENT MANAGEMENT ==========

  /**
   * Create a new appointment
   */
  async createAppointment(data: InsertAppointment): Promise<Appointment> {
    // Start a transaction for this booking
    return await db.transaction(async (tx) => {
      // If a slotId is provided, check if it's available and lock it
      if (data.slotId) {
        const [slot] = await tx.select()
          .from(slots)
          .where(
            and(
              eq(slots.id, data.slotId),
              eq(slots.status, 'free')
            )
          )
          .forUpdate(); // Lock the row
        
        if (!slot) {
          throw new Error('Slot is not available');
        }
        
        // Update the slot status to busy and link it to this appointment
        const appointmentId = data.id || uuidv4();
        
        await tx.update(slots)
          .set({
            status: 'busy',
            appointmentId,
            updatedAt: new Date()
          })
          .where(eq(slots.id, data.slotId));
        
        // Create the appointment using the slot's date/time
        const [appointment] = await tx.insert(appointments)
          .values({
            ...data,
            id: appointmentId,
            startDateTime: slot.startDateTime,
            endDateTime: slot.endDateTime,
            updatedAt: new Date()
          })
          .returning();
        
        // Create an appointment history record
        await tx.insert(appointmentHistory)
          .values({
            appointmentId: appointment.id,
            statusFrom: null,
            statusTo: appointment.status,
            changedBy: 'system',
            reason: 'Initial booking'
          });
        
        return appointment;
      } 
      // If no slotId but we have startDateTime and endDateTime, create without a slot
      else if (data.startDateTime && data.endDateTime) {
        const [appointment] = await tx.insert(appointments)
          .values({
            ...data,
            id: data.id || uuidv4(),
            updatedAt: new Date()
          })
          .returning();
        
        // Create an appointment history record
        await tx.insert(appointmentHistory)
          .values({
            appointmentId: appointment.id,
            statusFrom: null,
            statusTo: appointment.status,
            changedBy: 'system',
            reason: 'Initial booking'
          });
        
        return appointment;
      } else {
        throw new Error('Either slotId or startDateTime+endDateTime must be provided');
      }
    });
  }

  /**
   * Get an appointment by ID
   */
  async getAppointment(appointmentId: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId));
    
    return appointment;
  }

  /**
   * Update an appointment
   */
  async updateAppointment(
    appointmentId: string,
    data: Partial<Omit<InsertAppointment, 'id'>>,
    changedBy: string,
    reason?: string
  ): Promise<Appointment | undefined> {
    // Start a transaction for this update
    return await db.transaction(async (tx) => {
      // Get the current appointment
      const [appointment] = await tx.select()
        .from(appointments)
        .where(eq(appointments.id, appointmentId));
      
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      
      // Handle status changes
      const statusChanged = data.status && data.status !== appointment.status;
      const oldStatus = appointment.status;
      
      // Handle slot changes
      const slotChanged = data.slotId && data.slotId !== appointment.slotId;
      
      // If slot is changing, validate and update slots
      if (slotChanged) {
        // Release the old slot if it exists
        if (appointment.slotId) {
          await tx.update(slots)
            .set({
              status: 'free',
              appointmentId: null,
              updatedAt: new Date()
            })
            .where(eq(slots.id, appointment.slotId));
        }
        
        // Reserve the new slot
        const [newSlot] = await tx.select()
          .from(slots)
          .where(
            and(
              eq(slots.id, data.slotId!),
              eq(slots.status, 'free')
            )
          )
          .forUpdate(); // Lock the row
        
        if (!newSlot) {
          throw new Error('New slot is not available');
        }
        
        await tx.update(slots)
          .set({
            status: 'busy',
            appointmentId,
            updatedAt: new Date()
          })
          .where(eq(slots.id, data.slotId));
        
        // If using a new slot, update appointment times to match
        data.startDateTime = newSlot.startDateTime;
        data.endDateTime = newSlot.endDateTime;
      } 
      // If cancelling but not changing slot, release the slot
      else if (statusChanged && data.status === 'cancelled' && appointment.slotId) {
        await tx.update(slots)
          .set({
            status: 'free',
            appointmentId: null,
            updatedAt: new Date()
          })
          .where(eq(slots.id, appointment.slotId));
      }
      
      // Update the appointment
      const [updatedAppointment] = await tx.update(appointments)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(appointments.id, appointmentId))
        .returning();
      
      // Record the history if status changed
      if (statusChanged) {
        await tx.insert(appointmentHistory)
          .values({
            appointmentId,
            statusFrom: oldStatus,
            statusTo: data.status,
            changedBy,
            reason: reason || 'Status updated',
            notes: data.cancelReason
          });
      }
      
      return updatedAppointment;
    });
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(
    appointmentId: string,
    cancelReason: string,
    cancelledBy: string
  ): Promise<Appointment | undefined> {
    return await this.updateAppointment(
      appointmentId,
      {
        status: 'cancelled',
        cancelReason
      },
      cancelledBy,
      'Appointment cancelled'
    );
  }

  /**
   * Search for appointments based on criteria
   */
  async searchAppointments(params: AppointmentSearchParams): Promise<Appointment[]> {
    let query = db.select()
      .from(appointments);
    
    // Apply filters
    if (params.patientId) {
      query = query.where(eq(appointments.patientId, params.patientId));
    }
    
    if (params.providerId) {
      query = query.where(eq(appointments.providerId, params.providerId));
    }
    
    if (params.locationId) {
      query = query.where(eq(appointments.locationId, params.locationId));
    }
    
    if (params.appointmentType) {
      query = query.where(eq(appointments.appointmentType, params.appointmentType));
    }
    
    if (params.specialty) {
      query = query.where(eq(appointments.specialty, params.specialty));
    }
    
    if (params.status) {
      query = query.where(eq(appointments.status, params.status));
    }
    
    // Apply date filters
    if (params.startDateTime) {
      query = query.where(gte(appointments.startDateTime, params.startDateTime));
    }
    
    if (params.endDateTime) {
      query = query.where(lte(appointments.endDateTime, params.endDateTime));
    }
    
    // Order by date and time
    query = query.orderBy(appointments.startDateTime);
    
    return await query;
  }

  /**
   * Get appointment history
   */
  async getAppointmentHistory(appointmentId: string): Promise<AppointmentHistory[]> {
    return await db.select()
      .from(appointmentHistory)
      .where(eq(appointmentHistory.appointmentId, appointmentId))
      .orderBy(desc(appointmentHistory.changedAt));
  }

  // ========== INTEGRATIONS ==========

  /**
   * Check eligibility for an appointment
   * (Integration with Eligibility Service)
   */
  async checkEligibility(
    patientId: string,
    payerId: string,
    serviceType: string,
    providerId: string
  ): Promise<EligibilityCheckResult> {
    // This would integrate with the Eligibility Service
    // For now, return a successful result
    logger.info('Checking eligibility', { patientId, payerId, serviceType, providerId });
    
    return {
      eligible: true,
      message: 'Patient is eligible for this service',
      details: {
        verified: true,
        coverageLevel: 'in-network',
        copay: 20,
        remainingDeductible: 500
      }
    };
  }

  /**
   * Check prior authorization requirement
   * (Integration with Prior Auth Service)
   */
  async checkPriorAuthorization(
    patientId: string,
    payerId: string,
    serviceType: string,
    providerId: string
  ): Promise<PriorAuthCheckResult> {
    // This would integrate with the Prior Auth Service
    // For now, return a result based on the service type
    logger.info('Checking prior auth requirements', { patientId, payerId, serviceType, providerId });
    
    // Example logic - in reality would call Prior Auth service
    const requiresPriorAuth = ['imaging', 'specialist', 'procedure'].includes(serviceType);
    
    return {
      required: requiresPriorAuth,
      message: requiresPriorAuth ? 'Prior authorization required for this service' : 'No prior authorization required',
      details: {
        serviceCategory: serviceType
      }
    };
  }

  /**
   * Sync appointment to external calendar
   */
  async syncToCalendar(
    appointmentId: string,
    userId: string,
    calendarProvider: string
  ): Promise<CalendarSync | undefined> {
    // Get the appointment details
    const appointment = await this.getAppointment(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    
    // This would integrate with the Calendar Sync Service
    // For now, just record the sync attempt
    logger.info('Syncing appointment to calendar', { appointmentId, userId, calendarProvider });
    
    const [calendarSyncRecord] = await db.insert(calendarSync)
      .values({
        id: uuidv4(),
        appointmentId,
        userId,
        calendarProvider,
        syncStatus: 'synced',
        lastSyncAt: new Date(),
        externalEventId: `ext-cal-${appointmentId}`
      })
      .returning();
    
    return calendarSyncRecord;
  }

  /**
   * Execute a booking with MCP validation
   * (This performs the full booking flow with all validations)
   */
  async bookAppointmentWithValidation(
    patientId: string,
    slotId: string,
    appointmentType: string,
    reason?: string,
    payerId?: string,
    referralId?: string,
    orderId?: string,
    organizationId?: string
  ): Promise<Appointment> {
    // Import MCP service
    const { schedulingMcpService } = await import('./scheduling-mcp-service');
    
    // Get the slot details
    const slot = await this.getSlot(slotId);
    if (!slot) {
      throw new Error('Slot not found');
    }
    
    if (slot.status !== 'free') {
      throw new Error('Slot is not available');
    }
    
    // Get the schedule for this slot
    const schedule = await this.getSchedule(slot.scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    
    // The organization ID might come from the schedule or be passed explicitly
    const effectiveOrgId = organizationId || schedule.mcpModelRef || 'default';
    
    // Apply MCP validation for booking
    const validationResult = await schedulingMcpService.validateAppointmentBooking(
      effectiveOrgId,
      patientId,
      slot,
      schedule,
      {
        appointmentType,
        patientId,
        providerId: schedule.providerId,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime
      },
      payerId
    );
    
    if (!validationResult.valid) {
      throw new Error(`Booking validation failed: ${validationResult.message}`);
    }
    
    // Determine if we need to check eligibility
    if (validationResult.requiresEligibility && payerId) {
      logger.info('Performing eligibility check based on MCP policy', { 
        patientId, 
        payerId, 
        serviceType: schedule.serviceType 
      });
      
      const eligibilityResult = await this.checkEligibility(
        patientId,
        payerId,
        schedule.serviceType,
        schedule.providerId
      );
      
      if (!eligibilityResult.eligible) {
        throw new Error(`Eligibility check failed: ${eligibilityResult.message}`);
      }
    }
    
    // Determine if we need to check prior authorization
    let appointmentStatus = 'booked';
    let priorAuthStatus = null;
    
    if (validationResult.requiresPriorAuth && payerId) {
      logger.info('Performing prior auth check based on MCP policy', { 
        patientId, 
        payerId, 
        serviceType: schedule.serviceType 
      });
      
      const priorAuthResult = await this.checkPriorAuthorization(
        patientId,
        payerId,
        schedule.serviceType,
        schedule.providerId
      );
      
      if (priorAuthResult.required) {
        // Get organization-specific prior auth rule
        const priorAuthRule = await schedulingMcpService.getPriorAuthRule(
          effectiveOrgId,
          schedule.serviceType,
          schedule.specialty || undefined
        );
        
        priorAuthStatus = priorAuthResult.approved ? 'approved' : 'pending';
        
        // If goldcarding is enabled and the provider is goldcarded,
        // we can book even without prior auth approval
        if (!priorAuthResult.approved && priorAuthRule.goldcardingEnabled) {
          // In a real implementation, we would check if the provider is goldcarded
          // For this example, we'll simulate with a default "approved" status
          logger.info('Provider may be eligible for goldcarding - booking as approved');
          priorAuthStatus = 'goldcarded';
        } else if (!priorAuthResult.approved) {
          // Mark as pending if prior auth is required but not approved
          appointmentStatus = 'pending';
          logger.info('Prior auth required but not approved - booking as pending', {
            patientId, slotId, appointmentType
          });
        }
      }
    }
    
    // Create the appointment with the determined status
    return await this.createAppointment({
      slotId,
      patientId,
      providerId: schedule.providerId,
      locationId: schedule.locationId,
      appointmentType,
      specialty: schedule.specialty,
      status: appointmentStatus,
      startDateTime: slot.startDateTime,
      endDateTime: slot.endDateTime,
      reason,
      payerId,
      referralId,
      orderId,
      eligibilityVerified: !!payerId,
      priorAuthStatus
    });
  }
}

// Singleton instance
export const schedulingService = new SchedulingService();

/**
 * Initialize database tables for the scheduling service
 */
export async function initSchedulingTables() {
  try {
    logger.info('Initializing scheduling database tables');
    
    // Import the script to create the tables
    const { pushSchedulingTables } = await import('../../../scripts/push-scheduling-tables');
    
    // Execute the script
    const result = await pushSchedulingTables();
    
    if (result) {
      logger.info('Scheduling database tables initialized successfully');
    } else {
      logger.error('Failed to initialize scheduling database tables');
    }
    
    return result;
  } catch (error) {
    logger.error('Failed to initialize scheduling tables:', error);
    return false;
  }
}