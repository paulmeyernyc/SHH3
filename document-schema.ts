/**
 * Document Management Service Schema
 * 
 * This schema defines tables for document storage, versioning, and access control:
 * - Document Libraries (containers for documents)
 * - Documents (metadata for healthcare documents)
 * - Document Versions (versioned content of documents)
 * - Document Permissions (access control)
 * - Document Categories (classification)
 * - Document Shares (temporary sharing)
 * - Document Audit Records (compliance tracking)
 */

import { relations, InferSelectModel, InferInsertModel } from "drizzle-orm";
import { pgTable, serial, integer, text, varchar, timestamp, boolean, jsonb, index, uuid, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Document Libraries
export const documentLibraries = pgTable("document_libraries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  organizationId: integer("organization_id").notNull(),
  isDefault: boolean("is_default").default(false),
  securityLevel: varchar("security_level", { length: 20 }).default("standard").notNull(),
  settings: jsonb("settings").default({}),
  retentionPolicy: jsonb("retention_policy").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentLibrariesRelations = relations(documentLibraries, ({ many }) => ({
  documents: many(documents),
  permissions: many(documentLibraryPermissions),
}));

// Document Library Permissions (ACL for libraries)
export const documentLibraryPermissions = pgTable("document_library_permissions", {
  id: serial("id").primaryKey(),
  libraryId: integer("library_id").notNull().references(() => documentLibraries.id, { onDelete: "cascade" }),
  principalType: varchar("principal_type", { length: 20 }).notNull(), // user, role, organization, team
  principalId: integer("principal_id").notNull(),
  permission: varchar("permission", { length: 20 }).notNull(), // read, write, delete, admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentLibraryPermissionsRelations = relations(documentLibraryPermissions, ({ one }) => ({
  library: one(documentLibraries, {
    fields: [documentLibraryPermissions.libraryId],
    references: [documentLibraries.id],
  }),
}));

// Document Categories
export const documentCategories = pgTable("document_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  parentId: integer("parent_id").references(() => documentCategories.id),
  metadata: jsonb("metadata").default({}),
  securityLevel: varchar("security_level", { length: 20 }).default("standard").notNull(),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentCategoriesRelations = relations(documentCategories, ({ one, many }) => ({
  parent: one(documentCategories, {
    fields: [documentCategories.parentId],
    references: [documentCategories.id],
  }),
  children: many(documentCategories),
  documents: many(documents),
}));

// Documents (metadata)
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  externalId: uuid("external_id").defaultRandom().notNull().unique(),
  filename: varchar("filename", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  libraryId: integer("library_id").notNull().references(() => documentLibraries.id),
  categoryId: integer("category_id").references(() => documentCategories.id),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(), // in bytes
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, archived, deleted
  securityLevel: varchar("security_level", { length: 20 }).default("standard").notNull(),
  patientId: integer("patient_id"),
  encounterId: integer("encounter_id"),
  ownerId: integer("owner_id").notNull(),
  metadata: jsonb("metadata").default({}),
  tags: jsonb("tags").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  currentVersionId: integer("current_version_id"),
}, (table) => {
  return {
    patientIdIdx: index("document_patient_id_idx").on(table.patientId),
    encounterIdIdx: index("document_encounter_id_idx").on(table.encounterId),
    ownerIdIdx: index("document_owner_id_idx").on(table.ownerId),
    libraryIdIdx: index("document_library_id_idx").on(table.libraryId),
    categoryIdIdx: index("document_category_id_idx").on(table.categoryId),
    statusIdx: index("document_status_idx").on(table.status),
    securityLevelIdx: index("document_security_level_idx").on(table.securityLevel),
  };
});

export const documentsRelations = relations(documents, ({ one, many }) => ({
  library: one(documentLibraries, {
    fields: [documents.libraryId],
    references: [documentLibraries.id],
  }),
  category: one(documentCategories, {
    fields: [documents.categoryId],
    references: [documentCategories.id],
  }),
  versions: many(documentVersions),
  permissions: many(documentPermissions),
  shares: many(documentShares),
  auditRecords: many(documentAuditRecords),
  currentVersion: one(documentVersions, {
    fields: [documents.currentVersionId],
    references: [documentVersions.id],
  }),
}));

// Document Versions
export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  storageProvider: varchar("storage_provider", { length: 50 }).notNull(), // s3, filesystem, azure_blob
  storagePath: varchar("storage_path", { length: 500 }).notNull(),
  size: integer("size").notNull(), // in bytes
  hash: varchar("hash", { length: 128 }).notNull(), // SHA-512 hash of content
  metadata: jsonb("metadata").default({}),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  comment: text("comment"),
}, (table) => {
  return {
    documentIdIdx: index("document_version_document_id_idx").on(table.documentId),
    versionNumberIdx: index("document_version_number_idx").on(table.versionNumber, table.documentId),
    hashIdx: index("document_version_hash_idx").on(table.hash),
    createdByIdIdx: index("document_version_created_by_id_idx").on(table.createdById),
  };
});

// Set up circular relation after both tables are defined
export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, {
    fields: [documentVersions.documentId],
    references: [documents.id],
  }),
}));

// Document Permissions (ACL for individual documents)
export const documentPermissions = pgTable("document_permissions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  principalType: varchar("principal_type", { length: 20 }).notNull(), // user, role, organization, team
  principalId: integer("principal_id").notNull(),
  permission: varchar("permission", { length: 20 }).notNull(), // read, write, delete, admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
}, (table) => {
  return {
    documentIdIdx: index("document_permission_document_id_idx").on(table.documentId),
    principalIdx: index("document_permission_principal_idx").on(table.principalType, table.principalId),
  };
});

export const documentPermissionsRelations = relations(documentPermissions, ({ one }) => ({
  document: one(documents, {
    fields: [documentPermissions.documentId],
    references: [documents.id],
  }),
}));

// Document Shares (for temporary access)
export const documentShares = pgTable("document_shares", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  token: uuid("token").defaultRandom().notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  createdById: integer("created_by_id").notNull(),
  accessCount: integer("access_count").default(0).notNull(),
  maxAccess: integer("max_access"),
  permission: varchar("permission", { length: 20 }).default("read").notNull(), // read, comment
  password: varchar("password", { length: 255 }),
  expiresAt: timestamp("expires_at"),
  notifyOnAccess: boolean("notify_on_access").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at"),
}, (table) => {
  return {
    documentIdIdx: index("document_share_document_id_idx").on(table.documentId),
    tokenIdx: index("document_share_token_idx").on(table.token),
    createdByIdIdx: index("document_share_created_by_id_idx").on(table.createdById),
  };
});

export const documentSharesRelations = relations(documentShares, ({ one }) => ({
  document: one(documents, {
    fields: [documentShares.documentId],
    references: [documents.id],
  }),
}));

// Document Audit Records (for compliance tracking)
export const documentAuditRecords = pgTable("document_audit_records", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id),
  action: varchar("action", { length: 50 }).notNull(), // viewed, downloaded, printed, shared, edited, deleted, etc.
  userId: integer("user_id").notNull(),
  userIp: varchar("user_ip", { length: 50 }),
  details: jsonb("details").default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  success: boolean("success").default(true).notNull(),
}, (table) => {
  return {
    documentIdIdx: index("document_audit_document_id_idx").on(table.documentId),
    userIdIdx: index("document_audit_user_id_idx").on(table.userId),
    actionIdx: index("document_audit_action_idx").on(table.action),
    timestampIdx: index("document_audit_timestamp_idx").on(table.timestamp),
  };
});

export const documentAuditRecordsRelations = relations(documentAuditRecords, ({ one }) => ({
  document: one(documents, {
    fields: [documentAuditRecords.documentId],
    references: [documents.id],
  }),
}));

// Document Tags
export const documentTags = pgTable("document_tags", {
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  tag: varchar("tag", { length: 100 }).notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.documentId, table.tag] }),
    tagIdx: index("document_tag_idx").on(table.tag),
  };
});

export const documentTagsRelations = relations(documentTags, ({ one }) => ({
  document: one(documents, {
    fields: [documentTags.documentId],
    references: [documents.id],
  }),
}));

// Type Definitions
export type DocumentLibrary = InferSelectModel<typeof documentLibraries>;
export type InsertDocumentLibrary = InferInsertModel<typeof documentLibraries>;

export type DocumentLibraryPermission = InferSelectModel<typeof documentLibraryPermissions>;
export type InsertDocumentLibraryPermission = InferInsertModel<typeof documentLibraryPermissions>;

export type DocumentCategory = InferSelectModel<typeof documentCategories>;
export type InsertDocumentCategory = InferInsertModel<typeof documentCategories>;

export type Document = InferSelectModel<typeof documents>;
export type InsertDocument = InferInsertModel<typeof documents>;

export type DocumentVersion = InferSelectModel<typeof documentVersions>;
export type InsertDocumentVersion = InferInsertModel<typeof documentVersions>;

export type DocumentPermission = InferSelectModel<typeof documentPermissions>;
export type InsertDocumentPermission = InferInsertModel<typeof documentPermissions>;

export type DocumentShare = InferSelectModel<typeof documentShares>;
export type InsertDocumentShare = InferInsertModel<typeof documentShares>;

export type DocumentAuditRecord = InferSelectModel<typeof documentAuditRecords>;
export type InsertDocumentAuditRecord = InferInsertModel<typeof documentAuditRecords>;

export type DocumentTag = InferSelectModel<typeof documentTags>;
export type InsertDocumentTag = InferInsertModel<typeof documentTags>;

// Zod Schemas
export const insertDocumentLibrarySchema = createInsertSchema(documentLibraries);
export const selectDocumentLibrarySchema = createSelectSchema(documentLibraries);

export const insertDocumentLibraryPermissionSchema = createInsertSchema(documentLibraryPermissions);
export const selectDocumentLibraryPermissionSchema = createSelectSchema(documentLibraryPermissions);

export const insertDocumentCategorySchema = createInsertSchema(documentCategories);
export const selectDocumentCategorySchema = createSelectSchema(documentCategories);

export const insertDocumentSchema = createInsertSchema(documents, {
  metadata: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
}).omit({ externalId: true, currentVersionId: true });

export const selectDocumentSchema = createSelectSchema(documents);

export const insertDocumentVersionSchema = createInsertSchema(documentVersions);
export const selectDocumentVersionSchema = createSelectSchema(documentVersions);

export const insertDocumentPermissionSchema = createInsertSchema(documentPermissions);
export const selectDocumentPermissionSchema = createSelectSchema(documentPermissions);

export const insertDocumentShareSchema = createInsertSchema(documentShares, {
  expiresAt: z.coerce.date().optional(),
}).omit({ token: true, accessCount: true, lastAccessedAt: true });

export const selectDocumentShareSchema = createSelectSchema(documentShares);

export const insertDocumentAuditRecordSchema = createInsertSchema(documentAuditRecords, {
  details: z.record(z.string(), z.any()).optional(),
});
export const selectDocumentAuditRecordSchema = createSelectSchema(documentAuditRecords);

export const insertDocumentTagSchema = createInsertSchema(documentTags);
export const selectDocumentTagSchema = createSelectSchema(documentTags);

// Constants and Enums
export const DocumentSecurityLevels = {
  PUBLIC: "public",
  STANDARD: "standard",
  SENSITIVE: "sensitive",
  CONFIDENTIAL: "confidential",
  RESTRICTED: "restricted"
} as const;

export const DocumentStatus = {
  ACTIVE: "active",
  ARCHIVED: "archived",
  DELETED: "deleted",
  PROCESSING: "processing",
  ERROR: "error",
  LOCKED: "locked"
} as const;

export const DocumentPermissionTypes = {
  READ: "read",
  WRITE: "write",
  DELETE: "delete",
  ADMIN: "admin",
  SHARE: "share",
  COMMENT: "comment"
} as const;

export const DocumentAuditActions = {
  VIEWED: "viewed",
  DOWNLOADED: "downloaded",
  PRINTED: "printed",
  SHARED: "shared",
  CREATED: "created",
  EDITED: "edited",
  DELETED: "deleted",
  RESTORED: "restored",
  PERMISSION_CHANGED: "permission_changed",
  VERSION_CREATED: "version_created",
  METADATA_CHANGED: "metadata_changed",
  MOVED: "moved"
} as const;

export const StorageProviders = {
  S3: "s3",
  FILESYSTEM: "filesystem",
  AZURE_BLOB: "azure_blob",
  GOOGLE_CLOUD: "google_cloud"
} as const;

export const PrincipalTypes = {
  USER: "user",
  ROLE: "role",
  ORGANIZATION: "organization",
  TEAM: "team"
} as const;