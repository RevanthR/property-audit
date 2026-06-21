import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  serial,
  uuid,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const propertyTypeEnum = pgEnum("property_type", ["hostel", "hotel"]);

export const roleEnum = pgEnum("role", ["admin", "auditor"]);

export const auditStatusEnum = pgEnum("audit_status", ["draft", "submitted"]);

export const conditionEnum = pgEnum("condition", [
  "ok",
  "not_ok",
  "not_available",
]);

export const moduleTypeEnum = pgEnum("module_type", [
  "remarks",
  "checklist",
  "count",
  "status",
]);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  pin: text("pin"), // only for admin (4-digit PIN)
  passwordHash: text("password_hash"), // for admin-created auditors
  hasAllPropertiesAccess: boolean("has_all_properties_access").notNull().default(false),
  role: roleEnum("role").notNull().default("auditor"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Properties ──────────────────────────────────────────────────────────────

export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  type: propertyTypeEnum("type").notNull(),
  location: text("location").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Auditor ↔ Property assignment
export const userProperties = pgTable("user_properties", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
});

// ─── Audits ──────────────────────────────────────────────────────────────────

export const audits = pgTable("audits", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  auditorId: uuid("auditor_id").references(() => users.id, { onDelete: "set null" }),
  auditorName: text("auditor_name").notNull(),
  auditDate: text("audit_date").notNull(), // stored as YYYY-MM-DD string
  status: auditStatusEnum("status").notNull().default("draft"),
  currentStep: text("current_step").default("process"),
  completionPct: integer("completion_pct").notNull().default(0),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Hostel: Process ─────────────────────────────────────────────────────────

export const auditProcess = pgTable("audit_process", {
  id: uuid("id").defaultRandom().primaryKey(),
  auditId: uuid("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  admissionsRemarks: text("admissions_remarks"),
  paymentsRemarks: text("payments_remarks"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Hostel: Manpower ────────────────────────────────────────────────────────

export const auditManpower = pgTable("audit_manpower", {
  id: uuid("id").defaultRandom().primaryKey(),
  auditId: uuid("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  section: text("section").notNull(), // housekeeping | kitchen | manager | additional
  count: integer("count"),
  remarks: text("remarks"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Hostel: Equipment ───────────────────────────────────────────────────────

export const auditEquipment = pgTable("audit_equipment", {
  id: uuid("id").defaultRandom().primaryKey(),
  auditId: uuid("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  item: text("item").notNull(), // motors | vehicles | washing_machines
  condition: conditionEnum("condition"), // for motors
  count: integer("count"), // for vehicles, washing machines
  remarks: text("remarks"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Rooms (shared hostel + hotel) ───────────────────────────────────────────

export const auditRooms = pgTable("audit_rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  auditId: uuid("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  roomNumber: text("room_number").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const roomChecklistItems = pgTable("room_checklist_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => auditRooms.id, { onDelete: "cascade" }),
  templateItemId: uuid("template_item_id").references(
    () => checklistItems.id
  ),
  itemLabel: text("item_label").notNull(), // snapshot of label at time of audit
  condition: conditionEnum("condition"),
  remarks: text("remarks"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Common Areas / Property Management ──────────────────────────────────────

export const auditCommonAreas = pgTable("audit_common_areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  auditId: uuid("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  areaKey: text("area_key").notNull(), // e.g. "kitchen", "corridors", "lift"
  areaLabel: text("area_label").notNull(),
  moduleType: moduleTypeEnum("module_type").notNull(),
  remarks: text("remarks"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const commonAreaChecklistItems = pgTable("common_area_checklist_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  commonAreaId: uuid("common_area_id")
    .notNull()
    .references(() => auditCommonAreas.id, { onDelete: "cascade" }),
  templateItemId: uuid("template_item_id").references(
    () => checklistItems.id
  ),
  itemLabel: text("item_label").notNull(),
  condition: conditionEnum("condition"),
  remarks: text("remarks"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Hotel: Sections ─────────────────────────────────────────────────────────

export const auditHotelSections = pgTable("audit_hotel_sections", {
  id: uuid("id").defaultRandom().primaryKey(),
  auditId: uuid("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  sectionKey: text("section_key").notNull(), // e.g. "front_office", "housekeeping"
  sectionLabel: text("section_label").notNull(),
  subAreaKey: text("sub_area_key").notNull(),
  subAreaLabel: text("sub_area_label").notNull(),
  moduleType: moduleTypeEnum("module_type").notNull(),
  remarks: text("remarks"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const hotelSectionChecklistItems = pgTable(
  "hotel_section_checklist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => auditHotelSections.id, { onDelete: "cascade" }),
    templateItemId: uuid("template_item_id").references(
      () => checklistItems.id
    ),
    itemLabel: text("item_label").notNull(),
    condition: conditionEnum("condition"),
    remarks: text("remarks"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

// ─── Section Locks (collaborative editing) ───────────────────────────────────
// One lock row per (audit, section). Expires after 60s of no heartbeat.
export const sectionLocks = pgTable(
  "section_locks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    auditId: uuid("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
    sectionKey: text("section_key").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    userName: text("user_name").notNull(),
    lockedAt: timestamp("locked_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sl_audit_section_uniq").on(t.auditId, t.sectionKey)]
);

// ─── Checklist Templates (Admin-Configurable) ────────────────────────────────

export const checklistTemplates = pgTable("checklist_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyType: text("property_type").notNull(), // "hostel" | "hotel" | "both"
  context: text("context").notNull(), // "room_hostel" | "room_hotel" | "kitchen" | "hotel_front_office" | etc.
  name: text("name").notNull(),
  moduleType: moduleTypeEnum("module_type").notNull().default("checklist"),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const checklistItems = pgTable("checklist_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => checklistTemplates.id, { onDelete: "cascade" }),
  itemLabel: text("item_label").notNull(),
  moduleType: moduleTypeEnum("module_type").notNull().default("checklist"),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
export type Property = typeof properties.$inferSelect;
export type Audit = typeof audits.$inferSelect;
export type AuditProcess = typeof auditProcess.$inferSelect;
export type AuditManpower = typeof auditManpower.$inferSelect;
export type AuditEquipment = typeof auditEquipment.$inferSelect;
export type AuditRoom = typeof auditRooms.$inferSelect;
export type RoomChecklistItem = typeof roomChecklistItems.$inferSelect;
export type AuditCommonArea = typeof auditCommonAreas.$inferSelect;
export type CommonAreaChecklistItem =
  typeof commonAreaChecklistItems.$inferSelect;
export type AuditHotelSection = typeof auditHotelSections.$inferSelect;
export type HotelSectionChecklistItem =
  typeof hotelSectionChecklistItems.$inferSelect;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type SectionLock = typeof sectionLocks.$inferSelect;
