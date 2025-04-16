/**
 * Billing and Payments Schema
 * 
 * This defines the data model for the billing and payments components of the Smart Health Hub.
 * It includes invoices, payments, payment methods, payment plans, usage metering, and billing events.
 */
import { pgTable, text, timestamp, uuid, decimal, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * Invoices table
 * Represents billing invoices created from adjudicated claims
 */
export const invoices = pgTable('billing_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  claimId: uuid('claim_id').notNull().references(() => claims.id),
  patientId: uuid('patient_id').notNull(),
  providerId: uuid('provider_id').notNull(),
  organizationId: uuid('organization_id').notNull(),
  payerId: uuid('payer_id'),
  invoiceNumber: text('invoice_number').notNull().unique(),
  status: text('status').notNull().default('DRAFT'), // DRAFT, ISSUED, PAID, PARTIAL, CANCELLED, OVERDUE
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  insuranceResponsibleAmount: decimal('insurance_responsible_amount', { precision: 10, scale: 2 }).notNull(),
  patientResponsibleAmount: decimal('patient_responsible_amount', { precision: 10, scale: 2 }).notNull(),
  adjustmentAmount: decimal('adjustment_amount', { precision: 10, scale: 2 }).default('0'),
  dueDate: timestamp('due_date').notNull(),
  issuedDate: timestamp('issued_date').notNull(),
  paidDate: timestamp('paid_date'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Invoice Line Items
 * Represents individual service lines on an invoice 
 */
export const invoiceLineItems = pgTable('billing_invoice_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  claimLineItemId: uuid('claim_line_item_id'),
  description: text('description').notNull(),
  serviceCode: text('service_code').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  insuranceAmount: decimal('insurance_amount', { precision: 10, scale: 2 }).notNull(),
  patientAmount: decimal('patient_amount', { precision: 10, scale: 2 }).notNull(),
  adjustmentAmount: decimal('adjustment_amount', { precision: 10, scale: 2 }).default('0'),
  serviceDate: timestamp('service_date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Payment Methods table
 * Stores payment methods for patients and organizations
 */
export const paymentMethods = pgTable('billing_payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull(), // Can be patientId or organizationId
  ownerType: text('owner_type').notNull(), // PATIENT, ORGANIZATION, PROVIDER
  nickname: text('nickname'),
  type: text('type').notNull(), // CREDIT_CARD, BANK_ACCOUNT, WALLET, OTHER
  isDefault: boolean('is_default').default(false),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, INACTIVE, EXPIRED, DECLINED
  lastFour: text('last_four'), // Last four digits of card or account number
  expirationMonth: integer('expiration_month'),
  expirationYear: integer('expiration_year'),
  cardBrand: text('card_brand'), // VISA, MASTERCARD, AMEX, etc.
  billingAddressId: uuid('billing_address_id'),
  gatewayToken: text('gateway_token'), // Token from payment processor
  gatewayType: text('gateway_type'), // STRIPE, BRAINTREE, etc.
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Payments table
 * Records payments made against invoices
 */
export const payments = pgTable('billing_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  payerId: uuid('payer_id').notNull(), // Who made the payment (patient, insurance, etc.)
  payerType: text('payer_type').notNull(), // PATIENT, INSURANCE, THIRD_PARTY
  paymentMethodId: uuid('payment_method_id').references(() => paymentMethods.id),
  transactionId: text('transaction_id'), // External transaction ID
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('PENDING'), // PENDING, COMPLETED, FAILED, REFUNDED
  paymentDate: timestamp('payment_date').notNull(),
  refundedAmount: decimal('refunded_amount', { precision: 10, scale: 2 }).default('0'),
  refundedDate: timestamp('refunded_date'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Payment Plans table
 * Configures recurring payment plans for patients
 */
export const paymentPlans = pgTable('billing_payment_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull(),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, COMPLETED, CANCELLED, DEFAULTED
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  remainingAmount: decimal('remaining_amount', { precision: 10, scale: 2 }).notNull(),
  installmentAmount: decimal('installment_amount', { precision: 10, scale: 2 }).notNull(),
  frequency: text('frequency').notNull(), // WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  nextPaymentDate: timestamp('next_payment_date'),
  paymentMethodId: uuid('payment_method_id').references(() => paymentMethods.id),
  autoCharge: boolean('auto_charge').default(true),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Payment Plan Items table
 * Links invoices to payment plans
 */
export const paymentPlanItems = pgTable('billing_payment_plan_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentPlanId: uuid('payment_plan_id').notNull().references(() => paymentPlans.id),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  originalAmount: decimal('original_amount', { precision: 10, scale: 2 }).notNull(),
  remainingAmount: decimal('remaining_amount', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Payment Plan Schedule table
 * Tracks scheduled payments for payment plans
 */
export const paymentPlanSchedule = pgTable('billing_payment_plan_schedule', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentPlanId: uuid('payment_plan_id').notNull().references(() => paymentPlans.id),
  scheduledDate: timestamp('scheduled_date').notNull(),
  scheduledAmount: decimal('scheduled_amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('SCHEDULED'), // SCHEDULED, PROCESSING, COMPLETED, FAILED, SKIPPED
  paymentId: uuid('payment_id').references(() => payments.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Statements table
 * Groups multiple invoices into a single statement for billing
 */
export const statements = pgTable('billing_statements', {
  id: uuid('id').primaryKey().defaultRandom(),
  statementNumber: text('statement_number').notNull().unique(),
  entityId: uuid('entity_id').notNull(), // Can be patientId, organizationId, etc.
  entityType: text('entity_type').notNull(), // PATIENT, ORGANIZATION, PROVIDER
  issuedDate: timestamp('issued_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('DRAFT'), // DRAFT, ISSUED, PAID, PARTIAL, CANCELLED, OVERDUE
  billingCycle: text('billing_cycle').notNull(), // YYYY-MM format
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Statement Settings
 * Configures billing statement settings for organizations and providers
 */
export const statementSettings = pgTable('billing_statement_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  statementFormat: text('statement_format').notNull().default('DEFAULT'), // DEFAULT, DETAILED, SUMMARY
  billingCycle: integer('billing_cycle').notNull().default(30), // Days
  gracePeriod: integer('grace_period').notNull().default(15), // Days
  autoSendStatements: boolean('auto_send_statements').default(true),
  paymentTerms: text('payment_terms'),
  reminderFrequency: integer('reminder_frequency').default(7), // Days
  lateFeePercentage: decimal('late_fee_percentage', { precision: 5, scale: 2 }),
  lateFeeFixed: decimal('late_fee_fixed', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Billing Accounts
 * Represents top-level billing entities for organizations
 */
export const billingAccounts = pgTable('billing_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, INACTIVE, SUSPENDED, CLOSED
  billingCurrency: text('billing_currency').notNull().default('USD'),
  billingEmail: text('billing_email').notNull(),
  billingName: text('billing_name').notNull(),
  billingAddressId: uuid('billing_address_id'),
  taxId: text('tax_id'),
  paymentTerms: integer('payment_terms').default(30), // Days
  autoPayEnabled: boolean('auto_pay_enabled').default(false),
  defaultPaymentMethodId: uuid('default_payment_method_id'),
  creditLimit: decimal('credit_limit', { precision: 10, scale: 2 }),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Subscriptions
 * Represents recurring billing subscriptions for service access
 */
export const subscriptions = pgTable('billing_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  billingAccountId: uuid('billing_account_id').notNull().references(() => billingAccounts.id),
  planId: text('plan_id').notNull(), // Reference to pricing plans (STANDARD, PREMIUM, ENTERPRISE, etc.)
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, CANCELED, PAST_DUE, TRIALING, EXPIRED
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  trialEndDate: timestamp('trial_end_date'),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  canceledAt: timestamp('canceled_at'),
  quantity: integer('quantity').default(1),
  priceOverrides: jsonb('price_overrides'), // Custom pricing overrides
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Usage Records
 * Tracks service usage for metering and billing purposes
 */
export const usageRecords = pgTable('billing_usage_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  billingAccountId: uuid('billing_account_id').notNull().references(() => billingAccounts.id),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  serviceName: text('service_name').notNull(),
  usageType: text('usage_type').notNull(), // API_CALL, STORAGE, PROCESSING, etc.
  quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
  unit: text('unit').notNull(), // REQUEST, MB, CPU_SECOND, etc.
  recordedAt: timestamp('recorded_at').notNull(),
  userId: uuid('user_id'),
  sourceIp: text('source_ip'),
  isInvoiced: boolean('is_invoiced').default(false),
  invoiceItemId: uuid('invoice_item_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

/**
 * Billing Events
 * Audit log for all billing-related activities
 */
export const billingEvents = pgTable('billing_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  billingAccountId: uuid('billing_account_id').notNull(),
  eventType: text('event_type').notNull(), // INVOICE_CREATED, PAYMENT_RECORDED, etc.
  description: text('description').notNull(),
  entityType: text('entity_type'), // INVOICE, PAYMENT, SUBSCRIPTION, etc.
  entityId: uuid('entity_id'),
  userId: uuid('user_id'),
  sourceIp: text('source_ip'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Import the claims schema so we can use it for references
import { claims, claimLineItems } from './claims-schema';

// Zod schemas for validation
export const insertInvoiceSchema = createInsertSchema(invoices);
export const selectInvoiceSchema = createSelectSchema(invoices);

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems);
export const selectInvoiceLineItemSchema = createSelectSchema(invoiceLineItems);

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods);
export const selectPaymentMethodSchema = createSelectSchema(paymentMethods);

export const insertPaymentSchema = createInsertSchema(payments);
export const selectPaymentSchema = createSelectSchema(payments);

export const insertPaymentPlanSchema = createInsertSchema(paymentPlans);
export const selectPaymentPlanSchema = createSelectSchema(paymentPlans);

export const insertPaymentPlanItemSchema = createInsertSchema(paymentPlanItems);
export const selectPaymentPlanItemSchema = createSelectSchema(paymentPlanItems);

export const insertPaymentPlanScheduleSchema = createInsertSchema(paymentPlanSchedule);
export const selectPaymentPlanScheduleSchema = createSelectSchema(paymentPlanSchedule);

export const insertStatementSchema = createInsertSchema(statements);
export const selectStatementSchema = createSelectSchema(statements);

export const insertStatementSettingsSchema = createInsertSchema(statementSettings);
export const selectStatementSettingsSchema = createSelectSchema(statementSettings);

export const insertUsageRecordSchema = createInsertSchema(usageRecords);
export const selectUsageRecordSchema = createSelectSchema(usageRecords);

export const insertBillingEventSchema = createInsertSchema(billingEvents);
export const selectBillingEventSchema = createSelectSchema(billingEvents);

export const insertBillingAccountSchema = createInsertSchema(billingAccounts);
export const selectBillingAccountSchema = createSelectSchema(billingAccounts);

export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const selectSubscriptionSchema = createSelectSchema(subscriptions);

// TypeScript types
export type Invoice = z.infer<typeof selectInvoiceSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceLineItem = z.infer<typeof selectInvoiceLineItemSchema>;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;

export type PaymentMethod = z.infer<typeof selectPaymentMethodSchema>;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

export type Payment = z.infer<typeof selectPaymentSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type PaymentPlan = z.infer<typeof selectPaymentPlanSchema>;
export type InsertPaymentPlan = z.infer<typeof insertPaymentPlanSchema>;

export type PaymentPlanItem = z.infer<typeof selectPaymentPlanItemSchema>;
export type InsertPaymentPlanItem = z.infer<typeof insertPaymentPlanItemSchema>;

export type PaymentPlanScheduleItem = z.infer<typeof selectPaymentPlanScheduleSchema>;
export type InsertPaymentPlanScheduleItem = z.infer<typeof insertPaymentPlanScheduleSchema>;

export type Statement = z.infer<typeof selectStatementSchema>;
export type InsertStatement = z.infer<typeof insertStatementSchema>;

export type StatementSettings = z.infer<typeof selectStatementSettingsSchema>;
export type InsertStatementSettings = z.infer<typeof insertStatementSettingsSchema>;

export type UsageRecord = z.infer<typeof selectUsageRecordSchema>;
export type InsertUsageRecord = z.infer<typeof insertUsageRecordSchema>;

export type BillingEvent = z.infer<typeof selectBillingEventSchema>;
export type InsertBillingEvent = z.infer<typeof insertBillingEventSchema>;

export type BillingAccount = z.infer<typeof selectBillingAccountSchema>;
export type InsertBillingAccount = z.infer<typeof insertBillingAccountSchema>;

export type Subscription = z.infer<typeof selectSubscriptionSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;