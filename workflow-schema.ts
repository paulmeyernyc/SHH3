/**
 * Workflow Engine Database Schema
 * 
 * This module defines the database schema for the Workflow Engine service:
 * - Workflow Definitions (templates for processes)
 * - Workflow Instances (running instances of workflows)
 * - Tasks (individual steps within workflows)
 * - Task Assignments (assignments of tasks to users)
 * - Transitions (connections between steps)
 * - Workflow Logs (audit trail of workflow activities)
 */

import { pgTable, serial, text, jsonb, timestamp, boolean, integer, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enumerations
export const workflowStatusEnum = pgEnum('workflow_status', [
  'draft', 'active', 'deprecated', 'archived'
]);

export const workflowInstanceStatusEnum = pgEnum('workflow_instance_status', [
  'created', 'running', 'completed', 'failed', 'cancelled', 'suspended'
]);

export const taskStatusEnum = pgEnum('task_status', [
  'pending', 'assigned', 'in_progress', 'completed', 'failed', 'skipped', 'cancelled'
]);

export const taskTypeEnum = pgEnum('task_type', [
  'manual', 'automated', 'decision', 'subprocess', 'notification', 'form', 'integration', 'timer'
]);

export const triggerTypeEnum = pgEnum('trigger_type', [
  'manual', 'scheduled', 'event', 'api', 'data_change'
]);

export const priorityEnum = pgEnum('priority', [
  'low', 'normal', 'high', 'urgent', 'critical'
]);

// Workflow Definitions
export const workflowDefinitions = pgTable('workflow_definitions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // Unique identifier for the workflow
  version: integer('version').notNull().default(1),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  status: workflowStatusEnum('status').notNull().default('draft'),
  definition: jsonb('definition').notNull().default('{}'), // Complete workflow definition JSON (includes steps, transitions)
  metaData: jsonb('metaData').notNull().default('{}'), // Optional metadata
  triggerType: triggerTypeEnum('triggerType').notNull(),
  triggerConfig: jsonb('triggerConfig').notNull().default('{}'), // Configuration for triggers
  createdBy: integer('createdBy').notNull(), // User ID of creator
  organizationId: integer('organizationId'), // Optional organization scope
  validFrom: timestamp('validFrom', { mode: 'string' }),
  validTo: timestamp('validTo', { mode: 'string' }),
  isPublic: boolean('isPublic').notNull().default(false),
  tags: text('tags').array(),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    codeVersionIdx: uniqueIndex('code_version_idx').on(table.code, table.version)
  };
});

// Workflow Instances (running workflows)
export const workflowInstances = pgTable('workflow_instances', {
  id: serial('id').primaryKey(),
  workflowDefinitionId: integer('workflowDefinitionId').notNull()
    .references(() => workflowDefinitions.id),
  referenceId: text('referenceId'), // External reference ID (e.g., patientId, claimId)
  referenceType: text('referenceType'), // Type of reference (e.g., "patient", "claim")
  status: workflowInstanceStatusEnum('status').notNull().default('created'),
  priority: priorityEnum('priority').notNull().default('normal'),
  context: jsonb('context').notNull().default('{}'), // Data context for the workflow
  results: jsonb('results').notNull().default('{}'), // Results data
  startedAt: timestamp('startedAt', { mode: 'string' }),
  completedAt: timestamp('completedAt', { mode: 'string' }),
  dueDate: timestamp('dueDate', { mode: 'string' }),
  currentStepId: text('currentStepId'), // Current step in workflow
  assigneeId: integer('assigneeId'), // User assigned to the workflow if any
  organizationId: integer('organizationId'), // Organization that owns this instance
  createdBy: integer('createdBy').notNull(), // User who created the instance
  tags: text('tags').array(),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    workflowDefIdx: index('workflow_def_idx').on(table.workflowDefinitionId),
    statusIdx: index('workflow_instance_status_idx').on(table.status),
    referenceIdx: index('reference_idx').on(table.referenceId, table.referenceType)
  };
});

// Tasks (steps within workflow instances)
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  workflowInstanceId: integer('workflowInstanceId').notNull()
    .references(() => workflowInstances.id),
  stepId: text('stepId').notNull(), // ID of the step in the workflow definition
  name: text('name').notNull(),
  description: text('description'),
  type: taskTypeEnum('type').notNull(),
  status: taskStatusEnum('status').notNull().default('pending'),
  priority: priorityEnum('priority').notNull().default('normal'),
  config: jsonb('config').notNull().default('{}'), // Task configuration
  input: jsonb('input').notNull().default('{}'), // Input data
  output: jsonb('output').notNull().default('{}'), // Output data
  assigneeId: integer('assigneeId'), // User assigned to the task if any
  assigneeRole: text('assigneeRole'), // Role required for this task
  dueDate: timestamp('dueDate', { mode: 'string' }),
  startedAt: timestamp('startedAt', { mode: 'string' }),
  completedAt: timestamp('completedAt', { mode: 'string' }),
  retries: integer('retries').notNull().default(0),
  maxRetries: integer('maxRetries').notNull().default(0),
  parentTaskId: integer('parentTaskId').references(() => tasks.id), // For subtasks
  dependsOnTaskIds: integer('dependsOnTaskIds').array(), // Tasks this task depends on
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    workflowInstanceIdx: index('workflow_instance_idx').on(table.workflowInstanceId),
    statusIdx: index('task_status_idx').on(table.status),
    assigneeIdx: index('assignee_idx').on(table.assigneeId)
  };
});

// Task Assignments (manage task assignments and reassignments)
export const taskAssignments = pgTable('task_assignments', {
  id: serial('id').primaryKey(),
  taskId: integer('taskId').notNull()
    .references(() => tasks.id),
  userId: integer('userId').notNull(), // Assigned user
  assignedBy: integer('assignedBy').notNull(), // User who made the assignment
  assignedAt: timestamp('assignedAt', { mode: 'string' }).notNull().defaultNow(),
  acceptedAt: timestamp('acceptedAt', { mode: 'string' }),
  completedAt: timestamp('completedAt', { mode: 'string' }),
  notes: text('notes'),
  isActive: boolean('isActive').notNull().default(true), // If false, assignment was revoked
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    taskIdx: index('task_assignment_task_idx').on(table.taskId),
    userIdx: index('task_assignment_user_idx').on(table.userId),
    activeIdx: index('task_assignment_active_idx').on(table.isActive)
  };
});

// Workflow Transitions (connections between steps)
export const workflowTransitions = pgTable('workflow_transitions', {
  id: serial('id').primaryKey(),
  workflowInstanceId: integer('workflowInstanceId').notNull()
    .references(() => workflowInstances.id),
  fromStepId: text('fromStepId').notNull(),
  toStepId: text('toStepId').notNull(),
  conditionExpression: text('conditionExpression'), // Condition that determined this transition
  conditionResult: boolean('conditionResult'), // Result of the condition evaluation
  transitionData: jsonb('transitionData').notNull().default('{}'), // Data related to the transition
  executedBy: integer('executedBy'), // User who executed the transition (if manual)
  executedAt: timestamp('executedAt', { mode: 'string' }).notNull().defaultNow(),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    workflowInstanceIdx: index('transition_workflow_idx').on(table.workflowInstanceId),
    fromStepIdx: index('from_step_idx').on(table.fromStepId),
    toStepIdx: index('to_step_idx').on(table.toStepId)
  };
});

// Workflow Logs (audit trail)
export const workflowLogs = pgTable('workflow_logs', {
  id: serial('id').primaryKey(),
  workflowInstanceId: integer('workflowInstanceId').notNull()
    .references(() => workflowInstances.id),
  taskId: integer('taskId')
    .references(() => tasks.id),
  eventType: text('eventType').notNull(), // E.g., 'workflow_started', 'task_completed', 'transition_executed'
  eventData: jsonb('eventData').notNull().default('{}'),
  userId: integer('userId'), // User who performed the action (if applicable)
  timestamp: timestamp('timestamp', { mode: 'string' }).notNull().defaultNow(),
  details: text('details'),
  severity: text('severity').notNull().default('info'), // 'info', 'warning', 'error'
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    workflowInstanceIdx: index('log_workflow_idx').on(table.workflowInstanceId),
    taskIdx: index('log_task_idx').on(table.taskId),
    eventTypeIdx: index('event_type_idx').on(table.eventType),
    timestampIdx: index('log_timestamp_idx').on(table.timestamp)
  };
});

// Schema validation
export const insertWorkflowDefinitionSchema = createInsertSchema(workflowDefinitions);
export const insertWorkflowInstanceSchema = createInsertSchema(workflowInstances);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertTaskAssignmentSchema = createInsertSchema(taskAssignments);
export const insertWorkflowTransitionSchema = createInsertSchema(workflowTransitions);
export const insertWorkflowLogSchema = createInsertSchema(workflowLogs);

// Types
export type WorkflowDefinition = typeof workflowDefinitions.$inferSelect;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type WorkflowTransition = typeof workflowTransitions.$inferSelect;
export type WorkflowLog = typeof workflowLogs.$inferSelect;

export type InsertWorkflowDefinition = z.infer<typeof insertWorkflowDefinitionSchema>;
export type InsertWorkflowInstance = z.infer<typeof insertWorkflowInstanceSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertTaskAssignment = z.infer<typeof insertTaskAssignmentSchema>;
export type InsertWorkflowTransition = z.infer<typeof insertWorkflowTransitionSchema>;
export type InsertWorkflowLog = z.infer<typeof insertWorkflowLogSchema>;