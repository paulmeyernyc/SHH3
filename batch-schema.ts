/**
 * Batch Processing Service Database Schema
 * 
 * This module defines the database schema for the Batch Processing service:
 * - Job Definitions (templates for batch jobs)
 * - Job Instances (executions of batch jobs)
 * - Job Dependencies (relationships between jobs)
 * - Job Steps (individual steps in a job)
 * - Job Schedules (timing for scheduled jobs)
 * - Job Logs (detailed logs for job execution)
 */

import { pgTable, pgEnum, serial, text, timestamp, integer, boolean, jsonb, uuid, foreignKey, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums
export const jobTypeEnum = pgEnum('job_type', [
  'claim_processing',
  'data_export',
  'data_import',
  'data_aggregation',
  'report_generation',
  'data_cleanup',
  'maintenance',
  'custom'
]);

export const jobPriorityEnum = pgEnum('job_priority', [
  'low',
  'normal',
  'high',
  'critical'
]);

export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'queued',
  'running',
  'paused',
  'completed',
  'failed',
  'canceled',
  'timeout'
]);

export const scheduleTypeEnum = pgEnum('schedule_type', [
  'manual',
  'once',
  'daily',
  'weekly',
  'monthly',
  'cron'
]);

export const stepStatusEnum = pgEnum('step_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'skipped'
]);

export const logLevelEnum = pgEnum('log_level', [
  'debug',
  'info',
  'warning',
  'error',
  'critical'
]);

// Tables
export const jobDefinitions = pgTable('batch_job_definitions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  
  type: jobTypeEnum('type').notNull(),
  handlerModule: text('handler_module').notNull(),
  handlerFunction: text('handler_function').notNull(),
  
  defaultPriority: jobPriorityEnum('default_priority').notNull().default('normal'),
  defaultTimeout: integer('default_timeout'),  // In seconds
  
  parameters: jsonb('parameters').default({}),
  retryPolicy: jsonb('retry_policy').default({}),
  
  isSystem: boolean('is_system').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by')
}, (table) => {
  return {
    nameIdx: uniqueIndex('batch_job_def_name_idx').on(table.name),
    typeIdx: index('batch_job_def_type_idx').on(table.type),
    activeIdx: index('batch_job_def_active_idx').on(table.isActive)
  };
});

export const jobStepDefinitions = pgTable('batch_job_step_definitions', {
  id: serial('id').primaryKey(),
  jobDefinitionId: integer('job_definition_id').notNull().references(() => jobDefinitions.id, { onDelete: 'cascade' }),
  
  name: text('name').notNull(),
  description: text('description'),
  
  sequence: integer('sequence').notNull(),
  
  handlerModule: text('handler_module').notNull(),
  handlerFunction: text('handler_function').notNull(),
  
  parameters: jsonb('parameters').default({}),
  timeout: integer('timeout'),  // In seconds
  
  retryPolicy: jsonb('retry_policy').default({}),
  continueOnFail: boolean('continue_on_fail').notNull().default(false),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => {
  return {
    jobDefIdx: index('batch_job_step_def_job_def_idx').on(table.jobDefinitionId),
    sequenceIdx: index('batch_job_step_def_sequence_idx').on(table.sequence)
  };
});

export const jobDependencies = pgTable('batch_job_dependencies', {
  id: serial('id').primaryKey(),
  
  dependentJobId: integer('dependent_job_id').notNull().references(() => jobDefinitions.id, { onDelete: 'cascade' }),
  prerequisiteJobId: integer('prerequisite_job_id').notNull().references(() => jobDefinitions.id, { onDelete: 'cascade' }),
  
  waitForCompletion: boolean('wait_for_completion').notNull().default(true),
  maxWaitTime: integer('max_wait_time'),  // In seconds
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => {
  return {
    dependentJobIdx: index('batch_job_dep_dependent_idx').on(table.dependentJobId),
    prerequisiteJobIdx: index('batch_job_dep_prerequisite_idx').on(table.prerequisiteJobId),
    uniqueDepIdx: uniqueIndex('batch_job_dep_unique_idx').on(table.dependentJobId, table.prerequisiteJobId)
  };
});

export const jobSchedules = pgTable('batch_job_schedules', {
  id: serial('id').primaryKey(),
  jobDefinitionId: integer('job_definition_id').notNull().references(() => jobDefinitions.id, { onDelete: 'cascade' }),
  
  name: text('name').notNull(),
  description: text('description'),
  
  scheduleType: scheduleTypeEnum('schedule_type').notNull(),
  scheduleConfig: jsonb('schedule_config').notNull(),
  
  priority: jobPriorityEnum('priority'),
  parameters: jsonb('parameters').default({}),
  
  isActive: boolean('is_active').notNull().default(true),
  
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  
  // For daily/weekly/monthly schedules, when the job should run
  timeOfDay: text('time_of_day'),  // HH:MM format
  
  // For job throttling
  minInterval: integer('min_interval'),  // Minimum seconds between runs
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by')
}, (table) => {
  return {
    jobDefIdx: index('batch_job_schedule_job_def_idx').on(table.jobDefinitionId),
    typeIdx: index('batch_job_schedule_type_idx').on(table.scheduleType),
    activeIdx: index('batch_job_schedule_active_idx').on(table.isActive),
    nextRunIdx: index('batch_job_schedule_next_run_idx').on(table.nextRunAt)
  };
});

export const jobInstances = pgTable('batch_job_instances', {
  id: serial('id').primaryKey(),
  jobDefinitionId: integer('job_definition_id').notNull().references(() => jobDefinitions.id),
  scheduleId: integer('schedule_id').references(() => jobSchedules.id),
  
  // Unique run ID for logging and tracking
  runId: uuid('run_id').notNull().defaultRandom(),
  
  status: jobStatusEnum('status').notNull().default('pending'),
  priority: jobPriorityEnum('priority').notNull().default('normal'),
  
  parameters: jsonb('parameters').default({}),
  
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  
  // Processing metrics
  progress: integer('progress'),  // 0-100%
  processingTime: integer('processing_time'),  // In milliseconds
  resourceUsage: jsonb('resource_usage').default({}),
  
  // Results and errors
  result: jsonb('result').default({}),
  error: text('error'),
  errorDetails: jsonb('error_details').default({}),
  
  // For retry tracking
  retryCount: integer('retry_count').notNull().default(0),
  parentJobId: integer('parent_job_id').references(() => jobInstances.id),
  
  requestedBy: integer('requested_by'),
  
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => {
  return {
    jobDefIdx: index('batch_job_instance_job_def_idx').on(table.jobDefinitionId),
    scheduleIdx: index('batch_job_instance_schedule_idx').on(table.scheduleId),
    statusIdx: index('batch_job_instance_status_idx').on(table.status),
    runIdIdx: uniqueIndex('batch_job_instance_run_id_idx').on(table.runId),
    timeIdx: index('batch_job_instance_time_idx').on(table.startedAt, table.endedAt),
    parentJobIdx: index('batch_job_instance_parent_idx').on(table.parentJobId)
  };
});

export const jobStepInstances = pgTable('batch_job_step_instances', {
  id: serial('id').primaryKey(),
  jobInstanceId: integer('job_instance_id').notNull().references(() => jobInstances.id, { onDelete: 'cascade' }),
  stepDefinitionId: integer('step_definition_id').references(() => jobStepDefinitions.id),
  
  name: text('name').notNull(),
  sequence: integer('sequence').notNull(),
  
  status: stepStatusEnum('status').notNull().default('pending'),
  
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  
  processingTime: integer('processing_time'),  // In milliseconds
  
  result: jsonb('result').default({}),
  error: text('error'),
  errorDetails: jsonb('error_details').default({}),
  
  retryCount: integer('retry_count').notNull().default(0),
  
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => {
  return {
    jobInstanceIdx: index('batch_job_step_instance_job_idx').on(table.jobInstanceId),
    stepDefIdx: index('batch_job_step_instance_def_idx').on(table.stepDefinitionId),
    statusIdx: index('batch_job_step_instance_status_idx').on(table.status),
    sequenceIdx: index('batch_job_step_instance_sequence_idx').on(table.sequence)
  };
});

export const jobLogs = pgTable('batch_job_logs', {
  id: serial('id').primaryKey(),
  
  jobInstanceId: integer('job_instance_id').notNull().references(() => jobInstances.id, { onDelete: 'cascade' }),
  stepInstanceId: integer('step_instance_id').references(() => jobStepInstances.id, { onDelete: 'cascade' }),
  
  level: logLevelEnum('level').notNull().default('info'),
  message: text('message').notNull(),
  details: jsonb('details').default({}),
  
  timestamp: timestamp('timestamp').notNull().defaultNow()
}, (table) => {
  return {
    jobInstanceIdx: index('batch_job_logs_job_idx').on(table.jobInstanceId),
    stepInstanceIdx: index('batch_job_logs_step_idx').on(table.stepInstanceId),
    levelIdx: index('batch_job_logs_level_idx').on(table.level),
    timestampIdx: index('batch_job_logs_timestamp_idx').on(table.timestamp)
  };
});

// Zod schemas for validation
export const insertJobDefinitionSchema = createInsertSchema(jobDefinitions);
export const insertJobStepDefinitionSchema = createInsertSchema(jobStepDefinitions);
export const insertJobDependencySchema = createInsertSchema(jobDependencies);
export const insertJobScheduleSchema = createInsertSchema(jobSchedules);
export const insertJobInstanceSchema = createInsertSchema(jobInstances);
export const insertJobStepInstanceSchema = createInsertSchema(jobStepInstances);
export const insertJobLogSchema = createInsertSchema(jobLogs);

// TypeScript types
export type JobDefinition = typeof jobDefinitions.$inferSelect;
export type JobStepDefinition = typeof jobStepDefinitions.$inferSelect;
export type JobDependency = typeof jobDependencies.$inferSelect;
export type JobSchedule = typeof jobSchedules.$inferSelect;
export type JobInstance = typeof jobInstances.$inferSelect;
export type JobStepInstance = typeof jobStepInstances.$inferSelect;
export type JobLog = typeof jobLogs.$inferSelect;

export type InsertJobDefinition = z.infer<typeof insertJobDefinitionSchema>;
export type InsertJobStepDefinition = z.infer<typeof insertJobStepDefinitionSchema>;
export type InsertJobDependency = z.infer<typeof insertJobDependencySchema>;
export type InsertJobSchedule = z.infer<typeof insertJobScheduleSchema>;
export type InsertJobInstance = z.infer<typeof insertJobInstanceSchema>;
export type InsertJobStepInstance = z.infer<typeof insertJobStepInstanceSchema>;
export type InsertJobLog = z.infer<typeof insertJobLogSchema>;

// Define relationships between tables
export const relations = {
  jobDefinitions: {
    steps: {
      relationName: 'jobDefinitionToSteps',
      columns: [jobDefinitions.id],
      foreignColumns: [jobStepDefinitions.jobDefinitionId]
    },
    dependencies: {
      relationName: 'jobDefinitionToDependencies',
      columns: [jobDefinitions.id],
      foreignColumns: [jobDependencies.dependentJobId]
    },
    prerequisites: {
      relationName: 'jobDefinitionToPrerequisites',
      columns: [jobDefinitions.id],
      foreignColumns: [jobDependencies.prerequisiteJobId]
    },
    schedules: {
      relationName: 'jobDefinitionToSchedules',
      columns: [jobDefinitions.id],
      foreignColumns: [jobSchedules.jobDefinitionId]
    },
    instances: {
      relationName: 'jobDefinitionToInstances',
      columns: [jobDefinitions.id],
      foreignColumns: [jobInstances.jobDefinitionId]
    }
  },
  
  jobSchedules: {
    jobDefinition: {
      relationName: 'scheduleToJobDefinition',
      columns: [jobSchedules.jobDefinitionId],
      foreignColumns: [jobDefinitions.id]
    },
    instances: {
      relationName: 'scheduleToInstances',
      columns: [jobSchedules.id],
      foreignColumns: [jobInstances.scheduleId]
    }
  },
  
  jobInstances: {
    jobDefinition: {
      relationName: 'instanceToJobDefinition',
      columns: [jobInstances.jobDefinitionId],
      foreignColumns: [jobDefinitions.id]
    },
    schedule: {
      relationName: 'instanceToSchedule',
      columns: [jobInstances.scheduleId],
      foreignColumns: [jobSchedules.id]
    },
    steps: {
      relationName: 'instanceToSteps',
      columns: [jobInstances.id],
      foreignColumns: [jobStepInstances.jobInstanceId]
    },
    logs: {
      relationName: 'instanceToLogs',
      columns: [jobInstances.id],
      foreignColumns: [jobLogs.jobInstanceId]
    },
    parentJob: {
      relationName: 'instanceToParent',
      columns: [jobInstances.parentJobId],
      foreignColumns: [jobInstances.id]
    },
    childJobs: {
      relationName: 'instanceToChildren',
      columns: [jobInstances.id],
      foreignColumns: [jobInstances.parentJobId]
    }
  },
  
  jobStepInstances: {
    jobInstance: {
      relationName: 'stepInstanceToJobInstance',
      columns: [jobStepInstances.jobInstanceId],
      foreignColumns: [jobInstances.id]
    },
    stepDefinition: {
      relationName: 'stepInstanceToStepDefinition',
      columns: [jobStepInstances.stepDefinitionId],
      foreignColumns: [jobStepDefinitions.id]
    },
    logs: {
      relationName: 'stepInstanceToLogs',
      columns: [jobStepInstances.id],
      foreignColumns: [jobLogs.stepInstanceId]
    }
  },
  
  jobStepDefinitions: {
    jobDefinition: {
      relationName: 'stepDefinitionToJobDefinition',
      columns: [jobStepDefinitions.jobDefinitionId],
      foreignColumns: [jobDefinitions.id]
    },
    instances: {
      relationName: 'stepDefinitionToInstances',
      columns: [jobStepDefinitions.id],
      foreignColumns: [jobStepInstances.stepDefinitionId]
    }
  },
  
  jobLogs: {
    jobInstance: {
      relationName: 'logToJobInstance',
      columns: [jobLogs.jobInstanceId],
      foreignColumns: [jobInstances.id]
    },
    stepInstance: {
      relationName: 'logToStepInstance',
      columns: [jobLogs.stepInstanceId],
      foreignColumns: [jobStepInstances.id]
    }
  }
};