/**
 * Secure Messaging Database Schema
 * 
 * This module defines the database schema for the Secure Messaging service:
 * - Conversations (threads between participants)
 * - Messages (individual communications)
 * - Message attachments
 * - Message receipts
 * - Participant preferences and settings
 */

import { pgTable, serial, text, jsonb, timestamp, boolean, integer, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enumerations
export const messageStatusEnum = pgEnum('message_status', [
  'draft', 'sent', 'delivered', 'read', 'error', 'recalled'
]);

export const messagePriorityEnum = pgEnum('message_priority', [
  'low', 'normal', 'high', 'urgent'
]);

export const conversationTypeEnum = pgEnum('conversation_type', [
  'direct', 'group', 'broadcast', 'care_team', 'system'
]);

export const participantRoleEnum = pgEnum('participant_role', [
  'owner', 'admin', 'member', 'guest', 'bot'
]);

export const attachmentTypeEnum = pgEnum('attachment_type', [
  'image', 'document', 'audio', 'video', 'fhir_resource', 'other'
]);

export const notificationPreferenceEnum = pgEnum('notification_preference', [
  'all', 'mentions', 'none'
]);

// Conversations (Message Threads)
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull().unique(),
  type: conversationTypeEnum('type').notNull().default('direct'),
  title: text('title'),
  createdBy: integer('createdBy').notNull(), // References users.id
  organizationId: integer('organizationId'), // Optional organization scope
  metadata: jsonb('metadata').notNull().default('{}'),
  settings: jsonb('settings').notNull().default('{}'),
  isEncrypted: boolean('isEncrypted').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow(),
  lastMessageAt: timestamp('lastMessageAt', { mode: 'string' })
});

// Conversation Participants
export const conversationParticipants = pgTable('conversation_participants', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversationId').notNull().references(() => conversations.id),
  userId: integer('userId').notNull(), // References users.id
  role: participantRoleEnum('role').notNull().default('member'),
  displayName: text('displayName'),
  joinedAt: timestamp('joinedAt', { mode: 'string' }).notNull().defaultNow(),
  leftAt: timestamp('leftAt', { mode: 'string' }),
  isActive: boolean('isActive').notNull().default(true),
  isHidden: boolean('isHidden').notNull().default(false),
  notificationPreference: notificationPreferenceEnum('notificationPreference').notNull().default('all'),
  settings: jsonb('settings').notNull().default('{}'),
  lastViewedAt: timestamp('lastViewedAt', { mode: 'string' }),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    participantIdx: uniqueIndex('participant_idx').on(table.conversationId, table.userId)
  };
});

// Messages
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull().unique(),
  conversationId: integer('conversationId').notNull().references(() => conversations.id),
  senderId: integer('senderId').notNull(), // References users.id
  replyToId: integer('replyToId').references(() => messages.id),
  content: text('content').notNull(),
  contentType: text('contentType').notNull().default('text/plain'),
  status: messageStatusEnum('status').notNull().default('sent'),
  priority: messagePriorityEnum('priority').notNull().default('normal'),
  isEncrypted: boolean('isEncrypted').notNull().default(false),
  metadata: jsonb('metadata').notNull().default('{}'),
  sentAt: timestamp('sentAt', { mode: 'string' }).notNull().defaultNow(),
  expiresAt: timestamp('expiresAt', { mode: 'string' }),
  editedAt: timestamp('editedAt', { mode: 'string' }),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
});

// Message Attachments
export const messageAttachments = pgTable('message_attachments', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull().unique(),
  messageId: integer('messageId').notNull().references(() => messages.id),
  type: attachmentTypeEnum('type').notNull(),
  fileName: text('fileName'),
  mimeType: text('mimeType').notNull(),
  size: integer('size').notNull(),
  storageKey: text('storageKey').notNull(), // Path to stored file
  thumbnail: text('thumbnail'), // Optional thumbnail for images
  metadata: jsonb('metadata').notNull().default('{}'),
  isEncrypted: boolean('isEncrypted').notNull().default(false),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
});

// Message Receipts (tracks delivery and read status)
export const messageReceipts = pgTable('message_receipts', {
  id: serial('id').primaryKey(),
  messageId: integer('messageId').notNull().references(() => messages.id),
  userId: integer('userId').notNull(), // References users.id
  status: messageStatusEnum('status').notNull(),
  receivedAt: timestamp('receivedAt', { mode: 'string' }),
  readAt: timestamp('readAt', { mode: 'string' }),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
}, (table) => {
  return {
    receiptIdx: uniqueIndex('receipt_idx').on(table.messageId, table.userId)
  };
});

// Message Mentions (references to users in messages)
export const messageMentions = pgTable('message_mentions', {
  id: serial('id').primaryKey(),
  messageId: integer('messageId').notNull().references(() => messages.id),
  userId: integer('userId').notNull(), // References users.id
  isRead: boolean('isRead').notNull().default(false),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow()
});

// For reference (already defined elsewhere)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull().defaultNow()
});

// Schema validation
export const insertConversationSchema = createInsertSchema(conversations);
export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants);
export const insertMessageSchema = createInsertSchema(messages);
export const insertMessageAttachmentSchema = createInsertSchema(messageAttachments);
export const insertMessageReceiptSchema = createInsertSchema(messageReceipts);
export const insertMessageMentionSchema = createInsertSchema(messageMentions);

// Types
export type Conversation = typeof conversations.$inferSelect;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MessageAttachment = typeof messageAttachments.$inferSelect;
export type MessageReceipt = typeof messageReceipts.$inferSelect;
export type MessageMention = typeof messageMentions.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertMessageAttachment = z.infer<typeof insertMessageAttachmentSchema>;
export type InsertMessageReceipt = z.infer<typeof insertMessageReceiptSchema>;
export type InsertMessageMention = z.infer<typeof insertMessageMentionSchema>;