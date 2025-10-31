import { PrismaClient } from "@prisma/client"

/**
 * Seed audit logs to demonstrate HIPAA compliance tracking
 */
export async function seedAuditLogs(prisma: PrismaClient) {
  // Get users for audit logging
  const users = await prisma.user.findMany()
  const clients = await prisma.user.findMany({ where: { role: "CLIENT" } })
  const herbalists = await prisma.user.findMany({ where: { role: "HERBALIST" } })
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } })

  if (users.length === 0) {
    console.log("   ⚠️ No users found. Skipping audit log seeding.")
    return []
  }

  const auditLogs = [
    // User authentication logs
    {
      eventType: "USER_LOGIN",
      outcome: "SUCCESS",
      timestamp: new Date("2024-03-01T09:00:00Z"),
      userId: herbalists[0]?.id || users[0].id,
      userRole: "HERBALIST",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      resourceType: "Authentication",
      resourceId: "login",
      dataSensitivity: "PUBLIC",
      details: {
        loginMethod: "email_password",
        sessionId: "sess_abc123def456",
        deviceInfo: "MacOS Chrome Browser"
      }
    },
    {
      eventType: "USER_LOGIN",
      outcome: "FAILURE",
      timestamp: new Date("2024-03-01T09:15:00Z"),
      userId: clients[0]?.id || users[0].id,
      userRole: "CLIENT",
      ipAddress: "10.0.0.50",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      resourceType: "Authentication",
      resourceId: "login",
      dataSensitivity: "PUBLIC",
      details: {
        loginMethod: "email_password",
        failureReason: "invalid_password",
        attemptNumber: 2
      }
    },

    // PHI access logs
    {
      eventType: "PHI_READ",
      outcome: "SUCCESS",
      timestamp: new Date("2024-03-01T10:30:00Z"),
      userId: herbalists[0]?.id || users[0].id,
      userRole: "HERBALIST",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      resourceType: "ClientProfile",
      resourceId: clients[0]?.id || "client_123",
      dataSensitivity: "PHI",
      details: {
        accessReason: "consultation_review",
        fieldsAccessed: ["allergies", "medications", "conditions"],
        appointmentId: "appt_456",
        purpose: "treatment_planning"
      }
    },
    {
      eventType: "PHI_UPDATE",
      outcome: "SUCCESS",
      timestamp: new Date("2024-03-01T11:00:00Z"),
      userId: herbalists[0]?.id || users[0].id,
      userRole: "HERBALIST",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      resourceType: "ConsultationNote",
      resourceId: "consult_789",
      dataSensitivity: "PHI",
      details: {
        updateType: "create_consultation_note",
        clientId: clients[0]?.id || "client_123",
        noteFields: ["chief_complaint", "assessment", "recommendations"],
        appointmentDate: "2024-03-01"
      }
    },

    // Admin access logs
    {
      eventType: "ADMIN_ACCESS",
      outcome: "SUCCESS",
      timestamp: new Date("2024-03-01T14:00:00Z"),
      userId: admins[0]?.id || users[0].id,
      userRole: "ADMIN",
      ipAddress: "192.168.1.10",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      resourceType: "AdminPanel",
      resourceId: "user_management",
      dataSensitivity: "INTERNAL",
      details: {
        action: "view_user_list",
        filters: { role: "CLIENT", status: "active" },
        recordsViewed: 25
      }
    },
    {
      eventType: "USER_UPDATE",
      outcome: "SUCCESS",
      timestamp: new Date("2024-03-01T14:15:00Z"),
      userId: admins[0]?.id || users[0].id,
      userRole: "ADMIN",
      ipAddress: "192.168.1.10",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      resourceType: "UserAccount",
      resourceId: herbalists[1]?.id || users[1].id,
      dataSensitivity: "INTERNAL",
      details: {
        action: "update_user_role",
        oldRole: "CLIENT",
        newRole: "HERBALIST",
        reason: "role_upgrade_request",
        approvedBy: admins[0]?.id || "admin_123"
      }
    },

    // Data export logs
    {
      eventType: "DATA_EXPORT",
      outcome: "SUCCESS",
      timestamp: new Date("2024-03-01T16:00:00Z"),
      userId: herbalists[0]?.id || users[0].id,
      userRole: "HERBALIST",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      resourceType: "ConsultationNotes",
      resourceId: "export_monthly_report",
      dataSensitivity: "PHI",
      details: {
        exportType: "consultation_summary",
        dateRange: { start: "2024-02-01", end: "2024-02-29" },
        recordCount: 15,
        exportFormat: "PDF",
        purpose: "monthly_review"
      }
    },

    // Failed access attempts
    {
      eventType: "PHI_READ",
      outcome: "FAILURE",
      timestamp: new Date("2024-03-02T09:30:00Z"),
      userId: clients[1]?.id || users[1].id,
      userRole: "CLIENT",
      ipAddress: "203.0.113.45",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      resourceType: "ClientProfile",
      resourceId: clients[0]?.id || "client_123",
      dataSensitivity: "PHI",
      details: {
        accessDeniedReason: "insufficient_permissions",
        attemptedAction: "view_other_client_profile",
        securityAlert: true
      }
    },

    // System events
    {
      eventType: "SYSTEM_ACCESS",
      outcome: "SUCCESS",
      timestamp: new Date("2024-03-02T08:00:00Z"),
      userId: "SYSTEM",
      userRole: "SYSTEM",
      ipAddress: "127.0.0.1",
      userAgent: "System/Automated",
      resourceType: "Database",
      resourceId: "backup_process",
      dataSensitivity: "PHI",
      details: {
        operation: "automated_backup",
        backupType: "full_database",
        backupSize: "2.3GB",
        encrypted: true,
        retentionPeriod: "7_years"
      }
    },
    {
      eventType: "SECURITY_EVENT",
      outcome: "SUCCESS",
      timestamp: new Date("2024-03-02T12:00:00Z"),
      userId: "SYSTEM",
      userRole: "SYSTEM",
      ipAddress: "127.0.0.1",
      userAgent: "System/SecurityMonitor",
      resourceType: "Security",
      resourceId: "intrusion_detection",
      dataSensitivity: "INTERNAL",
      details: {
        eventType: "suspicious_login_pattern",
        sourceIP: "198.51.100.42",
        action: "temporary_ip_block",
        duration: "24_hours",
        reason: "multiple_failed_attempts"
      }
    },

    // Password changes
    {
      eventType: "USER_UPDATE",
      outcome: "SUCCESS",
      timestamp: new Date("2024-03-03T10:00:00Z"),
      userId: clients[0]?.id || users[0].id,
      userRole: "CLIENT",
      ipAddress: "192.168.1.200",
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      resourceType: "UserAccount",
      resourceId: clients[0]?.id || "client_123",
      dataSensitivity: "INTERNAL",
      details: {
        action: "password_change",
        initiatedBy: "user",
        passwordStrength: "strong",
        previousPasswordAge: "90_days"
      }
    },

    // Email communications
    {
      eventType: "PHI_TRANSMIT",
      outcome: "SUCCESS",
      timestamp: new Date("2024-03-03T14:30:00Z"),
      userId: herbalists[0]?.id || users[0].id,
      userRole: "HERBALIST",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      resourceType: "Email",
      resourceId: "email_to_client",
      dataSensitivity: "PHI",
      details: {
        recipient: clients[0]?.id || "client_123",
        emailType: "appointment_reminder",
        encrypted: true,
        containsPHI: true,
        purpose: "treatment_coordination"
      }
    },

    // Formula access logs
    {
      eventType: "RESOURCE_ACCESS",
      outcome: "SUCCESS",
      timestamp: new Date("2024-03-04T11:00:00Z"),
      userId: herbalists[1]?.id || users[1].id,
      userRole: "HERBALIST",
      ipAddress: "10.0.0.75",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      resourceType: "Formula",
      resourceId: "formula_stress_support",
      dataSensitivity: "INTERNAL",
      details: {
        action: "view_formula_details",
        formulaName: "Stress Support Blend",
        purpose: "client_consultation",
        clientId: clients[1]?.id || "client_456"
      }
    },

    // Inventory access
    {
      eventType: "RESOURCE_UPDATE",
      outcome: "SUCCESS",
      timestamp: new Date("2024-03-04T15:45:00Z"),
      userId: herbalists[0]?.id || users[0].id,
      userRole: "HERBALIST",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      resourceType: "Inventory",
      resourceId: "herb_ashwagandha",
      dataSensitivity: "INTERNAL",
      details: {
        action: "inventory_adjustment",
        herbName: "Ashwagandha",
        quantityBefore: 2500.0,
        quantityAfter: 2200.0,
        reason: "formula_preparation",
        clientFormulas: 3
      }
    }
  ]

  // Create audit logs
  const createdLogs = []
  for (const logData of auditLogs) {
    const log = await prisma.auditLog.create({
      data: logData
    })
    createdLogs.push(log)
  }

  // Create system configuration logs
  const systemLogs = [
    {
      eventType: "SYSTEM_CONFIG",
      outcome: "SUCCESS",
      timestamp: new Date("2024-03-01T00:00:00Z"),
      userId: "SYSTEM",
      userRole: "SYSTEM",
      ipAddress: "127.0.0.1",
      userAgent: "System/Configuration",
      resourceType: "SystemConfig",
      resourceId: "hipaa_compliance_settings",
      dataSensitivity: "INTERNAL",
      details: {
        action: "enable_audit_logging",
        retentionPeriod: "7_years",
        encryptionEnabled: true,
        accessControlsVerified: true
      }
    },
    {
      eventType: "SYSTEM_CONFIG",
      outcome: "SUCCESS",
      timestamp: new Date("2024-03-01T00:15:00Z"),
      userId: "SYSTEM",
      userRole: "SYSTEM",
      ipAddress: "127.0.0.1",
      userAgent: "System/Configuration",
      resourceType: "SystemConfig",
      resourceId: "phi_encryption_settings",
      dataSensitivity: "INTERNAL",
      details: {
        action: "configure_field_encryption",
        encryptionAlgorithm: "AES-256-GCM",
        keyRotationEnabled: true,
        encryptedFields: [
          "allergies", "medications", "conditions", "healthGoals",
          "chiefComplaint", "assessment", "recommendations",
          "privateNotes", "emergencyContact"
        ]
      }
    }
  ]

  for (const logData of systemLogs) {
    await prisma.auditLog.create({
      data: logData
    })
  }

  console.log(`   ✅ Created ${auditLogs.length + systemLogs.length} audit log entries`)
  console.log(`   🔒 Logs demonstrate HIPAA compliance tracking`)
  console.log(`   📊 Includes login attempts, PHI access, admin actions, and system events`)

  return createdLogs
}