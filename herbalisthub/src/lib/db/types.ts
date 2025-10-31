// Re-export Prisma types for easier importing
export type {
  User,
  Role,
  Account,
  Session,
  VerificationToken,
  
  // Herb Management
  Herb,
  HerbType,
  InventoryLog,
  
  // Formula Management
  Formula,
  FormulaIngredient,
  Preparation,
  
  // Client Management
  ClientProfile,
  ConsultationNote,
  TreatmentPlan,
  
  // Appointments
  Appointment,
  AppointmentType,
  AppointmentStatus,
  
  // Intake Forms
  IntakeForm,
  IntakeSubmission,
  
  // Content Management
  BlogPost,
  BlogCategory,
  BlogTag,
  Event,
  EventType,
  EventRegistration,
  RegistrationStatus,
  
  // Communication
  Message,
  MessageType,
  MessageThread,
  Priority,
  Discussion,
  
  // Audit & Compliance
  AuditLog,
  EncryptionMetadata,
  
  // Prisma generated types
  Prisma,
} from '@prisma/client';

// Custom database types
export interface DatabaseError {
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface SearchOptions extends PaginationOptions {
  query?: string;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// HIPAA compliance types
export interface EncryptedField {
  tableName: string;
  fieldName: string;
  isEncrypted: boolean;
  algorithm?: string;
}

export interface AuditContext {
  userId: string;
  userRole: Role;
  ipAddress: string;
  userAgent?: string;
  reason?: string;
}