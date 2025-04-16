/**
 * Smart Health Hub - Appointment Scheduling Schema
 * 
 * This file defines the data model for the Appointment Scheduling Service,
 * following FHIR standards with adaptations for SHH's specific needs.
 */

import { text, integer, pgTable, boolean, timestamp, json, primaryKey, serial, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations } from 'drizzle-orm';

// ---------- Enums ----------

/**
 * Appointment status values
 * Follows FHIR Appointment.status values
 */
export const appointmentStatusEnum = pgEnum('appointment_status', [
  'proposed',    // Initial proposal or template
  'pending',     // Awaiting approval/confirmation
  'booked',      // Confirmed booking
  'arrived',     // Patient has arrived
  'fulfilled',   // Appointment completed
  'cancelled',   // Cancelled by patient or provider
  'noshow',      // Patient didn't show up
  'entered-in-error'  // Appointment created by mistake
]);

/**
 * Slot status values
 * Follows FHIR Slot.status values
 */
export const slotStatusEnum = pgEnum('slot_status', [
  'free',       // Available for booking
  'busy',       // Already booked
  'busy-unavailable', // Blocked/unavailable
  'busy-tentative',   // Tentatively booked
  'entered-in-error'  // Slot created by mistake
]);

/**
 * Schedule status values
 */
export const scheduleStatusEnum = pgEnum('schedule_status', [
  'active',     // Schedule is active and slots can be booked
  'inactive',   // Schedule is not active (e.g., provider on leave)
  'entered-in-error' // Schedule created by mistake
]);

/**
 * Appointment type values
 */
export const appointmentTypeEnum = pgEnum('appointment_type', [
  'routine',        // Regular checkup or appointment
  'urgent',         // Urgent care
  'followup',       // Follow-up appointment
  'annual',         // Annual physical or wellness visit
  'new-patient',    // First visit for a new patient
  'procedure',      // For a specific medical procedure
  'lab',            // Laboratory test
  'imaging',        // Imaging appointment
  'specialist',     // Specialist consultation
  'therapy',        // Physical/occupational therapy
  'telehealth',     // Virtual appointment
  'other'           // Other types
]);

/**
 * Specialty values
 */
export const specialtyEnum = pgEnum('specialty', [
  'primary-care',       // Primary Care
  'cardiology',         // Cardiology
  'dermatology',        // Dermatology
  'endocrinology',      // Endocrinology
  'gastroenterology',   // Gastroenterology
  'hematology',         // Hematology
  'neurology',          // Neurology
  'oncology',           // Oncology
  'ophthalmology',      // Ophthalmology
  'orthopedics',        // Orthopedics
  'pediatrics',         // Pediatrics
  'psychiatry',         // Psychiatry
  'radiology',          // Radiology
  'urology',            // Urology
  'laboratory',         // Laboratory
  'physical-therapy',   // Physical Therapy
  'other'               // Other specialties
]);

// ---------- Tables ----------

/**
 * Schedules - Container for slots
 * Based on FHIR Schedule resource
 */
export const schedules = pgTable('schedules', {
  id: text('id').primaryKey(), // UUID
  providerId: text('provider_id').notNull(), // Reference to provider
  locationId: text('location_id'), // Reference to location
  serviceType: text('service_type').notNull(), // Service type code
  specialty: specialtyEnum('specialty'), // Medical specialty
  name: text('name').notNull(), // Descriptive name (e.g., "Dr. Smith - Cardiology")
  status: scheduleStatusEnum('status').default('active'), // Schedule status
  startDate: timestamp('start_date'), // When schedule begins
  endDate: timestamp('end_date'), // When schedule ends (if temporary)
  minmaxPatients: text('minmax_patients'), // Min and max patients per slot (e.g., "1:1" or "1:2")
  comments: text('comments'), // Additional comments
  planningHorizonDays: integer('planning_horizon_days'), // How many days in advance to create slots
  mcpModelRef: text('mcp_model_ref'), // Reference to MCP model if applicable
  mcpVersion: text('mcp_version'), // Version of MCP model
  customData: json('custom_data'), // For partner-specific extensions
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
});

/**
 * Schedule Recurrence Rules
 * For generating recurring slots (e.g., every Monday 9-5)
 */
export const scheduleRecurrenceRules = pgTable('schedule_recurrence_rules', {
  id: text('id').primaryKey(), // UUID
  scheduleId: text('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  daysOfWeek: text('days_of_week').notNull(), // Comma-separated list of days (1-7, Monday is 1)
  startTime: text('start_time').notNull(), // e.g., "09:00"
  endTime: text('end_time').notNull(), // e.g., "17:00"
  slotDurationMinutes: integer('slot_duration_minutes').notNull(), // Length of each slot
  effectiveFrom: timestamp('effective_from'), // When this pattern starts
  effectiveTo: timestamp('effective_to'), // When this pattern ends
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
});

/**
 * Schedule Blackout Periods
 * For blocking out times when the provider is unavailable
 */
export const scheduleBlackoutPeriods = pgTable('schedule_blackout_periods', {
  id: text('id').primaryKey(), // UUID
  scheduleId: text('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  startDateTime: timestamp('start_date_time').notNull(),
  endDateTime: timestamp('end_date_time').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
});

/**
 * Slots - Specific time intervals that can be booked
 * Based on FHIR Slot resource
 */
export const slots = pgTable('slots', {
  id: text('id').primaryKey(), // UUID
  scheduleId: text('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  startDateTime: timestamp('start_date_time').notNull(),
  endDateTime: timestamp('end_date_time').notNull(),
  status: slotStatusEnum('status').default('free').notNull(),
  overbooked: boolean('overbooked').default(false), // For slots that allow overbooking
  appointmentId: text('appointment_id'), // The appointment that filled this slot (if any)
  maxAppointments: integer('max_appointments').default(1), // Maximum number of appointments per slot
  comments: text('comments'), // Any notes about this slot
  createdBy: text('created_by'), // Who created this slot
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
});

/**
 * Appointments - Scheduled events between patients and providers
 * Based on FHIR Appointment resource
 */
export const appointments = pgTable('appointments', {
  id: text('id').primaryKey(), // UUID
  slotId: text('slot_id').references(() => slots.id), // Reference to slot
  patientId: text('patient_id').notNull(), // Reference to patient
  providerId: text('provider_id').notNull(), // Reference to provider
  locationId: text('location_id'), // Reference to location
  appointmentType: appointmentTypeEnum('appointment_type').notNull(),
  specialty: specialtyEnum('specialty'),
  status: appointmentStatusEnum('status').default('booked').notNull(),
  startDateTime: timestamp('start_date_time').notNull(),
  endDateTime: timestamp('end_date_time').notNull(),
  minutesDuration: integer('minutes_duration'), // Duration in minutes
  reason: text('reason'), // Reason for visit
  reasonCode: text('reason_code'), // Coded reason for visit
  description: text('description'), // Additional details 
  isTelehealth: boolean('is_telehealth').default(false), // Is this a telehealth appointment
  telehealthUrl: text('telehealth_url'), // Link for telehealth session
  telehealthInstructions: text('telehealth_instructions'), // Instructions for telehealth
  priority: integer('priority').default(0), // For urgent appointments
  patientInstructions: text('patient_instructions'), // Instructions for patient
  cancelReason: text('cancel_reason'), // Why appointment was cancelled
  confirmedAt: timestamp('confirmed_at'), // When appointment was confirmed
  reminderSentAt: timestamp('reminder_sent_at'), // When reminder was sent
  referralId: text('referral_id'), // Reference to referral if required
  orderId: text('order_id'), // Reference to order if applicable
  priorAuthId: text('prior_auth_id'), // Reference to prior auth if required
  priorAuthStatus: text('prior_auth_status'), // Status of prior auth (approved, pending, denied)
  payerId: text('payer_id'), // Patient's insurance
  eligibilityVerified: boolean('eligibility_verified').default(false), // Has eligibility been verified
  eligibilityDetails: json('eligibility_details'), // Details of eligibility check
  externalRefId: text('external_ref_id'), // ID in external system if applicable
  externalSource: text('external_source'), // Source system if imported
  customData: json('custom_data'), // For partner-specific extensions
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
});

/**
 * Appointment History
 * For tracking changes to appointments
 */
export const appointmentHistory = pgTable('appointment_history', {
  id: serial('id').primaryKey(),
  appointmentId: text('appointment_id').notNull().references(() => appointments.id, { onDelete: 'cascade' }),
  statusFrom: appointmentStatusEnum('status_from'),
  statusTo: appointmentStatusEnum('status_to'),
  changedBy: text('changed_by').notNull(), // Who made the change
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  reason: text('reason'), // Reason for change
  notes: text('notes') // Additional notes
});

/**
 * Calendar Sync Data
 * For tracking calendar integration
 */
export const calendarSync = pgTable('calendar_sync', {
  id: text('id').primaryKey(), // UUID
  appointmentId: text('appointment_id').notNull().references(() => appointments.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(), // User whose calendar was synced
  calendarProvider: text('calendar_provider').notNull(), // e.g., "google", "outlook"
  externalEventId: text('external_event_id'), // ID in external calendar
  syncStatus: text('sync_status').notNull(), // e.g., "synced", "failed"
  lastSyncAt: timestamp('last_sync_at').notNull(),
  errorMessage: text('error_message') // If sync failed
});

// ---------- Relations ----------

export const schedulesRelations = relations(schedules, ({ many }) => ({
  slots: many(slots),
  recurrenceRules: many(scheduleRecurrenceRules),
  blackoutPeriods: many(scheduleBlackoutPeriods)
}));

export const slotsRelations = relations(slots, ({ one, many }) => ({
  schedule: one(schedules, {
    fields: [slots.scheduleId],
    references: [schedules.id]
  }),
  appointment: one(appointments, {
    fields: [slots.appointmentId],
    references: [appointments.id]
  })
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  slot: one(slots, {
    fields: [appointments.slotId],
    references: [slots.id]
  }),
  history: many(appointmentHistory),
  calendarSyncRecords: many(calendarSync)
}));

// ---------- Zod Schemas ----------

// Select schemas
export const selectScheduleSchema = createSelectSchema(schedules);
export const selectSlotSchema = createSelectSchema(slots);
export const selectAppointmentSchema = createSelectSchema(appointments);
export const selectRecurrenceRuleSchema = createSelectSchema(scheduleRecurrenceRules);
export const selectBlackoutPeriodSchema = createSelectSchema(scheduleBlackoutPeriods);
export const selectAppointmentHistorySchema = createSelectSchema(appointmentHistory);
export const selectCalendarSyncSchema = createSelectSchema(calendarSync);

// Insert schemas
export const insertScheduleSchema = createInsertSchema(schedules)
  .omit({ createdAt: true, updatedAt: true });

export const insertSlotSchema = createInsertSchema(slots)
  .omit({ createdAt: true, updatedAt: true });

export const insertAppointmentSchema = createInsertSchema(appointments)
  .omit({ createdAt: true, updatedAt: true });

export const insertRecurrenceRuleSchema = createInsertSchema(scheduleRecurrenceRules)
  .omit({ createdAt: true, updatedAt: true });

export const insertBlackoutPeriodSchema = createInsertSchema(scheduleBlackoutPeriods)
  .omit({ createdAt: true, updatedAt: true });

export const insertAppointmentHistorySchema = createInsertSchema(appointmentHistory)
  .omit({ id: true, changedAt: true });

export const insertCalendarSyncSchema = createInsertSchema(calendarSync);

// ---------- Types ----------

// Select types
export type Schedule = z.infer<typeof selectScheduleSchema>;
export type Slot = z.infer<typeof selectSlotSchema>;
export type Appointment = z.infer<typeof selectAppointmentSchema>;
export type RecurrenceRule = z.infer<typeof selectRecurrenceRuleSchema>;
export type BlackoutPeriod = z.infer<typeof selectBlackoutPeriodSchema>;
export type AppointmentHistory = z.infer<typeof selectAppointmentHistorySchema>;
export type CalendarSync = z.infer<typeof selectCalendarSyncSchema>;

// Insert types
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type InsertSlot = z.infer<typeof insertSlotSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertRecurrenceRule = z.infer<typeof insertRecurrenceRuleSchema>;
export type InsertBlackoutPeriod = z.infer<typeof insertBlackoutPeriodSchema>;
export type InsertAppointmentHistory = z.infer<typeof insertAppointmentHistorySchema>;
export type InsertCalendarSync = z.infer<typeof insertCalendarSyncSchema>;

// Enum types
export type AppointmentStatus = z.infer<typeof appointmentStatusEnum.enum>;
export type SlotStatus = z.infer<typeof slotStatusEnum.enum>;
export type ScheduleStatus = z.infer<typeof scheduleStatusEnum.enum>;
export type AppointmentType = z.infer<typeof appointmentTypeEnum.enum>;
export type Specialty = z.infer<typeof specialtyEnum.enum>;