import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

/**
 * Seed users with different roles and sample data
 */
export async function seedUsers(prisma: PrismaClient) {
  // Create admin users
  const adminPassword = await hash("admin123!", 12)
  
  const admin1 = await prisma.user.create({
    data: {
      email: "admin@herbalisthub.com",
      name: "System Administrator",
      role: "ADMIN",
      emailVerified: new Date(),
      password: adminPassword,
      isActive: true,
      lastLogin: new Date(),
    }
  })

  // Create herbalist users
  const herbalistPassword = await hash("herbalist123!", 12)
  
  const herbalist1 = await prisma.user.create({
    data: {
      email: "sarah.herbalist@example.com",
      name: "Dr. Sarah Chen",
      role: "HERBALIST",
      emailVerified: new Date(),
      password: herbalistPassword,
      phone: "+1-555-0101",
      isActive: true,
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      practiceInfo: {
        create: {
          licenseNumber: "HL-2024-001",
          certifications: ["Certified Master Herbalist", "Clinical Herbalist", "Ayurvedic Practitioner"],
          businessName: "Chen Herbal Wellness",
          businessAddress: "123 Wellness Street, Portland, OR 97201",
          website: "https://chenherbalmedicine.com"
        }
      }
    }
  })

  const herbalist2 = await prisma.user.create({
    data: {
      email: "michael.herbalist@example.com",
      name: "Michael Rodriguez",
      role: "HERBALIST",
      emailVerified: new Date(),
      password: herbalistPassword,
      phone: "+1-555-0102",
      isActive: true,
      lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      practiceInfo: {
        create: {
          licenseNumber: "HL-2024-002",
          certifications: ["Registered Herbalist", "Traditional Chinese Medicine", "Nutritional Herbalist"],
          businessName: "Mountain View Herbal Clinic",
          businessAddress: "456 Mountain View Drive, Boulder, CO 80302",
          website: "https://mountainviewherbs.com"
        }
      }
    }
  })

  // Create client users with profiles
  const clientPassword = await hash("client123!", 12)
  
  const client1 = await prisma.user.create({
    data: {
      email: "emily.client@example.com",
      name: "Emily Johnson",
      role: "CLIENT",
      emailVerified: new Date(),
      password: clientPassword,
      phone: "+1-555-0201",
      isActive: true,
      lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      clientProfile: {
        create: {
          dateOfBirth: new Date("1985-06-15"),
          gender: "female",
          emergencyContact: {
            name: "John Johnson",
            phone: "+1-555-0202",
            relationship: "spouse"
          },
          allergies: ["peanuts", "shellfish"],
          medications: ["levothyroxine 50mcg daily"],
          conditions: ["hypothyroidism", "anxiety"],
          healthGoals: "Improve energy levels and manage stress naturally",
          communicationPrefs: {
            email: true,
            sms: true,
            phone: false,
            marketing: false,
            appointmentReminders: true,
            followUpReminders: true
          },
          hipaaConsent: true,
          consentDate: new Date(),
          consentVersion: "1.0",
          firstVisit: new Date("2024-01-15"),
          totalVisits: 3
        }
      }
    }
  })

  const client2 = await prisma.user.create({
    data: {
      email: "david.client@example.com",
      name: "David Thompson",
      role: "CLIENT",
      emailVerified: new Date(),
      password: clientPassword,
      phone: "+1-555-0203",
      isActive: true,
      lastLogin: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      clientProfile: {
        create: {
          dateOfBirth: new Date("1978-03-22"),
          gender: "male",
          emergencyContact: {
            name: "Lisa Thompson",
            phone: "+1-555-0204",
            relationship: "spouse"
          },
          allergies: ["latex"],
          medications: ["metformin 500mg twice daily", "lisinopril 10mg daily"],
          conditions: ["type 2 diabetes", "hypertension", "digestive issues"],
          healthGoals: "Better blood sugar control and improved digestion",
          communicationPrefs: {
            email: true,
            sms: false,
            phone: true,
            marketing: true,
            appointmentReminders: true,
            followUpReminders: false
          },
          hipaaConsent: true,
          consentDate: new Date(),
          consentVersion: "1.0",
          firstVisit: new Date("2024-02-01"),
          totalVisits: 5
        }
      }
    }
  })

  const client3 = await prisma.user.create({
    data: {
      email: "maria.client@example.com",
      name: "Maria Garcia",
      role: "CLIENT",
      emailVerified: new Date(),
      password: clientPassword,
      phone: "+1-555-0205",
      isActive: true,
      lastLogin: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      clientProfile: {
        create: {
          dateOfBirth: new Date("1992-11-08"),
          gender: "female",
          emergencyContact: {
            name: "Carmen Garcia",
            phone: "+1-555-0206",
            relationship: "mother"
          },
          allergies: [],
          medications: [],
          conditions: ["insomnia", "menstrual irregularities"],
          healthGoals: "Improve sleep quality and regulate menstrual cycle",
          communicationPrefs: {
            email: true,
            sms: true,
            phone: false,
            marketing: false,
            appointmentReminders: true,
            followUpReminders: true
          },
          hipaaConsent: true,
          consentDate: new Date(),
          consentVersion: "1.0",
          firstVisit: new Date("2024-03-10"),
          totalVisits: 2
        }
      }
    }
  })

  // Create some public users (for website access)
  const publicPassword = await hash("public123!", 12)
  
  const publicUser = await prisma.user.create({
    data: {
      email: "visitor@example.com",
      name: "Site Visitor",
      role: "PUBLIC",
      emailVerified: new Date(),
      password: publicPassword,
      isActive: true,
    }
  })

  // Create user settings for authenticated users
  const userSettingsData = [
    {
      userId: admin1.id,
      communicationPrefs: {
        email: true,
        sms: true,
        phone: true,
        marketing: false,
        appointmentReminders: true,
        followUpReminders: true
      },
      privacyPrefs: {
        shareDataForResearch: false,
        allowTestimonialUse: false,
        publicProfile: false
      },
      notificationPrefs: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: true,
        inAppNotifications: true
      },
      displayPrefs: {
        theme: "light",
        language: "en",
        timezone: "America/New_York",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h"
      }
    },
    {
      userId: herbalist1.id,
      communicationPrefs: {
        email: true,
        sms: true,
        phone: true,
        marketing: true,
        appointmentReminders: true,
        followUpReminders: true
      },
      privacyPrefs: {
        shareDataForResearch: true,
        allowTestimonialUse: true,
        publicProfile: true
      },
      notificationPrefs: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: true,
        inAppNotifications: true
      },
      displayPrefs: {
        theme: "system",
        language: "en",
        timezone: "America/Los_Angeles",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h"
      }
    },
    {
      userId: client1.id,
      communicationPrefs: {
        email: true,
        sms: true,
        phone: false,
        marketing: false,
        appointmentReminders: true,
        followUpReminders: true
      },
      privacyPrefs: {
        shareDataForResearch: false,
        allowTestimonialUse: false,
        publicProfile: false
      },
      notificationPrefs: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        inAppNotifications: true
      },
      displayPrefs: {
        theme: "light",
        language: "en",
        timezone: "America/New_York",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h"
      }
    }
  ]

  for (const settings of userSettingsData) {
    await prisma.userSettings.create({
      data: settings
    })
  }

  console.log(`   ✅ Created ${await prisma.user.count()} users`)
  console.log(`   👑 Admin: admin@herbalisthub.com (password: admin123!)`)
  console.log(`   🌿 Herbalists: sarah.herbalist@example.com, michael.herbalist@example.com (password: herbalist123!)`)
  console.log(`   👤 Clients: emily.client@example.com, david.client@example.com, maria.client@example.com (password: client123!)`)

  return {
    admin: admin1,
    herbalists: [herbalist1, herbalist2],
    clients: [client1, client2, client3],
    public: publicUser
  }
}